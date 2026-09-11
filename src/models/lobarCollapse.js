/**
 * A lobe that has lost its air, as a statement about **where the volume went**.
 *
 * ## The claim is conservation, not opacity
 *
 * A lobe whose bronchus is blocked absorbs the air already in it and gets
 * smaller. The chest does not get a hole in it while that happens, so the room
 * the lobe stopped occupying has to be taken by something, and there are only
 * two things on that side that can take it: **the other lobes of the same lung**,
 * which expand into it, and **the hemithorax itself**, which gets smaller — the
 * structures at the midline drawn towards the collapsed side.
 *
 * That is the whole model, and it is what makes collapse a different picture
 * from consolidation rather than a worse one. A consolidated lobe is full of
 * something other than air and **keeps its volume**: nothing moves towards it.
 * A collapsed lobe has lost volume, and everything nearby moves. Two lobes that
 * look equally wrong on a picture of density are opposite on a picture of
 * volume, which is the picture this scene draws.
 *
 * ## The other side does not help
 *
 * The two lungs are in two hemithoraces with the mediastinum between them, so
 * compensation is **a fact about one side**. Nothing in this model changes the
 * other lung at all — not as a claim that it is unaffected in a person, but
 * because a volume lost on one side is not offered to the other.
 *
 * ## The arithmetic
 *
 * ```text
 * lost        = share(blocked) · absorbed · (1 − RESIDUAL)
 * taken       = lost · TAKEN_BY_REST              ← shared out among the rest
 * shifted     = lost − taken                      ← the hemithorax's own share
 * volume(lobe)= share + taken · share / Σ(share of the rest)   ← for the rest
 * shift       = shifted / MIDLINE_FACE
 * ```
 *
 * Shares are **per side**, so each lung's lobes sum to one and a lobe's volume
 * ratio is against its own resting volume rather than against a lung.
 *
 * ## What is not here
 *
 * **There is no gas exchange in this model at all** — no oxygen, no shunt, no
 * saturation, no blood flow and no hypoxic vasoconstriction. A collapsed lobe
 * here is a volume, and **nothing in this model says what anybody's blood is
 * doing**. Nor is there a cause: no tumour, no mucus plug, no foreign body, no
 * aspiration and no post-operative anything. No time, no rate and no recovery —
 * the axis is how much of the air has gone, not how long it has been going. No
 * breath: nothing here inflates or deflates with a cycle. No symptom, no sign,
 * no auscultation, no imaging modality and no treatment.
 *
 * **It does not grade collapse and it does not read a chest radiograph.** No
 * output is a sign, a degree or a threshold.
 *
 * PROTOTYPE. The lobe shares are this repository's lung atlas's own, and the
 * face the shift is computed against is a calibration. **No volume, distance or
 * ratio here is a measurement of anybody.**
 */

/**
 * Each lobe's share of its own side, and which side that is.
 *
 * Copied from `LOBE_VOLUME_SHARES` in the respiratory atlas rather than
 * imported, because that module builds meshes and this one may not import
 * `three`. `tests/calibration.test.js` fails if the two drift apart, which is
 * the same arrangement the bowel model uses for the same reason.
 *
 * The shares are **per side**: each lung's lobes sum to one.
 */
export const LOBES = Object.freeze([
  { id: 'right-upper', side: 'right', share: 0.36 },
  { id: 'right-middle', side: 'right', share: 0.16 },
  { id: 'right-lower', side: 'right', share: 0.48 },
  { id: 'left-upper', side: 'left', share: 0.51 },
  { id: 'left-lower', side: 'left', share: 0.49 },
]);

/**
 * What is left of a lobe that has absorbed all the air it can.
 *
 * Chosen, and chosen away from zero: a lobe that had collapsed to nothing would
 * be a lobe this scene had deleted, and there would be no shape left to point
 * at. It is not a residual volume anybody measured.
 */
export const RESIDUAL = 0.12;

/**
 * How much of the vacated room the rest of that lung takes, against how much
 * the hemithorax takes by getting smaller.
 *
 * A calibration, and the one the whole picture turns on: at one, nothing at the
 * midline would move and the claim would be invisible; at zero, no lobe would
 * expand and the claim would be half-told. It was chosen so that both halves of
 * the answer are legible at once.
 */
export const TAKEN_BY_REST = 0.62;

/**
 * The area the hemithorax's share of the vacated volume is spread over to
 * become a distance, in the atlas's units.
 *
 * A calibration rather than a measurement: it turns a volume into the shift the
 * scene draws, and it was chosen so that the shift is visible at the top of the
 * axis without the two lungs meeting. The first value put a whole lower lobe's
 * shift at seven pixels, which is a claim a reader cannot check — the scene
 * also draws the midline's resting position beside it, so what is read is a gap
 * rather than a memory of where something used to be.
 */
export const MIDLINE_FACE = 0.5;

/** Above this much expansion, the rest of the lung is reported as expanded. */
export const EXPANDED_ABOVE = 1.04;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const DEFAULT_CONTROLS = Object.freeze({
  bronchus: 'right-lower',
});

/** The ids a blockage may sit at, `none` included. */
export const BRONCHI = Object.freeze(['none', ...LOBES.map((lobe) => lobe.id)]);

/**
 * @param {number} absorbed how much of the blocked lobe's air has gone, 0 to 1
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveLobarCollapse(absorbed, controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const blocked = LOBES.find((lobe) => lobe.id === settings.bronchus) ?? null;
  const gone = blocked ? clamp(absorbed, 0, 1) : 0;

  const lost = blocked ? blocked.share * gone * (1 - RESIDUAL) : 0;
  const taken = lost * TAKEN_BY_REST;
  const shifted = lost - taken;

  /** The lobes that can expand: the rest of the same lung, and only those. */
  const rest = blocked ? LOBES.filter((lobe) => lobe.side === blocked.side && lobe !== blocked) : [];
  const restShare = rest.reduce((sum, lobe) => sum + lobe.share, 0);

  const state = LOBES.map((lobe) => {
    const isBlocked = blocked !== null && lobe.id === blocked.id;
    const expands = rest.includes(lobe);
    // The room is shared out in proportion to how much each lobe already had,
    // which is the only division this model has any basis for.
    const share = expands && restShare > 0 ? (taken * lobe.share) / restShare : 0;
    const volume = isBlocked ? lobe.share - lost : lobe.share + share;
    return {
      id: lobe.id,
      side: lobe.side,
      restingShare: lobe.share,
      /** Against this lobe's own resting volume. */
      volumeRatio: volume / lobe.share,
      collapsed: isBlocked && gone > 0,
      expanded: expands && volume / lobe.share > EXPANDED_ABOVE,
      /** Whether this lobe is on the side the blockage is on at all. */
      onTheSide: blocked !== null && lobe.side === blocked.side,
    };
  });

  const byId = new Map(state.map((lobe) => [lobe.id, lobe]));

  return {
    controls: { ...settings, bronchus: blocked?.id ?? 'none' },
    absorbed: gone,
    blocked: blocked !== null && gone > 0,
    /** Which bronchus, and therefore which lobe, if any. */
    blockedAt: blocked?.id ?? null,
    /** The side the whole picture happens on. Nothing happens on the other. */
    side: blocked?.side ?? null,
    sparedSide: blocked ? (blocked.side === 'right' ? 'left' : 'right') : null,
    lobes: state,
    lobe: (id) => byId.get(id) ?? null,
    /**
     * The three numbers the claim is made of, in the same units, so that a
     * reader can see they add up. **Shares of one lung, not litres.**
     */
    vacated: lost,
    takenByTheRest: taken,
    takenByTheHemithorax: shifted,
    /**
     * How far the midline is drawn towards the collapsed side.
     *
     * **A distance in this drawing**, arrived at by spreading the hemithorax's
     * share of the vacated volume over a chosen face. It is not a tracheal
     * deviation and not a millimetre of anything.
     */
    shift: shifted / MIDLINE_FACE,
    shiftTowards: shifted > 0 ? blocked.side : null,
    /** Whether any remaining lobe has expanded enough to be reported as such. */
    restExpanded: state.some((lobe) => lobe.expanded),
  };
}
