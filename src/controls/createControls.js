import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { prefersReducedMotion } from '../utils/motion.js';

/**
 * Orbit controls tuned for "look at one object" educational scenes:
 * damped, distance-limited, and slowly auto-rotating until the user takes over.
 */
export function createControls(camera, domElement, { target, minDistance = 5, maxDistance = 55 } = {}) {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.7;
  controls.enablePan = false; // panning mostly gets people lost in a single-subject scene
  controls.minDistance = minDistance;
  controls.maxDistance = maxDistance;
  // Keep the camera out of the poles so the scene never reads as "upside down".
  controls.minPolarAngle = Math.PI * 0.16;
  controls.maxPolarAngle = Math.PI * 0.86;
  // The idle drift says nothing the still frame does not, so it is the first
  // thing to go for a viewer who has asked for reduced motion.
  controls.autoRotate = !prefersReducedMotion();
  controls.autoRotateSpeed = 0.35;
  if (target) controls.target.copy(target);

  // A gentle drift is nice for capture, but it must never fight the user.
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
  });

  controls.update();
  return controls;
}
