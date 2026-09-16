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
 * The default went 0.78 -> 0.88 when the distance below stopped being an
 * orthographic approximation. The old sum over-filled the band by about a
 * eighth on a typical organ — which is why 0.78 looked right — so keeping it
 * would have shrunk every composition that had already been measured from
 * pictures by that much. The two changes together leave the nine published
 * scenes the size they were and give the skin block, which the approximation
 * was cutting off, a frame that holds it.
 *
 * @param {{position: any, target: any}} pose the viewpoint to adjust
 * @param {object} options
 * @param {{centre: any, corners: any[]}} options.bounds the subject, in world space
 * @param {number} options.aspect frame aspect ratio
 * @param {number} options.fovDegrees vertical field of view
 * @param {{left?: number, right?: number, top?: number, bottom?: number}} [options.insets]
 * @param {number} [options.coverage]
 */
export function fitPoseToSafeArea(pose, { bounds, aspect, fovDegrees, insets = {}, coverage = 0.88 }) {
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

  const tanVertical = Math.tan((fovDegrees * Math.PI) / 180 / 2);
  const tanHorizontal = tanVertical * aspect;
  // Where the band's centre sits in normalised device coordinates, and how far
  // out from it the subject is allowed to reach. `coverage` shrinks the band
  // about its own centre, so it is a margin on all four sides rather than a
  // fudge factor on a distance.
  const centreX = left - right;
  const centreY = bottom - top;
  const reachX = coverage * bandWidth;
  const reachY = coverage * bandHeight;

  // Each corner is asked how far back the camera has to be for *it* to land
  // inside that reach, and the answer is the farthest of those.
  //
  // This used to take the subject's half-width and half-height, divide by the
  // frame's half-angle and pan afterwards — an orthographic sum on a
  // perspective camera, twice over. A corner nearer the camera than the centre
  // projects larger than the sum says, and the pan moves it further across the
  // frame than it moves the centre. So a subject with depth was framed to
  // overflow, and the deeper it was against its distance the worse the error.
  // The skin block is where it stopped being invisible: a cube 3.2 across
  // viewed from under four units away, its near face a third closer than its
  // centre, and "the cut face" put the whole subcutaneous layer off the bottom
  // of the frame on a fit that reported success.
  //
  // Both corrections are in the inequality below, which is the projection
  // solved for the distance rather than approximated: with the camera at
  // `distance` and the pan that goes with it, no corner leaves the reach.
  let spread = 0;
  let distance = 0;
  for (const corner of bounds.corners) {
    const offset = corner.clone().sub(bounds.centre);
    const across = offset.dot(rightAxis);
    const up = offset.dot(upAxis);
    // How much farther from the camera than the centre this corner is; negative
    // for the near ones, which are the ones that used to be got wrong.
    const along = offset.dot(forward);
    spread = Math.max(spread, Math.abs(across), Math.abs(up));
    distance = Math.max(
      distance,
      across / (reachX * tanHorizontal) - (along * (centreX + reachX)) / reachX,
      (along * (centreX - reachX)) / reachX - across / (reachX * tanHorizontal),
      up / (reachY * tanVertical) - (along * (centreY + reachY)) / reachY,
      (along * (centreY - reachY)) / reachY - up / (reachY * tanVertical)
    );
  }
  if (!(spread > 0) || !(distance > 0)) return unchanged;

  const target = bounds.centre.clone();
  const position = target.clone().addScaledVector(forward, -distance);

  // The world shift that puts the band's centre where the subject is. Both ends
  // move, so this is a pan; the distance above was solved with it in hand.
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

/**
 * Where the band the panels leave has its centre, in normalised device
 * coordinates.
 *
 * The same two numbers `fitPoseToSafeArea` computes for its pan, named and
 * exported because zooming needs them too: a zoom with no pointer behind it —
 * the +/− buttons, the +/− keys — has to happen about the middle of what the
 * reader can actually see, and that is not the middle of the canvas whenever a
 * header or a panel is over part of it.
 *
 * `x` runs right, `y` runs up, both in −1…1, and both are 0 when nothing is
 * covering the frame.
 *
 * @param {{left?: number, right?: number, top?: number, bottom?: number}} insets
 * @returns {{x: number, y: number}}
 */
export function bandCentreNdc(insets = {}) {
  return {
    x: clamp01(insets.left) - clamp01(insets.right),
    y: clamp01(insets.bottom) - clamp01(insets.top),
  };
}

/**
 * Zoom about a point on screen rather than about the orbit centre.
 *
 * ## The defect this exists for
 *
 * `fitPoseToSafeArea` sits the subject in the band by panning the camera *and*
 * the target together. That is the right way to compose the shot, and it leaves
 * the orbit centre somewhere the subject is not: at 1280×800 the target
 * projected to the middle of the canvas and the brain's centre sat 177 px to
 * the left of it.
 *
 * `OrbitControls` dollies along the line from the camera to the target, so the
 * target is the one point a zoom holds still. Everything else moves away from
 * it as the frame narrows: the subject's offset from the target is a fixed
 * world vector, the frame's half-height shrinks in proportion to the distance,
 * so the offset **in pixels** grows by exactly the zoom factor. Measured:
 * halving the distance moved the brain's centre from 177 px off to 354 px off,
 * and five steps of that walk it under the header and out of the frame.
 *
 * So the fix is not to re-centre anything — it is to zoom about the point the
 * reader is looking at instead of about the orbit centre.
 *
 * ## What it does
 *
 * Scales the camera and the target uniformly about the world point under
 * `ndc`, taken at the target's depth. A uniform scale about a point leaves that
 * point exactly where it is on screen, leaves the view direction untouched
 * (`target − position` only changes length), and multiplies the orbit radius by
 * `factor`. No bounding box is read and no framing is recomputed: this is the
 * same shot, closer.
 *
 * Pointer and pinch zooms do not come through here — `OrbitControls`'
 * `zoomToCursor` handles those, anchoring on the pointer and on the two-finger
 * midpoint respectively. This is for the zooms that have no pointer behind
 * them, and it anchors on `bandCentreNdc`.
 *
 * `pose.target` doubles as the vector factory, the same borrowing
 * `fitPoseToSafeArea` does, so this module still imports no `three`.
 *
 * @param {{position: any, target: any}} pose
 * @param {{ndc: {x: number, y: number}, factor: number, aspect: number, fovDegrees: number}} options
 * @returns {{position: any, target: any}}
 */
export function dollyAboutNdc(pose, { ndc, factor, aspect, fovDegrees }) {
  const unchanged = { position: pose.position.clone(), target: pose.target.clone() };
  if (!(factor > 0) || !(aspect > 0) || !(fovDegrees > 0)) return unchanged;

  const forward = pose.target.clone().sub(pose.position);
  const distance = forward.length();
  if (!(distance > 1e-8)) return unchanged;
  forward.normalize();

  const rightAxis = forward.clone().cross(pose.target.clone().set(0, 1, 0));
  if (rightAxis.lengthSq() < 1e-8) return unchanged;
  rightAxis.normalize();
  const upAxis = rightAxis.clone().cross(forward).normalize();

  // The anchor, on the plane through the target that faces the camera. Any
  // plane parallel to the frame would do — the point is fixed on screen either
  // way — and the target's is the one whose maths cannot divide by zero.
  const halfHeight = distance * Math.tan((fovDegrees * Math.PI) / 180 / 2);
  const anchor = pose.target
    .clone()
    .addScaledVector(rightAxis, ndc.x * halfHeight * aspect)
    .addScaledVector(upAxis, ndc.y * halfHeight);

  const scaleAbout = (point) => anchor.clone().add(point.clone().sub(anchor).multiplyScalar(factor));
  return { position: scaleAbout(pose.position), target: scaleAbout(pose.target) };
}

/**
 * The smallest nudge that brings a subject back into view, when it has almost
 * left it.
 *
 * Zooming about the pointer is what a reader means by zooming, and it lets them
 * walk the subject off the edge — which is also what they mean, right up until
 * they have lost it. So this is deliberately not a re-centring: it does nothing
 * at all while any reasonable part of the subject is inside the band, and when
 * it does act it moves the least it can, on only the axes that are out, to a
 * modest fraction rather than to the middle. A reader who has zoomed into one
 * gyrus keeps their gyrus where they put it.
 *
 * Both rectangles are in normalised device coordinates — x and y in −1…1, y up
 * — so this is pure arithmetic with no camera and no `three` in it. The result
 * is the shift to apply to the *subject* on screen; the camera moves the other
 * way.
 *
 * @param {{x0:number, x1:number, y0:number, y1:number}} subject on-screen box
 * @param {{x0:number, x1:number, y0:number, y1:number}} band what the panels leave
 * @param {{rescueBelow?: number, restoreTo?: number}} [thresholds]
 * @returns {{x:number, y:number}|null} null when nothing needs doing
 */
export function shiftIntoBand(subject, band, { rescueBelow = 0.1, restoreTo = 0.3 } = {}) {
  const sizeX = subject.x1 - subject.x0;
  const sizeY = subject.y1 - subject.y0;
  if (!(sizeX > 0) || !(sizeY > 0)) return null;
  const bandX = band.x1 - band.x0;
  const bandY = band.y1 - band.y0;
  if (!(bandX > 0) || !(bandY > 0)) return null;

  const overlap = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
  const visible = (shiftX, shiftY) =>
    (overlap(subject.x0 + shiftX, subject.x1 + shiftX, band.x0, band.x1) / sizeX) *
    (overlap(subject.y0 + shiftY, subject.y1 + shiftY, band.y0, band.y1) / sizeY);

  if (visible(0, 0) >= rescueBelow) return null;

  // Per axis, the smallest move that gets this much of the subject's extent
  // inside. `sqrt` because the two axes multiply into the area above, and a
  // subject larger than the band can never reach the share on that axis — then
  // the best available is to line the edges up, which `clamp` below does.
  const want = Math.sqrt(Math.min(1, restoreTo));
  const axis = (s0, s1, b0, b1, size, bandSize) => {
    const need = Math.min(size, bandSize) * want;
    if (overlap(s0, s1, b0, b1) >= need) return 0;
    // Out past the far edge, or past the near one: take whichever is nearer.
    const towardStart = b1 - need - s0; // move negative-ward until s0 is inside
    const towardEnd = b0 + need - s1;
    return Math.abs(towardStart) <= Math.abs(towardEnd) ? towardStart : towardEnd;
  };

  const x = axis(subject.x0, subject.x1, band.x0, band.x1, sizeX, bandX);
  const y = axis(subject.y0, subject.y1, band.y0, band.y1, sizeY, bandY);
  return x === 0 && y === 0 ? null : { x, y };
}
