import * as THREE from 'three';
import { Viewer } from './Viewer.js';
import { distanceScaleForAspect, framePose } from './framing.js';
import { loadScene } from '../catalog/index.js';
import { ORGAN_HERO_BUILDERS, createOrganLights } from './organModels.js';

/**
 * The landing hero loads the published scene without presenting the lightweight
 * builder as if it were the published model.
 *
 * The builder remains available to existing consumers and for framing tests,
 * but is hidden whenever a published scene is requested. The frame then shows a
 * bounded loading/deferred/error state until that scene is ready and one real
 * frame has been rendered.
 */

/** Connections the detailed model is not worth spending. */
const SLOW_CONNECTIONS = new Set(['slow-2g', '2g']);
export const DETAIL_DELAY_MS = 8_000;
export const DETAIL_TIMEOUT_MS = 30_000;

/**
 * Whether this visitor should be sent the detailed model at all.
 *
 * Deliberately conservative and deliberately silent: a visitor who does not get
 * it sees the builder, which is a real organ, not a placeholder.
 */
export function shouldLoadDetail(connection = globalThis.navigator?.connection) {
  if (!connection) return true;
  if (connection.saveData === true) return false;
  return !SLOW_CONNECTIONS.has(connection.effectiveType);
}

export function mountLandingOrganViewport(container, {
  ViewerClass = Viewer,
  builders = ORGAN_HERO_BUILDERS,
  loadSceneClass = loadScene,
  detailAllowed = shouldLoadDetail,
  onStateChange = () => {},
  onDetailError = () => {},
  onStructureChange = () => {},
  detailDelayMs = DETAIL_DELAY_MS,
  detailTimeoutMs = DETAIL_TIMEOUT_MS,
} = {}) {
  const cleanups = [];
  const attemptTimers = new Set();
  let disposed = false;
  let viewer = null;
  let lights = null;

  /** Stage 1: the group the builder's organ hangs from. */
  let holder = null;
  let built = null;
  let builtOrganId = null;
  /** What the newest `setOrgan` call is heading to, which may not be built yet. */
  let targetOrganId = null;
  let extent = new THREE.Vector3(1, 1, 1);
  let radius = 1;
  let generation = 0;
  let lifecycle = 'idle';
  let targetSceneId = null;

  /** Stage 2: the anatomy scene, once it has arrived. */
  let detail = null;
  let detailRoot = null;
  let detailFrame = null;
  /** Set from the upgraded scene's own authored pose; null while stage 1 owns framing. */
  let scenePose = null;
  /** An upgrade asked for while the hero was off screen, waiting to be let in. */
  let pendingUpgrade = null;
  /**
   * Stage 2 while it is still fetching, before it has anything to show.
   *
   * Held separately from `detail` so it can be disposed at all: a scene that
   * has not finished loading is not yet the detail, and without this the only
   * reference to it lived inside `upgrade`'s own call. That is how an
   * abandoned atlas fetch got reported as a failure — nothing could tell the
   * scene it had been abandoned.
   */
  let loadingDetail = null;

  /**
   * The named part the reader is pointing at.
   *
   * Held here rather than read back out of the scene on demand, because the
   * rule the surfaces share is about *two* pointers: a pinned selection and a
   * hover preview, with the pin winning. Keeping both and resolving them in one
   * place is what stops a pointer crossing the model from rewriting the name
   * the reader deliberately clicked — the same rule `AnatomyInfoPanel` states.
   */
  let pinnedStructure = null;
  let hoveredStructure = null;
  /** Unsubscribes from the anatomy surface of the scene now on screen. */
  let structureBindings = [];
  /** Assigned once the viewer exists; a no-op before that and after disposal. */
  let emitStructure = () => {};

  /** What the surfaces are told, pin first. One shape, written once. */
  const currentStructure = () => {
    const structure = pinnedStructure ?? hoveredStructure;
    return structure ? { ...structure, pinned: Boolean(pinnedStructure) } : null;
  };

  const setLifecycle = (state, detail = {}) => {
    if (disposed && state !== 'disposed') return;
    lifecycle = state;
    if (state === 'disposed') {
      delete container.dataset.detail;
      delete container.dataset.lifecycle;
    } else {
      container.dataset.lifecycle = state;
      container.dataset.detail = state;
    }
    onStateChange(state, detail);
  };

  const disposeAll = () => {
    if (disposed) return;
    disposed = true;
    generation += 1;
    targetOrganId = null;
    targetSceneId = null;
    releaseLoadingDetail();
    // `releaseDetail` lets the structures go: they are only ever bound to a
    // detail scene, so there is no path where they outlive one.
    releaseDetail();
    releaseModel();
    for (const timer of attemptTimers) clearTimeout(timer);
    attemptTimers.clear();
    while (cleanups.length) {
      try {
        cleanups.pop()();
      } catch (error) {
        console.error('landing organ cleanup', error);
      }
    }
    delete container.dataset.ready;
    delete container.dataset.organ;
    delete container.dataset.detail;
    delete container.dataset.lifecycle;
    lifecycle = 'disposed';
    onStateChange('disposed', {});
  };

  function releaseModel() {
    if (!holder) return;
    built?.dispose?.();
    disposeTree(holder);
    holder.parent?.remove(holder);
    holder = null;
    built = null;
    builtOrganId = null;
  }

  function releaseLoadingDetail() {
    if (!loadingDetail) return;
    const pending = loadingDetail;
    loadingDetail = null;
    try {
      pending.dispose?.();
    } catch (error) {
      console.error('landing organ detail dispose', error);
    }
  }

  /**
   * Let go of the scene's anatomy surface.
   *
   * `notify` is off only where the caller is about to report something else
   * about the same change; everywhere else the reader's name card has to be
   * told that the structure it is naming is no longer on screen.
   */
  function releaseStructures({ notify = true } = {}) {
    const had = Boolean(pinnedStructure || hoveredStructure);
    for (const off of structureBindings) {
      try {
        off();
      } catch (error) {
        console.error('landing organ structure unsubscribe', error);
      }
    }
    structureBindings = [];
    pinnedStructure = null;
    hoveredStructure = null;
    if (!notify || !had) return;
    try {
      onStructureChange(null);
    } catch (error) {
      console.error('landing organ structure', error);
    }
  }

  function releaseDetail() {
    if (!detail) return;
    releaseStructures();
    detailFrame?.();
    detailFrame = null;
    try {
      detail.scene.dispose?.();
    } catch (error) {
      console.error('landing organ detail dispose', error);
    }
    detail.root?.parent?.remove(detail.root);
    detail = null;
    detailRoot = null;
    scenePose = null;
    if (!disposed && lifecycle === 'ready') setLifecycle('idle');
  }

  try {
    // Bloom is for emissive things — particles, a pressure field. An organ is
    // lit tissue and has none, so the pass is pure fill rate here.
    viewer = new ViewerClass(container, { bloom: false });
    cleanups.push(() => viewer.dispose());
    // OrbitControls defaults to `touch-action: none`. Keep horizontal drag for
    // rotation, but return vertical swipes and pinch zoom to the landing page.
    viewer.renderer.domElement.style.touchAction = 'pan-y pinch-zoom';
    // The viewer's backdrop is a finite plate, sized for a scene that fills the
    // window. In the hero's short, wide frame its edge lands inside the picture,
    // and an upgraded scene's brighter rig lights it enough to read as a hard
    // octagon behind the organ. The hero's own stage supplies the ground.
    if (viewer.backdrop) viewer.backdrop.visible = false;

    // The same rig the Explorer previews use, at two thirds: the Viewer already
    // contributes a studio environment map, and at full strength the organ's
    // lit side clipped to white — which hides exactly the surface detail the
    // hero exists to show. An upgraded scene brings its own rig, so this one
    // comes off when stage 2 arrives.
    lights = createOrganLights(THREE, { intensity: 0.66 });
    viewer.scene.add(lights);
    cleanups.push(() => {
      viewer.scene.remove(lights);
      disposeTree(lights);
    });

    let userMovedCamera = false;
    let inView = typeof window.IntersectionObserver !== 'function';
    let renderingOnce = false;
    let allowAutoRotate = true;
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    const renderOnce = () => {
      if (disposed || renderingOnce) return;
      renderingOnce = true;
      try {
        viewer.controls.update();
        viewer.composer.render();
      } finally {
        renderingOnce = false;
      }
    };

    const shouldAnimate = () =>
      !disposed && inView && document.visibilityState !== 'hidden' && !motion?.matches;

    const syncActivity = () => {
      if (disposed) return;
      const animate = shouldAnimate();
      viewer.controls.autoRotate =
        animate && allowAutoRotate && !userMovedCamera && Boolean(holder || detail);
      // A scene that opted out of auto-rotation still has to be stepped, because
      // its own animation is what it is for.
      if (animate && (viewer.controls.autoRotate || detail)) viewer.start();
      else {
        viewer.stop();
        if (inView && document.visibilityState !== 'hidden') renderOnce();
      }
    };

    /**
     * Report the named part under the reader's pointer.
     *
     * A pinned selection wins over a hover: the hover is a preview, and it
     * previews only while nothing is pinned.
     *
     * The render is not incidental. An anatomy scene opts out of auto-rotation,
     * and a reader who asked for reduced motion stops the loop entirely — so in
     * the frame where naming a structure matters most, nothing is drawing. The
     * highlight the scene just put on the mesh would sit in a buffer nobody
     * presents, and the name would appear beside an unchanged picture.
     */
    emitStructure = () => {
      if (disposed) return;
      if (!viewer.running && inView && document.visibilityState !== 'hidden') renderOnce();
      try {
        onStructureChange(currentStructure());
      } catch (error) {
        console.error('landing organ structure', error);
      }
    };

    /**
     * Subscribe to one scene's anatomy surface, if it has one.
     *
     * Optional on purpose: the hero frames whatever the release opens, and a
     * scene that cannot name its parts is not broken — it simply has no names
     * to offer, and says so by not implementing the surface. The caller learns
     * which it got from the return value, because "no structure selected" and
     * "this model has no selectable structures" are different things to a
     * reader and must not be shown as the same one.
     *
     * @returns {boolean} whether the scene offers selectable named structures
     */
    function bindStructures(scene) {
      releaseStructures({ notify: false });
      if (typeof scene?.onAnatomySelection !== 'function') return false;

      const bind = (subscribe, apply) => {
        if (typeof subscribe !== 'function') return;
        const off = subscribe.call(scene, (info) => {
          apply(info ?? null);
          emitStructure();
        });
        if (typeof off === 'function') structureBindings.push(off);
      };
      bind(scene.onAnatomySelection, (info) => { pinnedStructure = info; });
      bind(scene.onAnatomyHover, (info) => { hoveredStructure = info; });
      // Whatever the scene already had pinned before this hooked up — a scene
      // may open on a structure of its own choosing.
      pinnedStructure = scene.getAnatomySelection?.() ?? null;
      hoveredStructure = scene.getAnatomyHover?.() ?? null;
      if (pinnedStructure || hoveredStructure) emitStructure();
      return true;
    }

    /**
     * Put the camera where the subject fits.
     *
     * Stage 2 has an authored pose — the anatomical view its scene decided a
     * reader should open on — and that wins outright: framing an atlas by its
     * bounding box would throw away the one thing the scene knows and this
     * module does not.
     *
     * Stage 1 is framed from the built box rather than the bounding sphere. A
     * sphere fit is the safe framing for a subject that will be spun through
     * any orientation, and it is far too loose here: an organ with something
     * hanging off it — a brainstem, a trachea, a ureter — has a bounding sphere
     * much larger than the part a reader is looking at, and the hero opened
     * with the brain a third of the frame tall.
     */
    const applyOpeningPose = () => {
      if (disposed || userMovedCamera) return;

      if (scenePose) {
        const pose = framePose(
          scenePose.cameraPose,
          viewer.camera.aspect,
          'data',
          viewer.camera.fov,
          0,
          scenePose.framing
        );
        const target = pose.target.clone();
        const direction = pose.position.clone().sub(target);
        const authored = direction.length();
        direction.normalize();

        // The authored pose is the scene's anatomical decision — which side of
        // the organ a reader opens on — and it is kept. What is not kept is its
        // *distance*: it was chosen for a viewport that fills a window, and the
        // hero's frame is short and wide, so a heart authored to fill a screen
        // ran off the top and bottom of it.
        //
        // Only ever further away, never closer. Pulling in past what the scene
        // asked for would be this module second-guessing the one thing the
        // scene knows better than it does.
        const fitted = fitDistance(detailRoot, target, direction, viewer.camera);
        const distance = Math.max(authored, fitted ?? 0);

        viewer.controls.target.copy(target);
        viewer.camera.position.copy(direction).multiplyScalar(distance).add(target);
        viewer.controls.minDistance = distance * 0.45;
        viewer.controls.maxDistance = distance * 2.4;
        viewer.camera.near = Math.max(0.01, distance / 200);
        viewer.camera.far = distance * 12;
        viewer.camera.updateProjectionMatrix();
        viewer.controls.update();
        return;
      }

      if (!holder) return;
      // The box is measured *after* the opening rotation, so these are the
      // extents as the camera sees them. Half the depth is added because the
      // near face of the organ sits that much closer than its centre.
      const halfHeightFov = THREE.MathUtils.degToRad(viewer.camera.fov * 0.5);
      const vertical = Math.tan(halfHeightFov);
      const horizontal = vertical * Math.max(0.35, viewer.camera.aspect);
      const distance = Math.max(extent.y / vertical, extent.x / horizontal) + extent.z * 0.5;
      const framed = distance * 1.1 * distanceScaleForAspect(viewer.camera.aspect);
      viewer.controls.target.set(0, 0, 0);
      viewer.camera.position.set(framed * 0.16, framed * 0.1, framed * 0.98);
      viewer.controls.minDistance = framed * 0.45;
      viewer.controls.maxDistance = framed * 2.4;
      viewer.camera.near = Math.max(0.01, framed / 200);
      viewer.camera.far = framed * 12 + radius * 4;
      viewer.camera.updateProjectionMatrix();
      viewer.controls.update();
    };

    viewer.controls.autoRotateSpeed = 0.5;
    const userStarted = () => {
      userMovedCamera = true;
      viewer.controls.autoRotate = false;
    };
    const controlsChanged = () => {
      if (!disposed && !viewer.running && inView && document.visibilityState !== 'hidden') renderOnce();
    };
    const keyboardMoved = (event) => {
      const key = event.key;
      const supported = [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        '+',
        '=',
        '-',
        '_',
        'Home',
        'Enter',
        'Escape',
      ];
      if (!supported.includes(key)) return;

      // Naming a structure without a pointer. The arrows turn the model; this
      // is how the reader then asks what is in front of them, so the question
      // is asked of the middle of the frame — the one place a keyboard user can
      // aim at, and the place the focused viewport marks.
      //
      // Deliberately not a camera move: `userMovedCamera` is left alone, so
      // asking what this is does not quietly give up the opening pose.
      //
      // The default is only prevented once there is a model to ask. A page with
      // no named structures has no business swallowing Escape.
      if (key === 'Enter' || key === 'Escape') {
        const canvas = viewer.renderer?.domElement;
        if (!detail?.scene || !canvas) return;
        event.preventDefault();
        if (key === 'Escape') detail.scene.clearSelection?.();
        else {
          const rect = canvas.getBoundingClientRect();
          detail.scene.selectAtCanvasPoint?.(rect.width / 2, rect.height / 2);
        }
        renderOnce();
        return;
      }

      event.preventDefault();
      viewer.controls.autoRotate = false;

      if (key === 'Home') {
        userMovedCamera = false;
        applyOpeningPose();
        renderOnce();
        syncActivity();
        return;
      }

      userMovedCamera = true;
      const target = viewer.controls.target;
      const offset = viewer.camera.position.clone().sub(target);
      const rotationStep = Math.PI / 18;

      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        offset.applyAxisAngle(viewer.camera.up, key === 'ArrowLeft' ? rotationStep : -rotationStep);
      } else if (key === 'ArrowUp' || key === 'ArrowDown') {
        const right = offset.clone().cross(viewer.camera.up).normalize();
        offset.applyAxisAngle(right, key === 'ArrowUp' ? -rotationStep : rotationStep);
      } else {
        const zoomIn = key === '+' || key === '=';
        const nextDistance = Math.min(
          viewer.controls.maxDistance,
          Math.max(viewer.controls.minDistance, offset.length() * (zoomIn ? 0.88 : 1.14))
        );
        offset.setLength(nextDistance);
      }

      viewer.camera.position.copy(target).add(offset);
      viewer.controls.update();
      renderOnce();
    };
    viewer.controls.addEventListener('start', userStarted);
    cleanups.push(() => viewer.controls.removeEventListener('start', userStarted));
    viewer.controls.addEventListener('change', controlsChanged);
    cleanups.push(() => viewer.controls.removeEventListener('change', controlsChanged));
    container.addEventListener('keydown', keyboardMoved);
    cleanups.push(() => container.removeEventListener('keydown', keyboardMoved));

    const stopResize = viewer.onResize(() => {
      applyOpeningPose();
      if (!viewer.running) renderOnce();
    });
    cleanups.push(stopResize);

    const visibilityChanged = () => syncActivity();
    document.addEventListener('visibilitychange', visibilityChanged);
    cleanups.push(() => document.removeEventListener('visibilitychange', visibilityChanged));

    // Leaving the page cancels whatever the hero had in flight, and the detail
    // scene decides whether a failed fetch is worth reporting by asking
    // whether it was disposed. Nothing told it, so a reader who clicked away
    // during the upgrade got the abort reported as a load failure — on the
    // page they had just arrived at, since the rejection lands as the old
    // document goes. Ending the hero here is what makes the cancellation
    // legible as an ending.
    //
    // `persisted` means the page is going into the back/forward cache and will
    // be resumed exactly as it is, so it has to survive that untouched.
    const pageHidden = (event) => {
      if (!event.persisted) disposeAll();
    };
    window.addEventListener('pagehide', pageHidden);
    cleanups.push(() => window.removeEventListener('pagehide', pageHidden));
    motion?.addEventListener?.('change', syncActivity);
    cleanups.push(() => motion?.removeEventListener?.('change', syncActivity));

    const Observer = window.IntersectionObserver;
    const visibilityObserver = Observer
      ? new Observer(([entry]) => {
          inView = Boolean(entry?.isIntersecting);
          syncActivity();
          if (inView && pendingUpgrade && pendingUpgrade.gen === generation) {
            const waiting = pendingUpgrade;
            pendingUpgrade = null;
            void upgrade(waiting.gen, waiting.sceneId, { force: waiting.force });
          }
        }, { threshold: 0.01 })
      : null;
    visibilityObserver?.observe(container);
    cleanups.push(() => visibilityObserver?.disconnect());

    /**
     * Load one published anatomy scene. Each call belongs to a generation; a
     * late result may clean up its own scene but cannot alter the current UI.
     */
    async function upgrade(gen, sceneId, { force = false } = {}) {
      if (disposed) return null;
      if (!sceneId) {
        if (gen === generation) setLifecycle('unavailable');
        return null;
      }
      if (!force && !detailAllowed()) {
        if (gen === generation) setLifecycle('deferred');
        return null;
      }
      // Off screen, this is several megabytes fetched for a frame nobody is
      // looking at. Held until the hero comes into view, which on this page is
      // usually immediately and on a deep link into the middle of it is not.
      if (!inView) {
        pendingUpgrade = { gen, sceneId, force };
        if (gen === generation) setLifecycle('idle');
        return null;
      }
      pendingUpgrade = null;
      setLifecycle('loading');

      let scene = null;
      let root = null;
      let delayTimer = null;
      let timeoutTimer = null;
      try {
        const timeout = new Promise((_, reject) => {
          timeoutTimer = setTimeout(() => {
            const error = new Error(`3D model load timed out after ${detailTimeoutMs}ms`);
            error.code = 'LANDING_DETAIL_TIMEOUT';
            reject(error);
          }, detailTimeoutMs);
          attemptTimers.add(timeoutTimer);
        });
        delayTimer = setTimeout(() => {
          if (gen === generation && !disposed && lifecycle === 'loading') {
            setLifecycle('loading', { delayed: true });
          }
        }, detailDelayMs);
        attemptTimers.add(delayTimer);
        const SceneClass = await Promise.race([loadSceneClass(sceneId), timeout]);
        if (gen !== generation || disposed) return null;

        scene = new SceneClass({ viewer });
        loadingDetail = scene;
        root = scene.build();
        // Built but not shown: the builder stays on screen while the scene
        // fetches whatever it fetches, so the frame is never empty.
        root.visible = false;
        viewer.scene.add(root);
        await Promise.race([Promise.resolve(scene.ready), timeout]);
        if (gen !== generation || disposed) throw new Error('superseded');
        // Some scene loaders resolve their ready promise after recording a
        // handled transport/decode failure in `status`. Respect that existing
        // contract: a settled promise with an explicit scene error is not a
        // drawable published model.
        if (scene.status?.state === 'error') {
          throw scene.status.error ?? new Error('3D model failed to load: ' + sceneId);
        }

        releaseModel();
        viewer.scene.remove(lights);
        root.visible = true;
        loadingDetail = null;
        detail = { scene, root, sceneId };
        detailRoot = root;
        scenePose = { cameraPose: SceneClass.cameraPose, framing: SceneClass.framing };
        allowAutoRotate = SceneClass.allowAutoRotate !== false;
        detailFrame = viewer.onFrame((dt) => scene.update(dt));
        cleanups.push(() => detailFrame?.());
        // Its own try: a scene that cannot report its names is a scene without
        // names, not a failed model. Letting this throw here would land in the
        // catch below with `detail` and the frame hook already installed, which
        // unwinds neither — a disposed scene stepped on every frame behind an
        // error message.
        let named = false;
        try {
          named = bindStructures(scene);
        } catch (error) {
          console.error('landing organ structure bind', error);
          releaseStructures({ notify: false });
        }

        applyOpeningPose();
        renderOnce();
        container.dataset.ready = 'true';
        setLifecycle('ready', { named });
        syncActivity();
        return sceneId;
      } catch (error) {
        root?.parent?.remove(root);
        if (loadingDetail === scene) loadingDetail = null;
        try {
          scene?.dispose?.();
        } catch (disposeError) {
          console.error('landing organ detail dispose', disposeError);
        }
        if (gen === generation && !disposed) {
          viewer.scene.add(lights);
          delete container.dataset.ready;
          setLifecycle('error', { error });
          try {
            onDetailError(error);
          } catch {
            /* reporting must not turn a handled model failure into rejection */
          }
        }
        if (String(error?.message) !== 'superseded') {
          if (gen === generation && !disposed) console.error('landing organ detail', error);
          else console.info('landing organ detail ignored after lifecycle end', {
            sceneId,
            reason: disposed ? 'disposed' : 'superseded',
            error: error?.message ?? String(error),
          });
        }
        return null;
      } finally {
        if (delayTimer !== null) {
          clearTimeout(delayTimer);
          attemptTimers.delete(delayTimer);
        }
        if (timeoutTimer !== null) {
          clearTimeout(timeoutTimer);
          attemptTimers.delete(timeoutTimer);
        }
      }
    }

    return {
      /**
       * Build one organ and frame it, then upgrade it in the background.
       *
       * @param {string} organId
       * @param {{upgradeSceneId?: string|null}} [options]
       */
      async setOrgan(organId, { upgradeSceneId = null } = {}) {
        const build = builders[organId];
        if (disposed || !build) return null;
        // Against the organ being *headed to*, not the one on screen: while a
        // build is in flight the two differ, and comparing with the built one
        // let a second click short-circuit and leave the frame showing the
        // organ the buttons said had been replaced.
        if (organId === (targetOrganId ?? builtOrganId)) return organId;

        const gen = ++generation;
        targetOrganId = organId;
        targetSceneId = upgradeSceneId;
        container.dataset.loading = 'true';
        delete container.dataset.ready;
        let result = null;
        try {
          result = await build(THREE);
        } catch (error) {
          if (gen === generation && !disposed) {
            targetOrganId = builtOrganId;
            container.dataset.loading = 'false';
          }
          throw error;
        }
        if (gen !== generation || disposed) {
          // A later swap already won. Throw this one away rather than letting
          // two organs share the frame.
          result?.dispose?.();
          disposeTree(result?.object);
          return null;
        }

        releaseDetail();
        pendingUpgrade = null;
        if (!lights.parent) viewer.scene.add(lights);
        allowAutoRotate = true;
        releaseModel();
        holder = new THREE.Group();
        holder.name = `${organId}-hero`;
        holder.add(result.object);
        // A lightweight builder is not evidence that the published model
        // loaded. Keep it available for non-upgraded consumers, but do not show
        // it behind the public scene's loading or failure message.
        holder.visible = !upgradeSceneId;
        built = result;
        builtOrganId = organId;
        // A three-quarter view: the front of the organ, turned enough that the
        // silhouette reads as a volume rather than a flat card. Set before the
        // box is measured, so the framing below uses the extents the camera
        // will actually see.
        holder.rotation.set(-0.05, -0.55, 0.02);
        holder.updateWorldMatrix(true, true);

        const box = new THREE.Box3().setFromObject(holder);
        const size = box.getSize(new THREE.Vector3());
        if (!Number.isFinite(size.length()) || size.length() <= 0) {
          releaseModel();
          targetOrganId = null;
          container.dataset.loading = 'false';
          throw new Error(`empty organ hero: ${organId}`);
        }
        holder.position.sub(box.getCenter(new THREE.Vector3()));
        extent = size.multiplyScalar(0.5);
        radius = extent.length();
        viewer.scene.add(holder);

        applyOpeningPose();
        container.dataset.loading = 'false';
        container.dataset.organ = organId;
        renderOnce();
        syncActivity();

        if (upgradeSceneId) {
          // Not awaited: the shell is interactive while the bounded scene
          // attempt owns its loading state.
          void upgrade(gen, upgradeSceneId);
        } else {
          container.dataset.ready = 'true';
          setLifecycle('ready', { named: false });
        }
        return organId;
      },
      retryDetail() {
        if (disposed || !targetOrganId || !targetSceneId || lifecycle === 'loading') return null;
        const gen = ++generation;
        releaseLoadingDetail();
        releaseDetail();
        delete container.dataset.ready;
        return upgrade(gen, targetSceneId, { force: true });
      },
      get organ() {
        return targetOrganId;
      },
      get detailScene() {
        return detail?.sceneId ?? null;
      },
      /** The named part the reader is pointing at, pin first. */
      get structure() {
        return currentStructure();
      },
      get state() {
        return lifecycle;
      },
      destroy: disposeAll,
    };
  } catch (error) {
    disposeAll();
    throw error;
  }
}


/**
 * How far back the camera has to sit for `root` to fit the current frame,
 * looking along `direction` at `target`.
 *
 * Measured in the camera's own axes rather than from a bounding sphere: a
 * sphere is the safe fit for a subject that will be spun through any
 * orientation and far too loose for one seen from a fixed authored angle.
 *
 * @param {any} root
 * @param {any} target
 * @param {any} direction unit vector from target towards the camera
 * @param {any} camera
 */
function fitDistance(root, target, direction, camera) {
  if (!root) return null;
  // The anatomy scene keeps non-anatomical atlas meshes hidden. Including those
  // hidden meshes in the fit makes the visible brain occupy only a small part
  // of the hero, so frame only geometry that can actually be drawn.
  const box = new THREE.Box3();
  root.updateWorldMatrix(true, true);
  root.traverseVisible((object) => {
    if (object.isMesh) box.expandByObject(object, true);
  });
  if (box.isEmpty()) return null;

  const back = direction.clone().normalize();
  const worldUp = Math.abs(back.y) > 0.95 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(worldUp, back).normalize();
  const up = new THREE.Vector3().crossVectors(back, right).normalize();

  let halfWidth = 0;
  let halfHeight = 0;
  let halfDepth = 0;
  const corner = new THREE.Vector3();
  for (let index = 0; index < 8; index += 1) {
    corner.set(
      index & 1 ? box.max.x : box.min.x,
      index & 2 ? box.max.y : box.min.y,
      index & 4 ? box.max.z : box.min.z
    ).sub(target);
    halfWidth = Math.max(halfWidth, Math.abs(corner.dot(right)));
    halfHeight = Math.max(halfHeight, Math.abs(corner.dot(up)));
    halfDepth = Math.max(halfDepth, Math.abs(corner.dot(back)));
  }

  const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5));
  const horizontal = vertical * Math.max(0.35, camera.aspect);
  return Math.max(halfHeight / vertical, halfWidth / horizontal) * 1.08 + halfDepth;
}

function disposeTree(root) {
  root?.traverse?.((object) => {
    object.geometry?.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials.filter(Boolean)) {
      for (const value of Object.values(material)) value?.isTexture && value.dispose();
      material.dispose?.();
    }
  });
}
