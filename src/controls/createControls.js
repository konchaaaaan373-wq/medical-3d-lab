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
  /**
   * Zoom about the pointer, not about the orbit centre.
   *
   * The orbit centre is not where the subject is, and it is not supposed to be:
   * `fitPoseToSafeArea` pans the camera and the target together so the subject
   * sits in the band the header and the panels leave, which puts the target
   * back near the middle of the canvas with the subject off to one side of it.
   * A dolly along camera→target holds the *target* still, so the subject's
   * offset from it — a fixed distance in world units — grows in pixels by
   * exactly the zoom factor. Measured on the brain atlas at 1280x800: 177px off
   * centre at the framing distance, 354px after one halving, and under the
   * header a few steps later. That is the drift a device pass reported.
   *
   * `zoomToCursor` anchors the dolly on the pointer for a wheel and on the
   * two-finger midpoint for a pinch (`_updateZoomParameters`, called from
   * `_handleMouseWheel` and `_handleTouchMoveDollyPan`), which is what a reader
   * zooming into one gyrus means by it. It moves `controls.target` as a
   * consequence of that anchor — it has to, because holding a point under the
   * pointer fixed *is* moving the orbit centre — but it never reads the model:
   * nothing here re-frames, re-centres, or recomputes a target from a bounding
   * box. Zooming out again retraces the same path.
   *
   * Independent of `enablePan`: the cursor-zoom branch adjusts the camera and
   * the target directly rather than through the pan offset, so a scene that
   * refuses panning still gets it. Zooms with no pointer behind them — the +/−
   * buttons and keys — do not come through here; `zoomBy` in `App.js` anchors
   * those on the centre of the visible band.
   */
  controls.zoomToCursor = true;
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
