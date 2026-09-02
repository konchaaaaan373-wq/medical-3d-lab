import { Viewer } from './Viewer.js';
import { framePose } from './framing.js';
import { CirculationScene } from '../scenes/cardiovascular/scenes/circulation/CirculationScene.js';

/**
 * Mount the real circulation scene inside the landing workbench.
 *
 * This is deliberately a dynamic landing import: the page shell and catalogue
 * remain readable without WebGL, while capable browsers get the same geometry,
 * solver-to-visual mapping and orbit controls as the full scene.
 */
export function mountLandingCirculationViewport(container, {
  ViewerClass = Viewer,
  SceneClass = CirculationScene,
} = {}) {
  const cleanups = [];
  let disposed = false;
  let viewer = null;
  let scene = null;

  const disposeAll = () => {
    if (disposed) return;
    disposed = true;
    while (cleanups.length) {
      try {
        cleanups.pop()();
      } catch (error) {
        console.error('landing 3D cleanup', error);
      }
    }
    delete container.dataset.ready;
  };

  try {
    viewer = new ViewerClass(container, { bloom: true });
    cleanups.push(() => viewer.dispose());
    // OrbitControls defaults to `touch-action: none`. Keep horizontal drag for
    // rotation, but return vertical swipes and pinch zoom to the landing page.
    viewer.renderer.domElement.style.touchAction = 'pan-y pinch-zoom';

    scene = new SceneClass({ viewer });
    cleanups.push(() => scene.dispose());
    viewer.scene.add(scene.build());

    let userMovedCamera = false;
    let inView = typeof window.IntersectionObserver !== 'function';
    let renderingOnce = false;
    const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const allowAutoRotate = SceneClass.allowAutoRotate !== false;

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
      viewer.controls.autoRotate = animate && allowAutoRotate && !userMovedCamera;
      if (animate) viewer.start();
      else {
        viewer.stop();
        if (inView && document.visibilityState !== 'hidden') renderOnce();
      }
    };

    const applyOpeningPose = () => {
      if (disposed || userMovedCamera) return;
      const pose = framePose(
        SceneClass.cameraPose,
        viewer.camera.aspect,
        'data',
        viewer.camera.fov,
        0,
        SceneClass.framing
      );
      viewer.camera.position.copy(pose.position);
      viewer.controls.target.copy(pose.target);
      viewer.controls.update();
    };

    viewer.controls.minDistance = 7;
    viewer.controls.maxDistance = 24;
    viewer.controls.autoRotateSpeed = 0.22;
    const userStarted = () => {
      userMovedCamera = true;
      viewer.controls.autoRotate = false;
    };
    const controlsChanged = () => {
      if (!disposed && !viewer.running && inView && document.visibilityState !== 'hidden') renderOnce();
    };
    viewer.controls.addEventListener('start', userStarted);
    cleanups.push(() => viewer.controls.removeEventListener('start', userStarted));
    viewer.controls.addEventListener('change', controlsChanged);
    cleanups.push(() => viewer.controls.removeEventListener('change', controlsChanged));
    applyOpeningPose();

    const stopResize = viewer.onResize(() => {
      applyOpeningPose();
      if (!viewer.running) renderOnce();
    });
    cleanups.push(stopResize);
    const stopFrame = viewer.onFrame((dt) => {
      scene.update(dt);
    });
    cleanups.push(stopFrame);

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

    renderOnce();
    syncActivity();
    container.dataset.ready = 'true';

    return {
      setIntervention(value) {
        if (disposed) return;
        scene.setModelControl('intervention', value);
        if (!viewer.running) renderOnce();
      },
      destroy: disposeAll,
    };
  } catch (error) {
    disposeAll();
    throw error;
  }
}
