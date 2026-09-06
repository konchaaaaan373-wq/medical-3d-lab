import * as THREE from 'three';
import { Viewer } from './Viewer.js';
import { distanceScaleForAspect, framePose } from './framing.js';
import { loadScene } from '../catalog/index.js';
import { ORGAN_HERO_BUILDERS, createOrganLights } from './organModels.js';

/**
 * The landing hero: one organ, shown in two stages.
 *
 * **Stage 1** is the shared organ builder — a few thousand vertices, already in
 * the bundle, on screen as soon as Three.js is. **Stage 2** is the organ's real
 * anatomy model, which is a whole scene and, for the brain, a 4.5 MB atlas. The
 * second replaces the first in place once it has finished loading.
 *
 * Why in two stages rather than one: the landing page is the entry point people
 * arrive at from a link, and the honest version of "show the real model" is not
 * "make everyone wait 4.5 MB for the first frame". It is "put something true on
 * screen immediately, then quietly replace it with something truer". If the
 * upgrade never arrives — a slow connection, data saver, a failed fetch — the
 * page keeps the model it already has and says nothing about it. A hero is not
 * the place to report a network error.
 *
 * The upgrade is skipped outright on a metered or very slow connection, and it
 * never starts while the hero is off screen.
 */

/** Connections the detailed model is not worth spending. */
const SLOW_CONNECTIONS = new Set(['slow-2g', '2g']);

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
} = {}) {
  const cleanups = [];
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

  /** Stage 2: the anatomy scene, once it has arrived. */
  let detail = null;
  let detailRoot = null;
  let detailFrame = null;
  /** Set from the upgraded scene's own authored pose; null while stage 1 owns framing. */
  let scenePose = null;
  /** An upgrade asked for while the hero was off screen, waiting to be let in. */
  let pendingUpgrade = null;

  const disposeAll = () => {
    if (disposed) return;
    disposed = true;
    targetOrganId = null;
    releaseDetail();
    releaseModel();
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

  function releaseDetail() {
    if (!detail) return;
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
    if (!disposed) delete container.dataset.detail;
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
      ];
      if (!supported.includes(key)) return;
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
            void upgrade(waiting.gen, waiting.sceneId);
          }
        }, { threshold: 0.01 })
      : null;
    visibilityObserver?.observe(container);
    cleanups.push(() => visibilityObserver?.disconnect());

    /**
     * Stage 2. Load the organ's anatomy scene and put it in place of the
     * builder, or leave the builder alone and say nothing.
     */
    async function upgrade(gen, sceneId) {
      if (!sceneId || disposed || !detailAllowed()) return null;
      // Off screen, this is several megabytes fetched for a frame nobody is
      // looking at. Held until the hero comes into view, which on this page is
      // usually immediately and on a deep link into the middle of it is not.
      if (!inView) {
        pendingUpgrade = { gen, sceneId };
        return null;
      }
      pendingUpgrade = null;
      container.dataset.detail = 'loading';

      let scene = null;
      let root = null;
      try {
        const SceneClass = await loadSceneClass(sceneId);
        if (gen !== generation || disposed) return null;

        scene = new SceneClass({ viewer });
        root = scene.build();
        // Built but not shown: the builder stays on screen while the scene
        // fetches whatever it fetches, so the frame is never empty.
        root.visible = false;
        viewer.scene.add(root);
        await scene.ready;
        if (gen !== generation || disposed) throw new Error('superseded');

        releaseModel();
        viewer.scene.remove(lights);
        root.visible = true;
        detail = { scene, root, sceneId };
        detailRoot = root;
        scenePose = { cameraPose: SceneClass.cameraPose, framing: SceneClass.framing };
        allowAutoRotate = SceneClass.allowAutoRotate !== false;
        detailFrame = viewer.onFrame((dt) => scene.update(dt));
        cleanups.push(() => detailFrame?.());

        applyOpeningPose();
        container.dataset.detail = 'ready';
        renderOnce();
        syncActivity();
        return sceneId;
      } catch (error) {
        // Silent by design. The builder is still on screen and is still a real
        // organ; a hero is not the place to report a failed fetch.
        root?.parent?.remove(root);
        try {
          scene?.dispose?.();
        } catch (disposeError) {
          console.error('landing organ detail dispose', disposeError);
        }
        if (gen === generation && !disposed) {
          viewer.scene.add(lights);
          container.dataset.detail = 'unavailable';
        }
        if (String(error?.message) !== 'superseded') console.error('landing organ detail', error);
        return null;
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
        container.dataset.loading = 'true';
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
        container.dataset.ready = 'true';
        renderOnce();
        syncActivity();

        // Not awaited: stage 1 is on screen and the caller is finished.
        void upgrade(gen, upgradeSceneId);
        return organId;
      },
      get organ() {
        return builtOrganId;
      },
      get detailScene() {
        return detail?.sceneId ?? null;
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
  const box = new THREE.Box3().setFromObject(root);
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
