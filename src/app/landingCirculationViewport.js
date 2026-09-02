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
export function mountLandingCirculationViewport(container) {
  const viewer = new Viewer(container, { bloom: true });
  const scene = new CirculationScene({ viewer });
  viewer.scene.add(scene.build());

  let userMovedCamera = false;
  let inView = typeof window.IntersectionObserver !== 'function';
  let renderingOnce = false;
  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  const renderOnce = () => {
    if (renderingOnce) return;
    renderingOnce = true;
    try {
      viewer.controls.update();
      viewer.composer.render();
    } finally {
      renderingOnce = false;
    }
  };

  const shouldAnimate = () =>
    inView && document.visibilityState !== 'hidden' && !motion?.matches;

  const syncActivity = () => {
    const animate = shouldAnimate();
    viewer.controls.autoRotate = animate && !userMovedCamera;
    if (animate) viewer.start();
    else {
      viewer.stop();
      if (inView && document.visibilityState !== 'hidden') renderOnce();
    }
  };

  const applyOpeningPose = () => {
    if (userMovedCamera) return;
    const pose = framePose(
      CirculationScene.cameraPose,
      viewer.camera.aspect,
      'data',
      viewer.camera.fov,
      0,
      CirculationScene.framing
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
    if (!viewer.running && inView && document.visibilityState !== 'hidden') renderOnce();
  };
  viewer.controls.addEventListener('start', userStarted);
  viewer.controls.addEventListener('change', controlsChanged);
  applyOpeningPose();

  const stopResize = viewer.onResize(() => {
    applyOpeningPose();
    if (!viewer.running) renderOnce();
  });
  const stopFrame = viewer.onFrame((dt) => {
    scene.update(dt);
  });

  const visibilityChanged = () => syncActivity();
  document.addEventListener('visibilitychange', visibilityChanged);
  motion?.addEventListener?.('change', syncActivity);

  const Observer = window.IntersectionObserver;
  const visibilityObserver = Observer
    ? new Observer(([entry]) => {
        inView = Boolean(entry?.isIntersecting);
        syncActivity();
      }, { threshold: 0.01 })
    : null;
  visibilityObserver?.observe(container);

  renderOnce();
  syncActivity();
  container.dataset.ready = 'true';

  return {
    setIntervention(value) {
      scene.setModelControl('intervention', value);
      if (!viewer.running) renderOnce();
    },
    destroy() {
      stopFrame();
      stopResize();
      visibilityObserver?.disconnect();
      document.removeEventListener('visibilitychange', visibilityChanged);
      motion?.removeEventListener?.('change', syncActivity);
      viewer.controls.removeEventListener('start', userStarted);
      viewer.controls.removeEventListener('change', controlsChanged);
      scene.dispose();
      viewer.dispose();
      delete container.dataset.ready;
    },
  };
}
