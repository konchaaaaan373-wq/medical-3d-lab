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
 * How much of the frame the side and bottom panels are taking.
 *
 * The authored framing assumes the panels are there. In learning view they are
 * not, so the same distance leaves the subject floating in a large empty frame
 * — which is exactly the "dashboard with a small 3D model" the scene is not
 * supposed to be. Closing in is a framing decision, not a zoom hack: the whole
 * subject still has to fit at end-diastole, which is why this is a modest
 * factor rather than an arbitrary one.
 */
export function distanceScaleForView(view, aspect = 1.6) {
  if (view !== 'learning') return 1;
  // A little short of what would exactly fill the usable band: the console
  // grows and shrinks with the stage description, and the subject is at its
  // largest only at end-diastole, so the framing keeps a margin rather than
  // being retuned every time either changes. Set against the whole subject —
  // ventricle, atrium, pulmonary veins and the congestion overlay — not against
  // the ventricle alone, which is what left the pulmonary side off the frame.
  //
  // Went 0.86 -> 0.90 when the ventricle geometry was rebuilt: the subject grew
  // about 0.8 world units taller, and at 1280x800 with the longest stage
  // description there was no longer room for it between the top edge and the
  // console.
  //
  // On a portrait frame some of the aspect allowance above is given back. That
  // allowance exists to keep the subject clear of the side panels; in learning
  // view on a phone there are no side panels, and the extra distance was
  // leaving a ventricle a quarter of the frame tall on the one screen with the
  // least room to waste. Checked against the widest state the model produces —
  // a fully dilated ventricle at end-diastole still clears both edges.
  return aspect < 0.85 ? 0.9 * 0.88 : 0.9;
}

/**
 * How far up the frame the subject should ride, given how much of the bottom
 * the console is covering.
 *
 * Learning view hides the side panels but keeps the console along the bottom,
 * so the frame's usable band is not centred on the frame. Without this the
 * camera closes in and puts the apex behind the console — the one part of the
 * ventricle whose excursion the whole scene is about.
 *
 * The maths: if the console covers a fraction `b` of the frame height, the
 * usable band's centre sits `b/2` of the full height above the frame centre,
 * which is `b` in units of the half-height this offset is expressed in. Taking
 * the inset as a measurement rather than a constant means the framing follows
 * the console when it grows — a shorter window, a lesson panel, a longer stage
 * description — instead of being retuned for each.
 */
export function verticalOffsetForView(view, bottomInset = 0) {
  // Only part of the inset is given back, because the authored framing already
  // sits the subject high: its target is on the ventricle, while the atrium,
  // the pulmonary veins and the congestion overlay all rise above it. Taking
  // the full inset on top of that pushes the pulmonary side off the top of the
  // frame.
  //
  // The fraction is what centres the whole subject in the usable band, and it
  // is a measurement, not a preference: re-measure it whenever the anatomy or
  // the console changes.
  //
  // Note the inset used here is whatever the console is when the framing runs,
  // and the console grows with the stage description. The camera deliberately
  // does not re-frame on every stage change — that would drift the subject each
  // time a stage is picked — so the pair of constants has to hold at the
  // *tallest* console, which is what tests/framing-subject.test.js checks.
  return view === 'learning' ? bottomInset * 0.36 : 0;
}

/**
 * Scales a scene's authored framing to the current aspect ratio, so the whole
 * subject stays inside the frame on a phone as well as on a wide screen.
 */
/**
 * @param {{ position: any, target: any }} pose
 * @param {number} aspect
 * @param {'learning'|'data'} [view]
 * @param {number} [fovDegrees]
 * @param {number} [bottomInset] fraction of the frame the console covers
 */
export function framePose(pose, aspect, view = 'data', fovDegrees = 42, bottomInset = 0) {
  const scale = distanceScaleForAspect(aspect) * distanceScaleForView(view, aspect);
  const position = pose.target.clone().add(pose.position.clone().sub(pose.target).multiplyScalar(scale));
  const target = pose.target.clone();

  const offset = verticalOffsetForView(view, bottomInset);
  if (offset !== 0) {
    // Half the world height the frame covers at this distance, times how far
    // up the subject should sit. Scaling by distance keeps the shift correct
    // whichever framing the caller authored.
    const distance = position.distanceTo(target);
    const shift = distance * Math.tan((fovDegrees * Math.PI) / 180 / 2) * offset;
    position.y -= shift;
    target.y -= shift;
  }
  return { position, target };
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
