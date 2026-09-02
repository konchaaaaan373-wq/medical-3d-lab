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
  viewer.controls.addEventListener('start', () => {
    userMovedCamera = true;
  });
  applyOpeningPose();

  const stopResize = viewer.onResize(() => applyOpeningPose());
  const motion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const stopFrame = viewer.onFrame((dt) => {
    if (!motion?.matches) scene.update(dt);
  });

  const syncMotion = () => {
    viewer.controls.autoRotate = !motion?.matches && !userMovedCamera;
  };
  motion?.addEventListener?.('change', syncMotion);
  syncMotion();

  viewer.start();
  container.dataset.ready = 'true';

  return {
    setIntervention(value) {
      scene.setModelControl('intervention', value);
    },
    destroy() {
      stopFrame();
      stopResize();
      motion?.removeEventListener?.('change', syncMotion);
      scene.dispose();
      viewer.dispose();
      delete container.dataset.ready;
    },
  };
}
