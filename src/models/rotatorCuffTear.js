/**
 * A rotator cuff tear, as a statement about **what still holds the head down**.
 *
 * ## The cuff is not what lifts the arm
 *
 * The big muscle over the shoulder lifts it. What the cuff does is hold the
 * head of the humerus on its socket while that happens — and the part of that
 * job which survives a tear is not the part a reader expects. The four tendons
 * make a sleeve, and the two that face each other across it (in front and
 * behind) pull against one another and keep the head centred. That pairing is
 * the reason **a supraspinatus tear can leave the head exactly where it was**,
 * and the reason a tear that reaches round to one of the pair does not.
 *
 * ```text
 * containment = supraShare·(1 − tear) + coupleShare·couple
 * rise        = riseMax · max(0, 1 − containment/threshold)
 * ```
 *
 * The threshold is the whole shape of it: above it nothing moves, and below it
 * the head begins to sit higher. That is a step in behaviour rather than a
 * gradient, and it is what makes "how big is the tear" the wrong first question
 * and "what is left of the pair" the right one.
 *
 * ## The number that is not a measurement, and must not become one
 *
 * The scene reports how far the head has risen **as a fraction of the gap this
 * repository draws** under the arch. That gap is the shoulder atlas's
 * `SUBACROMIAL_DISPLAY_GAP`, and the atlas says in as many words that it is a
 * display value: in life the space is a few millimetres against a head of
 * several centimetres, and drawn to scale the tendon under the arch is a line
 * nobody can see. **A fraction of a drawn gap is not an acromiohumeral
 * distance**, it is not millimetres, and nothing here may be read as one.
 *
 * ## What is not here
 *
 * No pain, no weakness, no arc of movement, no range and nothing a person can
 * or cannot do. No impingement as a syndrome, no bursa, no tendinopathy, no
 * calcium, no retraction, no muscle quality and no arthropathy. No time, no
 * cause, no healing and no treatment. Nothing in this model moves an arm.
 *
 * PROTOTYPE. **No width, share or fraction here is a measurement of anybody.**
 */

/**
 * How the job of holding the head on the socket is divided.
 *
 * A calibration and a reading of one description: the supraspinatus is one
 * contributor, and the front-and-back pair is what centres the head. **The
 * model claims that the pair is what decides it, and never these numbers.**
 */
export const SHARE = Object.freeze({ supraspinatus: 0.4, couple: 0.6 });

/**
 * How much containment has to be left before the head stays where it is.
 *
 * Calibrated so that a complete supraspinatus tear with the pair intact leaves
 * the head centred, and a tear that reaches the pair does not. That behaviour
 * is the claim; the number is the way this model produces it.
 */
export const HOLDS_ABOVE = 0.6;

/** The furthest the head rises, as a fraction of the atlas's **display** gap. */
export const RISE_MAX = 0.75;

/** Past this much of the tendon's width, the defect is full-width. */
export const FULL_WIDTH_ABOVE = 0.85;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const DEFAULT_CONTROLS = Object.freeze({
  tear: 1,
  /** How much of the front-and-back pair is still there. */
  couple: 1,
});

/**
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveRotatorCuffTear(controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const tear = clamp(settings.tear, 0, 1);
  const couple = clamp(settings.couple, 0, 1);

  const fromSupraspinatus = SHARE.supraspinatus * (1 - tear);
  const fromCouple = SHARE.couple * couple;
  const containment = fromSupraspinatus + fromCouple;

  const rise = RISE_MAX * Math.max(0, 1 - containment / HOLDS_ABOVE);

  return {
    controls: { ...settings, tear, couple },
    tear,
    couple,
    /** The hole in the sleeve, as a fraction of the tendon's own width. */
    defectFraction: tear,
    fullWidth: tear > FULL_WIDTH_ABOVE,
    torn: tear > 0.02,
    containment,
    fromSupraspinatus,
    fromCouple,
    /** **A fraction of the atlas's display gap. Not an acromiohumeral distance.** */
    riseFraction: rise,
    centred: rise <= 0,
    /**
     * Whether the front-and-back pair is still doing its job.
     *
     * The question the scene replaces "how big is the tear" with.
     */
    coupleHolds: fromCouple >= HOLDS_ABOVE,
  };
}
