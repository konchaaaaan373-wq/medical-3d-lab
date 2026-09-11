/**
 * Hip osteoarthritis, as a statement about **a centre that stopped being
 * shared**.
 *
 * ## The difference between this joint and the knee
 *
 * The hip atlas says it in one line: the centre of the socket and the centre of
 * the ball are the same point. That is what a ball in a socket *is*, and it is
 * why this disease does not look like the knee's. A knee has two compartments
 * side by side and loses one of them; a hip has one contained surface and loses
 * it **in a direction** — so the question is not which compartment but which
 * way, and the answer is visible as the two centres coming apart.
 *
 * ```text
 * t(d)  = t₀ · (1 − lost(d))                 ← what is left of the layer
 * δ     = t₀ · lost(where it is worst)       ← how far the centres separate
 * gap(d)= t₀ − δ·cos(θ from that direction)  ← the space between the bones
 * ```
 *
 * Two things fall out. Where the layer has gone the space closes; and **on the
 * opposite side the space appears to open**, because the ball has moved away
 * from a socket wall whose own layer is still there. A reader who expects a
 * joint to narrow all round is looking at the wrong shape of answer.
 *
 * The exception is the pattern in which the layer goes evenly. Then the ball
 * cannot move — it is against the socket everywhere at once — and the space
 * closes all round with the centres still shared. That is a different picture,
 * not a milder one.
 *
 * ## What the figures are not
 *
 * Everything here is a fraction of a layer this repository drew. **It is not a
 * joint space width**: that is millimetres between two bone surfaces on a
 * weight-bearing radiograph, taken by somebody, in a direction they chose.
 * Nothing here is measured, nothing bears weight, and nothing is millimetres.
 *
 * ## What is not here
 *
 * No pain, stiffness, limp, range or anything a person can do; no time,
 * progression or cause; no loading of any kind, so no feedback; no cyst, no
 * sclerosis, no dysplasia, no impingement, no avascular necrosis; no grading
 * system and no treatment.
 *
 * PROTOTYPE. **No thickness, offset or fraction here is a measurement of
 * anybody.**
 */

/** The hip atlas's own drawn radii, in its units. */
export const HIP = Object.freeze({
  headRadius: 0.4,
  socketRadius: 0.48,
  /** What is between them, which is the layer this model thins. */
  get layer() {
    return 0.48 - 0.4;
  },
});

/**
 * The directions the scene names, as angles in the coronal plane measured from
 * the floor of the socket towards the roof.
 *
 * Three of the described patterns of hip osteoarthritis: up and out, straight
 * up, and into the floor of the socket.
 */
export const DIRECTIONS = Object.freeze([
  { id: 'none', angle: null },
  { id: 'superolateral', angle: (110 * Math.PI) / 180 },
  { id: 'superior', angle: (70 * Math.PI) / 180 },
  { id: 'medial', angle: 0 },
  /** The pattern with no direction in it: the layer goes evenly. */
  { id: 'concentric', angle: null, even: true },
]);

/** How much of the loss reaches the rest of the surface in a directional pattern. */
export const SPILL = 0.15;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const DEFAULT_CONTROLS = Object.freeze({
  direction: 'superolateral',
  loss: 1,
});

/**
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveHipOsteoarthritis(controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const direction = DIRECTIONS.find((candidate) => candidate.id === settings.direction) ?? DIRECTIONS[0];
  const present = direction.id !== 'none';
  const loss = present ? clamp(settings.loss, 0, 1) : 0;
  const even = Boolean(direction.even);

  const layer = HIP.layer;

  /** What is left of the layer in one direction. */
  const remainingAt = (angle) => {
    if (!present) return 1;
    if (even) return 1 - loss;
    const towards = Math.cos(angle - direction.angle);
    // Loss is greatest along the direction and falls away from it, never below
    // the small amount that reaches the rest of the surface.
    return 1 - loss * (SPILL + (1 - SPILL) * Math.max(0, towards));
  };

  // The ball settles against whatever layer is left where it is thinnest, so
  // the two centres come apart by exactly what has gone there. Where the layer
  // goes evenly there is nowhere for it to settle to, and they stay shared.
  const offsetFraction = even || !present ? 0 : loss;
  const offset = layer * offsetFraction;

  /** The space between the two bones in one direction. */
  const gapAt = (angle) => {
    const towards = present && !even ? Math.cos(angle - direction.angle) : 0;
    return Math.max(0, layer * (even ? 1 - loss : 1) - offset * towards);
  };

  const named = Object.fromEntries(
    DIRECTIONS.filter((candidate) => candidate.angle !== null).map((candidate) => [
      candidate.id,
      {
        id: candidate.id,
        angle: candidate.angle,
        remaining: remainingAt(candidate.angle),
        gapFraction: gapAt(candidate.angle) / layer,
      },
    ])
  );

  const places = Object.values(named);
  const narrowest = places.reduce((worst, place) => (place.gapFraction < worst.gapFraction ? place : worst), places[0]);
  const widest = places.reduce((best, place) => (place.gapFraction > best.gapFraction ? place : best), places[0]);

  return {
    controls: { ...settings, direction: direction.id, loss },
    present,
    direction: direction.id,
    loss,
    /** Whether the two centres are still the same point. */
    concentric: offsetFraction === 0,
    offsetFraction,
    offset,
    /** The direction the ball has moved, as a unit vector in the coronal plane. */
    migration:
      present && !even
        ? { x: Math.cos(direction.angle), y: Math.sin(direction.angle) }
        : { x: 0, y: 0 },
    at: named,
    gapAt,
    remainingAt,
    narrowest,
    widest,
    /**
     * Whether the space is wider somewhere than it was to begin with.
     *
     * The half of the picture a reader does not expect: the ball has moved away
     * from a wall whose own layer is still there.
     */
    apparentWidening: widest.gapFraction > 1.02,
  };
}
