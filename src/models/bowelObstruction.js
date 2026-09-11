/**
 * Bowel obstruction, as a statement about **where**.
 *
 * ## One tube in series, and a place where it stops
 *
 * The gut is one path from the stomach to the sigmoid. A blockage on it
 * separates the path into two: everything above it keeps receiving and cannot
 * pass anything on, and everything below it receives nothing. That is the whole
 * mechanism, and everything this model computes is a consequence of it.
 *
 * It is why the site is a **scenario and not a severity**. A blockage high in
 * the small bowel and one at the sigmoid are not two points on one axis: they
 * distend different lengths of gut, put the transition at a different place,
 * and — depending on where the blockage is and how much of the gut is behind
 * it — carry the highest wall tension somewhere that is neither end. The axis
 * in this model is how completely the path is blocked, at whichever site the
 * reader has chosen.
 *
 * ## What the numbers are
 *
 * ```text
 * V(retained)   = LOAD · completeness · V(whole gut at rest)
 * areaRatio     = 1 + V(retained) / V(distensible at rest)
 * radiusRatio   = √areaRatio                      ← every distended segment
 * tension(seg)  = areaRatio · radiusRatio · r₀(seg) / r₀(caecum)
 * ```
 *
 * The last line is Laplace's law for a cylinder, `T = P·r`, with `areaRatio`
 * standing in for the distending pressure. **It is an index and not a
 * pressure**, it has no units, and this model has no pressure–volume curve for
 * bowel wall in it. What the index is for is comparing *segments in one
 * picture*: at one pressure the wider tube carries the higher wall tension, so
 * whichever distended segment is widest carries more of it than the blockage
 * does. **Which segment that is depends on the scenario, and the model works
 * it out rather than assuming it.** In the colonic scenarios here the answer
 * comes out at the caecum; in a small bowel obstruction the caecum is below
 * the blockage and is not distended at all, the distended bowel is one calibre
 * throughout, and `tensionStandsOut` is false because there is no worst-off
 * segment to name. **Nothing in this model says the caecum is generally the
 * wall under most strain** — it says what this gut, this site and this valve
 * come out at. Comparing the number between two scenarios is not something it
 * supports, and the scene's read-out reports a ratio within one picture for
 * exactly that reason.
 *
 * Nor does the index say anything about what happens to a wall that carries
 * the most. There is no perforation, no ischaemia and no risk of either in
 * this model, so it does not predict them anywhere — the caecum included.
 *
 * ## The ileocaecal valve
 *
 * The one place where a second control changes the shape of the answer rather
 * than its size. A valve that holds means a colonic obstruction has nowhere to
 * decompress: the same retained volume is confined between the valve and the
 * blockage, which is a far shorter length, so it distends much further. A valve
 * that does not hold lets the small bowel share it. Both are described, and
 * which one a person has is not something this model can tell you.
 *
 * ## What is not here
 *
 * No time and no rate: nothing in this model is hours, and the axis is how
 * complete the blockage is, not how long it has been there. No pain, no
 * vomiting, no abdominal distension as a sign, no bowel sounds, no tenderness.
 * No ischaemia, no perforation, no strangulation and no risk of any of them.
 * No cause — no adhesion, hernia, volvulus or tumour. No fluid shift, no
 * electrolytes, no blood supply, no treatment and no operation.
 *
 * PROTOTYPE. Lengths and calibres are the **drawn** proportions of this
 * repository's intestinal atlas, which are themselves illustrative. No length,
 * calibre, volume or index here is a measurement of anybody.
 */

/**
 * The gut, in the order it runs, with the atlas's drawn proportions.
 *
 * `lengthShare` is the fraction of the whole drawn path each part takes, and
 * `restingRadius` is its calibre against the caecum's. Both are measured off
 * the curves in `src/scenes/gastrointestinal/organs/`, so the picture and the
 * arithmetic are the same gut; `tests/calibration.test.js` fails if they drift.
 *
 * **These are not anatomical proportions.** In a person the small bowel is
 * several times the length of the colon and much narrower than these make it.
 * What the model claims is the *ordering* — that the caecum is the widest part
 * of the large bowel and the sigmoid the narrowest — not the ratios.
 */
export const SEGMENTS = Object.freeze([
  { id: 'duodenum', lengthShare: 0.0777, restingRadius: 0.589 },
  { id: 'proximal-small-bowel', lengthShare: 0.2396, restingRadius: 0.619 },
  { id: 'distal-small-bowel', lengthShare: 0.3595, restingRadius: 0.619 },
  { id: 'caecum', lengthShare: 0.0226, restingRadius: 1.0 },
  { id: 'ascending-colon', lengthShare: 0.042, restingRadius: 0.987 },
  { id: 'right-colic-flexure', lengthShare: 0.0226, restingRadius: 0.967 },
  { id: 'transverse-colon', lengthShare: 0.0743, restingRadius: 0.925 },
  { id: 'left-colic-flexure', lengthShare: 0.0226, restingRadius: 0.872 },
  { id: 'descending-colon', lengthShare: 0.0659, restingRadius: 0.814 },
  { id: 'sigmoid-colon', lengthShare: 0.073, restingRadius: 0.71 },
]);

/** Where the ileocaecal valve is: between these two segments. */
export const VALVE_AFTER = 'distal-small-bowel';

/**
 * The sites the scene offers, and the segment each one blocks the end of.
 *
 * Four places rather than a scale. Each is the downstream end of a named
 * stretch, because an obstruction is a point and the segments either side of
 * it are what the picture is about.
 */
export const SITES = Object.freeze([
  { id: 'none', blocks: null },
  { id: 'proximal-small-bowel', blocks: 'proximal-small-bowel' },
  { id: 'distal-small-bowel', blocks: 'distal-small-bowel' },
  { id: 'proximal-colon', blocks: 'transverse-colon' },
  { id: 'distal-colon', blocks: 'sigmoid-colon' },
]);

/**
 * How much the gut delivers into the obstructed length, as a multiple of the
 * whole gut's resting luminal volume.
 *
 * A calibration, chosen so that a complete blockage distends the bowel above it
 * visibly at every site and never past about twice its resting calibre. Most of
 * what fills an obstructed bowel enters above the duodenum, which is why the
 * same figure is used wherever the blockage is — but the figure itself is this
 * repository's, not a measured secretion.
 */
export const RETAINED_LOAD = 0.4;

/**
 * How far apart two segments' wall tension has to be before one of them is
 * worth naming. Below it the distended bowel is all of one calibre and there
 * is no worst part to point at.
 */
export const TENSION_STANDS_OUT = 1.06;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
const restingVolume = (segment) => segment.lengthShare * segment.restingRadius ** 2;
const CAECUM_RADIUS = SEGMENTS.find((segment) => segment.id === 'caecum').restingRadius;
const TOTAL_VOLUME = SEGMENTS.reduce((sum, segment) => sum + restingVolume(segment), 0);
const VALVE_INDEX = SEGMENTS.findIndex((segment) => segment.id === VALVE_AFTER);

export const DEFAULT_CONTROLS = Object.freeze({
  site: 'distal-small-bowel',
  completeness: 1,
  /** How well the ileocaecal valve holds against reflux back into the ileum. */
  valveCompetence: 1,
});

/**
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveBowelObstruction(controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const site = SITES.find((candidate) => candidate.id === settings.site) ?? SITES[0];
  const completeness = clamp(settings.completeness, 0, 1);
  const competence = clamp(settings.valveCompetence, 0, 1);

  const blockedIndex = site.blocks ? SEGMENTS.findIndex((segment) => segment.id === site.blocks) : -1;
  const blocked = blockedIndex >= 0 && completeness > 0;

  const above = blocked ? SEGMENTS.slice(0, blockedIndex + 1) : SEGMENTS;
  const below = blocked ? SEGMENTS.slice(blockedIndex + 1) : [];

  /**
   * A colonic obstruction above a valve that holds is shut in on both sides.
   *
   * The valve is the upper end of it, so the small bowel is not part of what
   * can take the volume — and a much shorter length has to take all of it.
   * A valve that gives way lets the bowel above share it, which is the same
   * obstruction with a different amount of gut behind it.
   */
  const colonic = blocked && blockedIndex > VALVE_INDEX;
  const closedLoop = colonic && competence > 0.5;
  const sharedByIleum = colonic ? 1 - competence : 1;

  // What can take the retained volume: everything above the blockage, with the
  // small bowel's share of it scaled by how far the valve gives way.
  const distensible = above.reduce((sum, segment, index) => {
    const share = colonic && index <= VALVE_INDEX ? sharedByIleum : 1;
    return sum + restingVolume(segment) * share;
  }, 0);

  const retained = RETAINED_LOAD * completeness * TOTAL_VOLUME;
  const areaRatio = blocked ? 1 + retained / distensible : 1;
  const radiusRatio = Math.sqrt(areaRatio);

  /** How much each segment is distended, and what its wall carries for it. */
  const state = SEGMENTS.map((segment, index) => {
    const isAbove = !blocked || index <= blockedIndex;
    const share = colonic && index <= VALVE_INDEX ? sharedByIleum : 1;
    // A segment the volume does not reach is not distended, however far above
    // the blockage it is: that is what the valve holding means.
    const reach = isAbove ? share : 0;
    const ratio = 1 + (areaRatio - 1) * reach;
    const radius = Math.sqrt(ratio);
    return {
      id: segment.id,
      above: isAbove,
      /** Empty means: nothing arrives here, because the path above is shut. */
      empty: !isAbove,
      distended: ratio > 1.02,
      radiusRatio: radius,
      lengthShare: segment.lengthShare,
      /** Laplace, as an index. Not a pressure and not a tension. */
      wallTensionIndex: ratio * radius * (segment.restingRadius / CAECUM_RADIUS),
    };
  });

  const byId = new Map(state.map((segment) => [segment.id, segment]));
  const distendedSegments = state.filter((segment) => segment.distended);
  const highest = distendedSegments.reduce(
    (best, segment) => (best && best.wallTensionIndex >= segment.wallTensionIndex ? best : segment),
    null
  );
  const lowest = distendedSegments.reduce(
    (least, segment) => (least && least.wallTensionIndex <= segment.wallTensionIndex ? least : segment),
    null
  );

  const spread = highest && lowest && lowest.wallTensionIndex > 0
    ? highest.wallTensionIndex / lowest.wallTensionIndex
    : 1;

  return {
    controls: { ...settings, completeness, valveCompetence: competence, site: site.id },
    blocked,
    closedLoop,
    /** The segment the blockage is at the end of, and the one just below it. */
    transitionAt: site.blocks,
    belowTransition: below[0]?.id ?? null,
    segments: state,
    segment: (id) => byId.get(id) ?? null,
    distendedLengthShare: distendedSegments.reduce((sum, segment) => sum + segment.lengthShare, 0),
    emptyLengthShare: state
      .filter((segment) => segment.empty)
      .reduce((sum, segment) => sum + segment.lengthShare, 0),
    radiusRatio,
    /** Stands in for the distending pressure. **Not a pressure, and not reported as one.** */
    distendingIndex: areaRatio,
    highestTension: highest ? { id: highest.id, index: highest.wallTensionIndex } : null,
    /**
     * How much more wall tension the worst-off distended segment carries than
     * the least. A comparison **inside one picture**, which is the only
     * comparison the index supports.
     */
    tensionSpread: spread,
    /**
     * Whether one segment's wall really is the worst-off, or whether the
     * distended bowel is all of one calibre.
     *
     * Small bowel is drawn at one width along its whole length, so naming a
     * "worst" segment inside it would be naming the first of several equals.
     * The colon is not, and that is where the claim lives.
     */
    tensionStandsOut: spread > TENSION_STANDS_OUT,
  };
}
