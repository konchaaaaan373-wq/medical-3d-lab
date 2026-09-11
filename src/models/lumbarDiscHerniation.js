/**
 * A lumbar disc that has displaced material, as **three separate questions**.
 *
 * ## The three things that are not the same thing
 *
 * The spine atlas says of its own disc that it draws two tissues because *the
 * difference between them is the difference between a bulge and a rupture*.
 * This model takes that literally and then insists on the distinction the
 * subject is most often collapsed across. There are three questions here and
 * this model answers exactly two of them:
 *
 * 1. **How far has the material gone, and is the annulus still holding it?**
 *    Solved. A displacement along a chosen direction, and whether it has
 *    passed the thickness of annulus that lay behind it.
 * 2. **Does it reach what lies that way?** Solved, *in this drawing*. The
 *    clearance to the canal and to the nerve root are distances measured off
 *    the atlas, and what the model reports is whether the drawn material has
 *    crossed them and by how much of the target's own width.
 * 3. **Does anybody feel anything?** **Not solved, not represented, and not
 *    inferable from either of the others.** There is no nerve in this model in
 *    any sense other than a drawn tube with a position. Sciatica, weakness,
 *    numbness and reflex change are not outputs here and the scene marks every
 *    step that mentions them as educational.
 *
 * Question 1 is a morphology, question 2 is a spatial relation, and question 3
 * is a person. Running them together is the single most common thing said
 * wrongly about this subject, so the model keeps them in three different
 * fields and the copy keeps them in three different sentences.
 *
 * ## What the containment state is not
 *
 * The model reports whether the annulus is still closed behind the displaced
 * material. **That is not the radiological classification.** Bulge,
 * protrusion, extrusion and sequestration are defined on measured geometry in
 * a plane somebody chose, with rules about the width of the base against the
 * depth of the displacement, and none of that is here. A reader must not map
 * `annulus: 'breached'` onto any of those words.
 *
 * ## The arithmetic
 *
 * ```text
 * reach   = displacement · MAX_REACH
 * breached= reach > ANNULUS_BEHIND
 * gap     = clearance(direction) − reach
 * indent  = max(0, −gap) / width(what it meets)
 * ```
 *
 * ## What is not here
 *
 * No time, no cause and no mechanism of injury — the axis is how far the
 * material has gone, not how it got there or how long ago. No inflammation and
 * no chemistry: a disc in this model displaces, and nothing about it irritates
 * anything. No imaging of any kind, no plane, no sequence and no measurement:
 * **nothing here is millimetres and nothing here is a canal or foraminal
 * stenosis ratio.** No treatment, no natural history and no resorption.
 *
 * PROTOTYPE. Every distance is measured off this repository's own spine atlas,
 * which declares itself not anatomically validated. **No distance, fraction or
 * state here is a measurement of anybody.**
 */

/**
 * How far the nucleus reaches, and what lies at the end of each direction, in
 * the atlas's own units.
 *
 * Measured off `buildSpine()` rather than assumed: the nucleus's own half-depth,
 * the annulus left behind it, and the surface-to-surface clearance from the
 * nucleus to each thing it could meet. `tests/calibration.test.js` re-measures
 * the atlas and fails if these drift.
 */
export const NUCLEUS_HALF_DEPTH = 0.159;

/**
 * The annulus still behind the nucleus, posteriorly.
 *
 * The one number that separates "the disc is deformed" from "material has left
 * it", which is the distinction the atlas built two tissues in order to make.
 */
export const ANNULUS_BEHIND = 0.161;

/**
 * What each direction runs into, how far away it is from the nucleus's surface,
 * and how wide it is.
 *
 * `width` is what an indentation is reported as a fraction of, so that the
 * read-out says "a third of the root's own width" rather than a distance
 * nobody can scale.
 */
export const TARGETS = Object.freeze({
  canal: Object.freeze({ clearance: 0.24, width: 0.23 }),
  'root-shoulder': Object.freeze({ clearance: 0.225, width: 0.05 }),
  'root-lateral': Object.freeze({ clearance: 0.361, width: 0.038 }),
});

/**
 * Which way the material goes, and what is that way.
 *
 * **Three arrangements, not three degrees.** A disc does not travel from one
 * direction to the next, and an axis between them would say it does.
 *
 * The atlas draws **one pair of roots at this level, leaving above the disc**.
 * So the traversing/exiting distinction that a clinician would want is *not
 * available here and is not claimed*: `posterolateral` and `far-lateral` reach
 * the same drawn root at two places along it, which is a statement about this
 * drawing and not about which root a herniation takes.
 */
export const DIRECTIONS = Object.freeze([
  { id: 'none', meets: null },
  { id: 'central', meets: 'canal' },
  { id: 'posterolateral', meets: 'root-shoulder' },
  { id: 'far-lateral', meets: 'root-lateral' },
]);

/**
 * The furthest the axis takes the material, in atlas units.
 *
 * A calibration: chosen so that every direction can reach what lies that way
 * before the top of the axis, including the furthest one, and so that none of
 * them travels so far that the material leaves the picture.
 */
export const MAX_REACH = 0.46;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const DEFAULT_CONTROLS = Object.freeze({ direction: 'posterolateral' });

/**
 * @param {number} displacement how far the material has gone, 0 to 1
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveLumbarDiscHerniation(displacement, controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const direction = DIRECTIONS.find((entry) => entry.id === settings.direction) ?? DIRECTIONS[0];
  const gone = direction.meets ? clamp(displacement, 0, 1) : 0;

  const reach = gone * MAX_REACH;
  const target = direction.meets ? TARGETS[direction.meets] : null;
  const gap = target ? target.clearance - reach : null;
  const overlap = gap !== null ? Math.max(0, -gap) : 0;
  // Bounded at the target's own width. Past that the model has nothing to say:
  // it does not push a root aside, deform it, or follow it anywhere, so an
  // indentation of "four times the root's width" would be arithmetic rather
  // than a claim. `pastItsWidth` records that the bound was reached.
  const indent = target ? Math.min(overlap, target.width) : 0;

  return {
    controls: { ...settings, direction: direction.id },
    displacement: gone,
    displaced: direction.meets !== null && gone > 0,
    /** How far the material has gone, in the atlas's units. Not millimetres. */
    reach,
    /**
     * **Question 1.** Whether the annulus still closes behind the material.
     *
     * `intact` is the disc deformed with its outer ring unbroken; `breached`
     * is material past it. **Neither word is the radiological classification**
     * — nothing here is a bulge, a protrusion, an extrusion or a sequestration,
     * which are defined on measured geometry this model does not have.
     */
    annulus: reach > ANNULUS_BEHIND ? 'breached' : 'intact',
    beyondAnnulus: Math.max(0, reach - ANNULUS_BEHIND),
    /** What lies the way it went, by name. `null` when it has not gone anywhere. */
    meets: direction.meets,
    /**
     * **Question 2.** How much room is left between the drawn material and the
     * drawn structure, in atlas units. Negative means they overlap on screen.
     */
    gap,
    /**
     * Whether the two drawn shapes overlap. **This is contact in a drawing**,
     * not a radiological report of root contact and not a finding in anybody.
     */
    touching: gap !== null && gap <= 0,
    /**
     * How far in it has gone, as a fraction of what it met — so the read-out
     * can say "a third of the root's own width" rather than a bare distance.
     */
    indentFraction: target ? indent / target.width : 0,
    indent,
    /**
     * Whether the drawn material has gone as far into what it met as this model
     * is willing to describe. **Not a severity**: past this point the model
     * stops measuring rather than the picture getting worse.
     */
    pastItsWidth: target ? overlap > target.width : false,
    /**
     * **Question 3 is not here.** Nothing in this model is a symptom, a sign, a
     * nerve behaving in any way, or a probability of any of those. The field
     * exists so that a caller reading the output cannot miss its absence.
     */
    symptoms: null,
  };
}
