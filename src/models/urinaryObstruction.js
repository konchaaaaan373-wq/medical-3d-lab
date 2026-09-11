/**
 * An obstructed urinary tract, as a statement about **how much is behind it**.
 *
 * ## One path, two kidneys, and one place where that changes
 *
 * Everything above deserves to be said once: the urinary tract is not one tube.
 * It is **two tubes that join at the bladder**, and where along that arrangement
 * a blockage sits decides something a severity axis cannot express — **how many
 * kidneys are behind it**. A stone in one ureter has one kidney above it and
 * leaves the other at rest; a blockage at the bladder outlet has the bladder,
 * both ureters and both kidneys above it. That is not a worse version of the
 * same picture, it is a different picture, and it is the first claim here.
 *
 * The second is about where the room comes from. A kidney is inside a capsule
 * that does not stretch much, so a collecting system that fills has to take its
 * space from something, and what is next to it is the parenchyma. **The dilated
 * pelvis and the thinned parenchyma are the same volume counted twice**, which
 * is why this model reports a parenchymal thickness at all: not as a
 * measurement, but as the other side of the dilation.
 *
 * ## The arithmetic
 *
 * ```text
 * retained     = LOAD · backPressure · V(kidney at rest)   ← per kidney behind it
 * V(collecting)= V(pelvis at rest) + retained
 * V(capsule)   = V(kidney at rest) · (1 + GIVE · backPressure)
 * V(parenchyma)= V(capsule) − V(collecting)
 * thickness    = ∛(V(capsule)) − ∛(V(collecting))          ← as a ratio to rest
 * ```
 *
 * `GIVE` is how much the capsule itself yields, and it is small on purpose: a
 * kidney that simply grew to hold the extra would have nothing to say. The cube
 * roots turn two volumes into the radii of two nested shapes, which is what the
 * scene draws.
 *
 * The ureter and the bladder take the same treatment at their own scale: each
 * stretch that lies **above** the blockage is distended and each stretch below
 * it is not, and the model reports that per named stretch rather than as one
 * number, because "the tract is dilated" is exactly the sentence this scene
 * exists to take apart.
 *
 * ## What is not here, and some of it matters
 *
 * **There is no kidney function in this model at all.** No filtration, no
 * creatinine, no urine output, no recovery and no loss: a parenchyma drawn
 * thinner here is a thickness in a drawing and **says nothing about what the
 * kidney is doing**. `src/models/renalFiltration.js` is a separate model with
 * its own scope, and nothing here is coupled to it — a reader who wants
 * filtration should go and look at filtration.
 *
 * Nor is there time. The axis is how much has backed up behind the blockage,
 * not how long it has been there, and nothing in this model says whether a
 * thinned parenchyma stays thin. There is no cause of the obstruction — no
 * stone, no tumour, no stricture and no prostate — no infection, no pain, no
 * grading scheme of any kind, and no treatment. **This model does not grade
 * hydronephrosis**: no output here is a stage, a grade or a threshold, and a
 * geometry cannot be one.
 *
 * PROTOTYPE. Every volume is measured off this repository's own kidney,
 * ureter and bladder builders, whose proportions are drawn to be legible.
 * **No volume, thickness or ratio here is a measurement of anybody.**
 */

/** The landmark kidney's own semi-axes, from `buildKidney`. */
export const KIDNEY = Object.freeze({
  /** The capsule: the outer bean. */
  outer: Object.freeze([0.62, 0.98, 0.6]),
  /** The renal pelvis at rest, the funnel in the hilum. */
  pelvis: Object.freeze([0.2, 0.26, 0.16]),
});

const ellipsoid = ([a, b, c]) => (4 / 3) * Math.PI * a * b * c;

/** The kidney's volume at rest, in the atlas's units. */
export const KIDNEY_VOLUME = ellipsoid(KIDNEY.outer);

/** The collecting system's volume at rest, in the same units. */
export const PELVIS_VOLUME = ellipsoid(KIDNEY.pelvis);

/**
 * How much of a kidney's own volume backs up behind a complete blockage, at
 * the top of the axis.
 *
 * A calibration rather than a measurement: it turns the axis into a volume, and
 * it was chosen so that the dilation and the thinning are both visible across
 * the range the scene offers without the pelvis reaching the capsule.
 */
export const RETAINED_LOAD = 0.34;

/**
 * How far the capsule itself gives, as a fraction of the kidney's resting
 * volume at the top of the axis.
 *
 * Chosen small, and chosen against the claim rather than for the picture: the
 * room is supposed to come out of the parenchyma, so a capsule taking a large
 * share of the retained volume would make the claim false by construction.
 * `physiology: the room the collecting system gains comes mostly out of the
 * parenchyma` fixes that it stays a minority share. A capsule that yielded
 * nothing would be a rigid box, which it is not.
 */
export const CAPSULE_GIVE = 0.08;

/**
 * The tract, in the order urine runs, from one kidney to the outside.
 *
 * `side` is `'left'`, `'right'` or `null` for the stretches both kidneys share.
 * The order within a side is the order of flow; the shared stretches come after
 * both. **This is a topology and not a length**: no stretch here has a
 * dimension, and the ureter's three stretches are named divisions of one tube.
 */
export const STRETCHES = Object.freeze([
  { id: 'left-pelvis', side: 'left', kind: 'pelvis' },
  { id: 'left-upper-ureter', side: 'left', kind: 'ureter' },
  { id: 'left-mid-ureter', side: 'left', kind: 'ureter' },
  { id: 'left-lower-ureter', side: 'left', kind: 'ureter' },
  { id: 'right-pelvis', side: 'right', kind: 'pelvis' },
  { id: 'right-upper-ureter', side: 'right', kind: 'ureter' },
  { id: 'right-mid-ureter', side: 'right', kind: 'ureter' },
  { id: 'right-lower-ureter', side: 'right', kind: 'ureter' },
  { id: 'bladder', side: null, kind: 'bladder' },
]);

/**
 * Where the blockage is, and what that leaves above it.
 *
 * `blocks` names the last stretch that still fills; everything before it on the
 * same side, and every shared stretch before it, is above the blockage. A
 * `sides` of one is the whole point of the scene: the other kidney is not in
 * the picture the blockage makes.
 *
 * The five are **five places, not five degrees**. A blockage does not travel
 * from the pelviureteric junction to the bladder outlet, and an axis between
 * them would say it does.
 */
export const LEVELS = Object.freeze([
  { id: 'none', blocks: null, sides: [] },
  { id: 'pelviureteric', blocks: 'left-pelvis', sides: ['left'] },
  { id: 'mid-ureter', blocks: 'left-mid-ureter', sides: ['left'] },
  { id: 'vesicoureteric', blocks: 'left-lower-ureter', sides: ['left'] },
  { id: 'bladder-outlet', blocks: 'bladder', sides: ['left', 'right'] },
]);

/** How far a distended ureter is drawn against its resting calibre, at the top. */
export const URETER_DILATION = 2.1;

/** How far a distended bladder is drawn against its resting size, at the top. */
export const BLADDER_DILATION = 1.45;

/**
 * Below this share of its resting thickness, the parenchyma is reported as
 * thinned rather than as merely narrower.
 *
 * A reporting threshold for the copy, chosen so that it fires where the change
 * is visible on screen. **It is not a grade and not a clinical threshold.**
 */
export const THINNED_BELOW = 0.86;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const DEFAULT_CONTROLS = Object.freeze({
  level: 'mid-ureter',
});

/**
 * @param {number} backPressure how much has backed up, 0 to 1
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveUrinaryObstruction(backPressure, controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const level = LEVELS.find((candidate) => candidate.id === settings.level) ?? LEVELS[0];
  const pressure = level.blocks ? clamp(backPressure, 0, 1) : 0;

  const blockedIndex = level.blocks
    ? STRETCHES.findIndex((stretch) => stretch.id === level.blocks)
    : -1;
  const blockedStretch = blockedIndex >= 0 ? STRETCHES[blockedIndex] : null;

  /** Above the blockage means: on its side (or shared) and no further along. */
  const above = (stretch) => {
    if (!blockedStretch) return false;
    if (stretch.side === null) return stretch.id === blockedStretch.id;
    if (blockedStretch.side === null) return level.sides.includes(stretch.side);
    if (stretch.side !== blockedStretch.side) return false;
    return STRETCHES.indexOf(stretch) <= blockedIndex;
  };

  const retained = RETAINED_LOAD * pressure * KIDNEY_VOLUME;
  const collectingVolume = PELVIS_VOLUME + retained;
  const capsuleVolume = KIDNEY_VOLUME * (1 + CAPSULE_GIVE * pressure);

  const cbrt = (value) => Math.cbrt(Math.max(0, value));
  const restingThickness = cbrt(KIDNEY_VOLUME) - cbrt(PELVIS_VOLUME);
  const thickness = cbrt(capsuleVolume) - cbrt(collectingVolume);

  /** One kidney's picture, whichever side is behind the blockage. */
  const dilated = {
    /** The pelvis, against its own resting size, as a radius. */
    pelvisRatio: cbrt(collectingVolume / PELVIS_VOLUME),
    /** The capsule, against its own resting size, as a radius. */
    capsuleRatio: cbrt(capsuleVolume / KIDNEY_VOLUME),
    /** What is left between them, against what was there. */
    parenchymaRatio: restingThickness > 0 ? thickness / restingThickness : 1,
  };
  const resting = { pelvisRatio: 1, capsuleRatio: 1, parenchymaRatio: 1 };

  const state = STRETCHES.map((stretch) => {
    const isAbove = above(stretch);
    const reach = isAbove ? pressure : 0;
    const dilation =
      stretch.kind === 'ureter' ? URETER_DILATION : stretch.kind === 'bladder' ? BLADDER_DILATION : 1;
    return {
      id: stretch.id,
      side: stretch.side,
      kind: stretch.kind,
      above: isAbove,
      /** Against this stretch's own resting calibre. Pelvis takes the kidney's. */
      ratio:
        stretch.kind === 'pelvis'
          ? isAbove
            ? dilated.pelvisRatio
            : 1
          : 1 + (dilation - 1) * reach,
      distended: isAbove && pressure > 0.04,
    };
  });

  const byId = new Map(state.map((stretch) => [stretch.id, stretch]));
  const kidneys = {
    left: level.sides.includes('left') ? dilated : resting,
    right: level.sides.includes('right') ? dilated : resting,
  };

  return {
    controls: { ...settings, level: level.id },
    backPressure: pressure,
    blocked: Boolean(level.blocks) && pressure > 0,
    /** The last stretch that still fills, which is where the picture changes. */
    blockedAt: level.blocks,
    /**
     * **How many kidneys are behind this blockage.** The first claim, and the
     * one a severity axis cannot carry: one side or both is a property of the
     * place, not of the amount.
     */
    kidneysBehind: level.sides.length,
    sidesBehind: Object.freeze([...level.sides]),
    kidneys,
    /** The side that is not behind it, or `null` when both are. */
    sparedSide:
      level.sides.length === 1 ? (level.sides[0] === 'left' ? 'right' : 'left') : null,
    stretches: state,
    stretch: (id) => byId.get(id) ?? null,
    /** How much of the drawn tract is distended, as a share of its stretches. */
    distendedShare: state.filter((stretch) => stretch.distended).length / state.length,
    /**
     * Whether the parenchyma behind the blockage has thinned enough to be
     * reported as thinned. **Not a grade**, and it is a property of this
     * drawing's geometry.
     */
    parenchymaThinned: level.sides.length > 0 && dilated.parenchymaRatio < THINNED_BELOW,
    /**
     * The volume that is behind the blockage and the volume the capsule gained,
     * so the read-out can say the room came from somewhere rather than
     * appearing. **Atlas units, not millilitres.**
     */
    retainedVolume: level.sides.length > 0 ? retained : 0,
    capsuleGained: level.sides.length > 0 ? capsuleVolume - KIDNEY_VOLUME : 0,
  };
}
