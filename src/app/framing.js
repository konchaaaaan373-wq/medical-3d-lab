/**
 * Camera framing helpers shared by the interactive app and the reel sequence.
 */

/**
 * How much further back the camera has to sit for a given aspect ratio.
 * Narrow frames show far less horizontally, so they need more distance.
 */
export function distanceScaleForAspect(aspect) {
  return aspect < 0.85 ? 1.28 : aspect < 1.25 ? 1.12 : 1;
}

/**
 * Scales a scene's authored framing to the current aspect ratio, so the whole
 * subject stays inside the frame on a phone as well as on a wide screen.
 */
export function framePose(pose, aspect) {
  const scale = distanceScaleForAspect(aspect);
  return {
    position: pose.target.clone().add(pose.position.clone().sub(pose.target).multiplyScalar(scale)),
    target: pose.target.clone(),
  };
}

/**
 * Distance at which a box of world half-extents fits inside a frame.
 * Used by the reel, which must frame a fixed subject in whatever aspect the
 * chosen social format asks for rather than in the browser window's shape.
 */
export function distanceToFit({ halfWidth, halfHeight, aspect, fovDegrees, minimum = 8 }) {
  const tanVertical = Math.tan((fovDegrees * Math.PI) / 180 / 2);
  const tanHorizontal = aspect * tanVertical;
  return Math.max(halfWidth / tanHorizontal, halfHeight / tanVertical, minimum);
}
