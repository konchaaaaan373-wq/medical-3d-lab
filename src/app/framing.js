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
 * @param {{ minHorizontalAspect?: number }} [framing] optional scene-specific
 *        width reserve for subjects whose causal layout is intrinsically wide
 */
export function framePose(pose, aspect, view = 'data', fovDegrees = 42, bottomInset = 0, framing = {}) {
  const widthReserve = framing.minHorizontalAspect
    ? Math.max(1, framing.minHorizontalAspect / Math.max(0.01, aspect))
    : 1;
  const scale = distanceScaleForAspect(aspect) * distanceScaleForView(view, aspect) * widthReserve;
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
 * Fit a subject into the part of the frame nothing is covering.
 *
 * The authored viewpoints say which way to look; they cannot say how much room
 * there is, because that depends on the window. On a wide screen the anatomy
 * panel is docked down the right and the console sits along the bottom, so the
 * band the reader can actually see the model in is neither the canvas nor
 * centred on it — and framing to the canvas is how the model came to be clipped
 * by the header while a third of the lower left stayed empty.
 *
 * Three things happen here, kept separate so a picture can be judged for one at
 * a time. The camera looks at the subject's own centre rather than at whatever
 * point the viewpoint was authored around. The distance is set so the subject
 * fills a stated share of the *usable* band. And the camera is panned — same
 * direction, same angle, same anatomy — so that band's centre is where the
 * subject sits. Nothing here rotates anything or changes what is drawn.
 *
 * The subject is passed as its own box, projected onto the camera's own axes,
 * rather than as a bounding sphere: a brain is not a sphere, and fitting the
 * sphere around it wastes a fifth of the frame on corners that hold nothing.
 *
 * `insets` are fractions of the frame each edge is covered by, measured from
 * the real elements rather than assumed. `coverage` is the share of the band
 * the subject should take: a starting composition, not a threshold.
 *
 * @param {{position: any, target: any}} pose the viewpoint to adjust
 * @param {object} options
 * @param {{centre: any, corners: any[]}} options.bounds the subject, in world space
 * @param {number} options.aspect frame aspect ratio
 * @param {number} options.fovDegrees vertical field of view
 * @param {{left?: number, right?: number, top?: number, bottom?: number}} [options.insets]
 * @param {number} [options.coverage]
 */
export function fitPoseToSafeArea(pose, { bounds, aspect, fovDegrees, insets = {}, coverage = 0.78 }) {
  const unchanged = { position: pose.position.clone(), target: pose.target.clone() };
  if (!bounds?.centre || !bounds.corners?.length || !(coverage > 0)) return unchanged;
  const left = clamp01(insets.left);
  const right = clamp01(insets.right);
  const top = clamp01(insets.top);
  const bottom = clamp01(insets.bottom);
  // A band with no room left in it cannot be framed to, and leaving the pose
  // alone is the honest answer rather than an arbitrary one.
  const bandWidth = 1 - left - right;
  const bandHeight = 1 - top - bottom;
  if (bandWidth < 0.2 || bandHeight < 0.2) return unchanged;

  const forward = pose.target.clone().sub(pose.position);
  if (forward.lengthSq() < 1e-8) return unchanged;
  forward.normalize();
  // World up, borrowed from a vector the caller handed in rather than imported:
  // this module does no `three` of its own and is tested without it.
  const rightAxis = forward.clone().cross(pose.target.clone().set(0, 1, 0));
  if (rightAxis.lengthSq() < 1e-8) return unchanged;
  rightAxis.normalize();
  const upAxis = rightAxis.clone().cross(forward).normalize();

  let halfWidth = 0;
  let halfHeight = 0;
  for (const corner of bounds.corners) {
    const offset = corner.clone().sub(bounds.centre);
    halfWidth = Math.max(halfWidth, Math.abs(offset.dot(rightAxis)));
    halfHeight = Math.max(halfHeight, Math.abs(offset.dot(upAxis)));
  }
  if (!(halfWidth > 0) || !(halfHeight > 0)) return unchanged;

  const tanVertical = Math.tan((fovDegrees * Math.PI) / 180 / 2);
  // The band is only part of the frame, so the frame has to cover more than the
  // band by exactly the share the panels have taken.
  const distance = Math.max(
    (halfHeight / coverage / bandHeight) / tanVertical,
    (halfWidth / coverage / bandWidth) / (aspect * tanVertical)
  );

  const target = bounds.centre.clone();
  const position = target.clone().addScaledVector(forward, -distance);

  // Where the band's centre is, in normalised device coordinates, and the world
  // shift that puts the subject there. Both ends move, so this is a pan.
  const centreX = left - right;
  const centreY = bottom - top;
  if (centreX !== 0 || centreY !== 0) {
    const frameHalfHeight = distance * tanVertical;
    const shift = rightAxis
      .clone()
      .multiplyScalar(-centreX * frameHalfHeight * aspect)
      .add(upAxis.clone().multiplyScalar(-centreY * frameHalfHeight));
    position.add(shift);
    target.add(shift);
  }
  return { position, target };
}

/**
 * How close and how far the camera may go, for a scene that can say what it is
 * drawing.
 *
 * The shared orbit controls hold a floor of five world units, and
 * `OrbitControls.update()` enforces it every frame — so the floor is not only a
 * limit on dragging, it is the last word on where the camera ends up after the
 * framing above has run. That number was set for a scene whose ventricle is
 * about that size. An atlas is not: the heart's own parts stand about 1.5 units
 * tall, so `fitPoseToSafeArea` asks for a camera around 2.5 units out and the
 * floor pushed it back to five. The heart opened a fifth of the frame high and
 * "take me to this artery" stopped short of the artery — both had worked out
 * the right distance and both were overruled.
 *
 * So the limits are measured from the subject instead. The floor is a tenth of
 * its radius: nearer than any framing this app produces — the whole subject
 * wants roughly two radii, one named structure a fraction of one — and still
 * short of the centre. The ceiling is far enough back to hold the subject
 * whatever the aspect. Neither is ever tightened: a scene whose subject is
 * larger than the shared limits keeps the shared limits.
 *
 * @param {{centre: any, corners: any[]}|null|undefined} bounds subject, world space
 * @param {{minDistance: number, maxDistance: number}} limits the shared limits
 * @returns {{minDistance: number, maxDistance: number}}
 */
export function orbitLimitsForSubject(bounds, { minDistance, maxDistance }) {
  const unchanged = { minDistance, maxDistance };
  if (!bounds?.centre || !bounds.corners?.length) return unchanged;
  let radius = 0;
  for (const corner of bounds.corners) {
    radius = Math.max(radius, corner.distanceTo(bounds.centre));
  }
  if (!(radius > 0)) return unchanged;
  return {
    minDistance: Math.min(minDistance, radius * 0.1),
    maxDistance: Math.max(maxDistance, radius * 12),
  };
}

const clamp01 = (value) => (Number.isFinite(value) ? Math.min(0.9, Math.max(0, value)) : 0);

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
