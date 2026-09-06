import * as THREE from 'three';
import { Viewer } from './Viewer.js';
import { distanceScaleForAspect } from './framing.js';
import { ORGAN_HERO_BUILDERS, createOrganLights } from './organModels.js';

/**
 * Mount one organ model, full size, in the landing hero.
 *
 * This is the same viewer, the same lighting rig and the same organ builders a
 * scene uses — there is no mock-up on the landing page. What it is *not* is a
 * scene: no model layer, no controls, no read-out. An organ hero shows a shape,
 * and the shape is the whole claim.
 *
 * The organ can be swapped without rebuilding the renderer, because the hero
 * rotates and a visitor can pick one; each build carries a generation number so
 * that two quick swaps cannot leave the loser attached.
 */
export function mountLandingOrganViewport(container, {
  ViewerClass = Viewer,
  builders = ORGAN_HERO_BUILDERS,
} = {}) {
  const cleanups = [];
  let disposed = false;
  let viewer = null;
  let lights = null;

  /** The group the current organ hangs from; framing works on this. */
  let holder = null;
  let built = null;
  let builtOrganId = null;
  /** What the newest `setOrgan` call is heading to, which may not be built yet. */
  let targetOrganId = null;
  let radius = 1;
  /** Half-extents of the built organ, in camera axes, after its opening turn. */
  let extent = new THREE.Vector3(1, 1, 1);
  let generation = 0;

  const disposeAll = () => {
    if (disposed) return;
    disposed = true;
    targetOrganId = null;
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

  try {
    // Bloom is for emissive things — particles, a pressure field. An organ is
    // lit tissue and has none, so the pass is pure fill rate here.
    viewer = new ViewerClass(container, { bloom: false });
    cleanups.push(() => viewer.dispose());
    // OrbitControls defaults to `touch-action: none`. Keep horizontal drag for
    // rotation, but return vertical swipes and pinch zoom to the landing page.
    viewer.renderer.domElement.style.touchAction = 'pan-y pinch-zoom';

    // The same rig the Explorer previews use, at two thirds: the Viewer already
    // contributes a studio environment map, and at full strength the organ's
    // lit side clipped to white — which hides exactly the surface detail the
    // hero exists to show.
    lights = createOrganLights(THREE, { intensity: 0.66 });
    viewer.scene.add(lights);
    cleanups.push(() => {
      viewer.scene.remove(lights);
      disposeTree(lights);
    });

    let userMovedCamera = false;
    let inView = typeof window.IntersectionObserver !== 'function';
    let renderingOnce = false;
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
      viewer.controls.autoRotate = animate && !userMovedCamera && Boolean(holder);
      if (animate) viewer.start();
      else {
        viewer.stop();
        if (inView && document.visibilityState !== 'hidden') renderOnce();
      }
    };

    /**
     * Put the camera where the whole organ fits, whatever its size.
     *
     * The organs are modelled at their own scales — a kidney pair is not a
     * brain — so the hero frames from the built bounding sphere rather than
     * from a pose written per organ, which would be five numbers to retune
     * every time a builder changes.
     */
    const applyOpeningPose = () => {
      if (disposed || !holder || userMovedCamera) return;
      // Fit the *box*, not the bounding sphere.
      //
      // A sphere fit is the safe framing for a subject that will be spun
      // through any orientation, and it is far too loose here: an organ with
      // something hanging off it — a brainstem, a trachea, a ureter — has a
      // bounding sphere much larger than the part a reader is looking at, and
      // the hero opened with the brain a third of the frame tall.
      //
      // The box is measured *after* the opening rotation, so these are the
      // extents as the camera sees them. Half the depth is added because the
      // near face of the organ sits that much closer than its centre.
      const halfHeightFov = THREE.MathUtils.degToRad(viewer.camera.fov * 0.5);
      const vertical = Math.tan(halfHeightFov);
      const horizontal = vertical * Math.max(0.35, viewer.camera.aspect);
      const distance =
        Math.max(extent.y / vertical, extent.x / horizontal) + extent.z * 0.5;
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
        }, { threshold: 0.01 })
      : null;
    visibilityObserver?.observe(container);
    cleanups.push(() => visibilityObserver?.disconnect());

    return {
      /**
       * Build one organ and frame it. Safe to call again with another organ.
       *
       * @param {string} organId
       */
      async setOrgan(organId) {
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
        return organId;
      },
      get organ() {
        return builtOrganId;
      },
      destroy: disposeAll,
    };
  } catch (error) {
    disposeAll();
    throw error;
  }
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
