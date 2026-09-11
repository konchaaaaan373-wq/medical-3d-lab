/**
 * Loose particles in a semicircular canal, as a statement about **planes**.
 *
 * ## Why the head's position is the whole of it
 *
 * A canal is a loop lying in a plane. A particle in that loop can only be
 * driven along it by the part of gravity that lies **in the plane** — the part
 * along the canal's own normal presses the particle against the wall and moves
 * it nowhere. So whether a given canal can move its particles at all is
 * settled by the angle between gravity and that canal's plane, and that angle
 * is a property of how the head is held.
 *
 * That is the claim, and it is why this subject is worth three dimensions: two
 * canals in the same ear, with the head in the same position, are in
 * completely different states, and the difference is not a degree of anything.
 *
 * ## What moves, and where it stops
 *
 * The particle is taken to settle at the lowest point of the canal — the
 * quasi-static answer, with no inertia, no fluid and no time in it. What the
 * model reports is **how far round the loop that is** from where it started,
 * and whether that path runs towards the ampulla or away from it, which is a
 * fact about the arc and where the ampulla sits on it.
 *
 * ## Nystagmus is not here
 *
 * The direction of any eye movement is **not derived** in this model. A canal's
 * plane is related to the plane of the response it drives, but nothing here
 * computes an eye, a muscle or a direction of gaze, so **no output of this
 * model is a nystagmus** and the scene marks every step that mentions one as
 * educational. Symptoms, duration, fatigue and the effect of any manoeuvre are
 * outside it in the same way.
 *
 * ## The arithmetic
 *
 * ```text
 * g          = gravity in the head's frame, rotated by the head's position
 * inPlane    = g − (g·n) n                    ← what the canal can use
 * restsAt    = the angle on the loop that inPlane points to
 * travel     = angle from where it started to there
 * ```
 *
 * PROTOTYPE. The canals' planes and radius are this repository's ear atlas's
 * own. **No angle, distance or share here is a measurement of anybody.**
 */

/** The ear atlas's own canal loop, measured off `buildEar()`. */
export const CANAL = Object.freeze({
  /** The radius of the loop each canal is drawn as. */
  radius: 0.32,
  /** How thick the tube is, which is what the particle has room in. */
  bore: 0.055,
});

/**
 * The canals this model offers, by the normal of the plane each lies in.
 *
 * The normals are the atlas's own, and they are the entire reason the two
 * canals behave differently: the lateral canal's normal is vertical in an
 * upright head, so upright gravity lies **along** it and can drive nothing.
 *
 * `ampullaAt` is where the ampulla sits on the loop, in radians, so that a
 * direction of travel can be named rather than signed.
 */
export const CANALS = Object.freeze([
  { id: 'none', normal: null, ampullaAt: 0 },
  { id: 'posterior', normal: Object.freeze([1, 0, 0]), ampullaAt: Math.PI * 0.35 },
  { id: 'lateral', normal: Object.freeze([0, 1, 0]), ampullaAt: Math.PI * 0.2 },
]);

/**
 * Where the particle sits when the canal's plane holds no gravity at all.
 *
 * A fallback rather than a starting point: with nothing in the plane there is
 * no lowest point, so the particle has to be drawn somewhere and this is where.
 * **Every canal that gravity can reach derives its own resting place instead**,
 * and travel is measured from where the particle sat with the head upright —
 * not from here.
 */
export const RESTS_NOWHERE_AT = Math.PI * 1.15;

/**
 * How far the head is taken back, in degrees, at the top of the axis.
 *
 * A calibration chosen to reach a position in which the lateral canal's plane
 * plainly contains gravity — otherwise the scene could never show the thing it
 * exists to show. **It is not the angle of any manoeuvre.**
 */
export const MAX_PITCH = 110;

/** Below this much of gravity in the plane, the canal is reported as unable to drive anything. */
export const DRIVES_ABOVE = 0.08;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (a) => Math.hypot(a[0], a[1], a[2]);

/** Two in-plane axes for a loop with this normal, chosen the way the atlas chooses them. */
function frame(normal) {
  const axis = normal.map((value) => value / norm(normal));
  const seed = Math.abs(axis[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = [
    axis[1] * seed[2] - axis[2] * seed[1],
    axis[2] * seed[0] - axis[0] * seed[2],
    axis[0] * seed[1] - axis[1] * seed[0],
  ];
  const un = norm(u);
  const uu = u.map((value) => value / un);
  const w = [
    axis[1] * uu[2] - axis[2] * uu[1],
    axis[2] * uu[0] - axis[0] * uu[2],
    axis[0] * uu[1] - axis[1] * uu[0],
  ];
  return { axis, u: uu, w };
}

export const DEFAULT_CONTROLS = Object.freeze({ canal: 'posterior', side: 'left' });

/**
 * @param {number} head how far the head has gone back, 0 upright to 1
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveBppv(head, controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const canal = CANALS.find((entry) => entry.id === settings.canal) ?? CANALS[0];
  const position = clamp(head, 0, 1);
  const towardsLeft = settings.side === 'left' ? 1 : -1;

  // Gravity in the head's own frame: upright it is straight down, and taking
  // the head back rotates it about the ear-to-ear axis. The turn towards the
  // tested side is what makes the two ears different pictures.
  const pitch = (position * MAX_PITCH * Math.PI) / 180;
  const yaw = position * towardsLeft * 0.55;
  const gravity = [
    Math.sin(pitch) * Math.sin(yaw),
    -Math.cos(pitch),
    Math.sin(pitch) * Math.cos(yaw),
  ];

  if (!canal.normal) {
    return {
      controls: { ...settings, canal: canal.id },
      head: position, canal: canal.id, side: settings.side,
      inPlane: 0, drives: false, startsAt: RESTS_NOWHERE_AT, restsAt: RESTS_NOWHERE_AT,
      travel: 0, travelFraction: 0, towardsAmpulla: null, gravity, nystagmus: null,
    };
  }

  const { axis, u, w } = frame([...canal.normal]);

  /** Where the particle settles for a given gravity, and how much drives it. */
  const settle = (g) => {
    const along = dot(g, axis);
    const planar = [g[0] - along * axis[0], g[1] - along * axis[1], g[2] - along * axis[2]];
    const magnitude = norm(planar);
    return {
      inPlane: magnitude,
      drives: magnitude > DRIVES_ABOVE,
      at: magnitude > DRIVES_ABOVE ? Math.atan2(dot(planar, w), dot(planar, u)) : RESTS_NOWHERE_AT,
    };
  };

  const now = settle(gravity);
  // Where it was with the head upright. **Travel is measured from there**: a
  // particle in a canal whose plane already holds gravity has long since
  // settled, so starting it anywhere else would draw a journey that a head
  // sitting still had already finished.
  const upright = settle([0, -1, 0]);

  const startsAt = upright.at;
  const restsAt = now.drives ? now.at : startsAt;
  const inPlane = now.inPlane;
  const drives = now.drives;

  // The shorter way round, signed, so a direction can be named.
  let travel = restsAt - startsAt;
  while (travel > Math.PI) travel -= Math.PI * 2;
  while (travel < -Math.PI) travel += Math.PI * 2;

  // Whether that path runs towards the ampulla or away from it: a fact about
  // where the ampulla sits on this arc, and nothing more.
  let toAmpulla = canal.ampullaAt - startsAt;
  while (toAmpulla > Math.PI) toAmpulla -= Math.PI * 2;
  while (toAmpulla < -Math.PI) toAmpulla += Math.PI * 2;

  return {
    controls: { ...settings, canal: canal.id },
    head: position,
    canal: canal.id,
    side: settings.side,
    /** Gravity in the head's frame, for the scene to draw. */
    gravity,
    /**
     * **How much of gravity lies in this canal's plane.** The number the whole
     * model turns on: the rest of it presses the particle against the wall.
     */
    inPlane,
    /** Whether there is enough of it in the plane to move anything at all. */
    drives,
    startsAt,
    /** Where on the loop the particle settles. Quasi-static: no inertia, no fluid, no time. */
    restsAt,
    /** How far round the loop that is, in radians, signed. */
    travel: drives ? travel : 0,
    /** The same as a share of half the loop, for a read-out. */
    travelFraction: drives ? Math.abs(travel) / Math.PI : 0,
    /**
     * Whether the path runs towards the ampulla or away from it. A fact about
     * the arc — **not a direction of any response and not a nystagmus.**
     *
     * `null` when the particle has not moved: a journey of no distance has no
     * direction, and reporting one would be the arithmetic's sign rather than
     * anything about the arc.
     */
    towardsAmpulla: drives && travel !== 0 ? travel * toAmpulla > 0 : null,
    /**
     * **Not here.** No eye, no muscle, no direction of gaze. The field exists
     * so a caller cannot mistake the absence for an oversight.
     */
    nystagmus: null,
  };
}
