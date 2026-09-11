/**
 * An anterior cruciate ligament injury, as a statement about **what is holding
 * the tibia now**.
 *
 * ## Not a ligament in a different place
 *
 * A torn ACL is not the normal one moved. It is a different state of the same
 * structure — stretched and thinned, or discontinuous with a stump at each end
 * — and the scene draws it as one rather than displacing an intact ligament,
 * because a reader shown an intact ligament somewhere else has been shown the
 * wrong thing.
 *
 * ## What it was doing
 *
 * The ACL runs from the back of the lateral femoral condyle forward and down to
 * the front of the tibia, so when the tibia tries to slide forward under the
 * femur, the ligament is the thing in the way. It is **the primary restraint**
 * to that movement; the menisci, the capsule and the shape of the plateau are
 * secondary ones. The consequence worth a scene is what that word means when
 * the primary one is gone:
 *
 * ```text
 * holding(acl)       = aclShare · (1 − disruption)
 * holding(secondary) = secondaryShare · secondaryRestraint
 * translation        = maxTranslation · (missing acl + missing secondary)
 * ```
 *
 * With the ACL intact the secondary restraints carry a small part of it. With
 * the ACL gone they carry **all** of what is left — which is the same sentence
 * as "and that is why the meniscus is the next thing to fail", and it is why
 * this model reports a share rather than only a distance.
 *
 * ## What the figures are not
 *
 * `translation` is **a fraction of this model's own drawn plateau**, not
 * millimetres and not a side-to-side difference. Nothing here is a Lachman
 * test, an anterior drawer or a pivot shift: those are things a person does
 * with their hands to somebody's knee, with a grade that comes from what they
 * feel, and **no number in this model is any of them**. There is no examiner
 * here and nothing in this scene is being tested.
 *
 * ## What is not here
 *
 * No mechanism of injury, no pain, no swelling, no giving way, no instability
 * as a symptom, and nothing about sport or activity. No bone bruise, no
 * cartilage, no rotation — the model has one direction in it. No time, no
 * healing and no treatment of any kind.
 *
 * PROTOTYPE. The plateau's depth is the knee atlas's drawn value. **No
 * distance, share or fraction here is a measurement of anybody.**
 */

/** The knee atlas's own drawn values. */
export const KNEE = Object.freeze({
  /** Front to back across the tibial plateau, in the atlas's units. */
  plateauDepth: 1.24,
});

/**
 * How the restraint to the tibia sliding forward is divided when everything is
 * intact.
 *
 * A calibration, and a reading of one word: the ACL is described as the
 * *primary* restraint to anterior tibial translation and the menisci, capsule
 * and plateau shape as secondary ones. **The model claims the ordering, not the
 * numbers** — and the share it reports is a share of what is still holding in
 * that picture, never a measured contribution.
 */
export const RESTRAINT = Object.freeze({ acl: 0.85, secondary: 0.15 });

/**
 * The furthest forward this model lets the tibia go, as a fraction of the drawn
 * plateau's depth.
 *
 * Calibrated so that a discontinuous ligament with nothing else holding is a
 * translation a reader can see without the tibia leaving the femur. Not a
 * millimetre of anything.
 */
export const MAX_TRANSLATION = 0.28;

/** Where a thinning ligament stops being continuous. */
export const SEPARATES_ABOVE = 0.82;
/** Below this, nothing has happened to it. */
export const INTACT_BELOW = 0.05;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const DEFAULT_CONTROLS = Object.freeze({
  disruption: 1,
  /** How much of the secondary restraint is still there. */
  secondaryRestraint: 1,
});

/**
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveAclInjury(controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const disruption = clamp(settings.disruption, 0, 1);
  const secondaryRestraint = clamp(settings.secondaryRestraint, 0, 1);

  /**
   * A ligament that is no longer continuous holds nothing.
   *
   * The step at `SEPARATES_ABOVE` is deliberate and is not a rounding: a cord
   * that has failed does not go on carrying a fraction of what it carried, and
   * a model that let it taper smoothly to zero would be drawing a ligament
   * getting gradually worse where what happens is that it stops.
   */
  const holdingAcl = disruption > SEPARATES_ABOVE ? 0 : RESTRAINT.acl * (1 - disruption);
  const holdingSecondary = RESTRAINT.secondary * secondaryRestraint;
  const holding = holdingAcl + holdingSecondary;
  const missing = 1 - holding;

  return {
    controls: { ...settings, disruption, secondaryRestraint },
    disruption,
    /**
     * The state of the ligament itself, which is what the scene draws.
     *
     * Three states of one structure, not three positions of it.
     */
    state:
      disruption < INTACT_BELOW
        ? 'intact'
        : disruption > SEPARATES_ABOVE
          ? 'discontinuous'
          : 'stretched',
    continuous: disruption <= SEPARATES_ABOVE,
    /** How far the tibia can go forward, as a fraction of the drawn plateau. */
    translationFraction: MAX_TRANSLATION * missing,
    holdingAcl,
    holdingSecondary,
    /**
     * What is left of the restraint there was, and how it is divided.
     *
     * Reported against the intact total rather than against each other: a share
     * of what is still holding reads as reassurance when very little is, and
     * "fifteen per cent of what used to hold it, all of it secondary" is the
     * sentence this scene is for.
     */
    restraintRemaining: holding,
    aclOfOriginal: holdingAcl,
    secondaryOfOriginal: holdingSecondary,
    /**
     * Whether the secondary restraints are now the ones doing it.
     *
     * The sentence the scene exists for, and the reason it reports a share.
     */
    secondaryCarriesIt: holdingSecondary > holdingAcl,
    /** Nothing is holding it at all: the ligament is gone and so is the rest. */
    nothingHolding: holding <= 0,
  };
}
