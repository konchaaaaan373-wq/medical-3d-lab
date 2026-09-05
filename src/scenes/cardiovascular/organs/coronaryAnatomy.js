import { ANATOMICAL_AXES } from '../scenes/heartFailure/anatomy.js';

/**
 * The coronary arteries and the myocardium they supply.
 *
 * ## What this file is, and what owns what
 *
 * This is the **organ layer's** description of the coronary circulation:
 * which artery starts from which aortic sinus, which groove each runs in, and
 * which piece of myocardium each supplies. `docs/anatomy-specs.md` §2 A3-a
 * settles the ownership, and the direction it settles matters more than it
 * looks:
 *
 * - a scene may read this; this reads no scene;
 * - the vessels are placed on a surface the caller **supplies**, so nothing
 *   here imports the ventricle geometry and nothing here has a second opinion
 *   about where the epicardium is;
 * - the territories are anatomy, not a solved value. An ischemia model decides
 *   how badly a territory is supplied. It does not decide which myocardium
 *   belongs to which artery, and geometry never sits downstream of a disease.
 *
 * ## The coordinates
 *
 * Positions are `(t, phi)` on the ventricle, and both are measured rather than
 * assumed — `tests/coronary-anatomy.test.js` pins them against the built mesh.
 *
 * - `t` runs 0 at the apex to 1 at the base.
 * - `phi` is the azimuth: **0 is anterior**, π/2 is the patient's left, π is
 *   posterior, and ≈3π/2 is the patient's right, which is the septal side.
 *
 * Writing that down is the point of architecture rule 5. The ventricle's own
 * `septalPhi` is 4.75 and its `lateralPhi` is 1.75; every direction below is
 * derived from those or from `ANATOMICAL_AXES`, and none is a sign somebody
 * guessed.
 *
 * ## One right-dominant specimen
 *
 * The posterior descending artery comes off the right coronary here, which is
 * the arrangement in roughly four people in five. Left-dominant and balanced
 * circulations are not modelled — a specimen is one specimen — and the model
 * card has to say so.
 */

/** The septal aspect of the ventricle, in the geometry's own azimuth. */
export const SEPTAL_PHI = 4.75;
/** The lateral free wall, roughly opposite it. */
export const LATERAL_PHI = 1.75;

/**
 * How far around the ventricle the right ventricle wraps, in radians.
 *
 * The two interventricular grooves are the edges of that wrap, which is why
 * this is a half-angle about the septum rather than two typed azimuths: the
 * anterior and posterior grooves are the same fact seen from two sides, and
 * typing them separately is how they end up not being symmetrical about
 * anything.
 */
const RV_WRAP_HALF_ANGLE = 1.05;

/**
 * Where along the long axis the atrioventricular grooves run.
 *
 * The top of the ventricular body, which is what an atrioventricular groove
 * *is* — the ring where ventricle meets atrium. Written first as 0.9, which is
 * above where the ventricle's analytic surface stops being defined: the mesh
 * rounds over into the valve plane above that, and vessels placed there
 * oscillated in and out of the myocardium by a couple of radii while every
 * endpoint stayed exactly where it belonged.
 */
const BASE_T = 0.76;

/**
 * Where the interventricular arteries stop, short of the very tip.
 *
 * **This is a simplification with an anatomical cost, and the cost is real.**
 * The anterior descending reaches the apex and commonly turns around it onto
 * the inferior surface; here it stops about a fifth of the way up. Two reasons,
 * and both are about the surface rather than about the artery:
 *
 * - at the tip a surface of revolution has no well-defined normal, because its
 *   radius goes to zero, so there is no "away from the wall" to lay a vessel
 *   along;
 * - the ventricle's **mesh seals its apex** and the analytic surface these
 *   vessels are placed on does not. Measured on the built mesh, the apex vertex
 *   sits at y −5.67 where the analytic form says −6.36 — a difference of 0.68,
 *   against about 0.2 through the mid-body. Vessels drawn down to the analytic
 *   apex therefore hang below the heart that is actually drawn, which is what
 *   a render showed: two arteries ending in mid-air while every measurement of
 *   them said they sat correctly on the epicardium.
 *
 * The honest fix is to port the mesh's apex seal into
 * `epicardialSurfacePoint`, which is a change to the ventricle geometry rather
 * than to the coronary tree. Until then the vessels stop where the two surfaces
 * still agree, and `tests/coronary-anatomy.test.js` measures that agreement so
 * this number cannot quietly drift away from the reason for it.
 */
const APICAL_STOP_T = 0.2;

/**
 * The grooves, as the paths the arteries actually run in.
 *
 * A groove is named for the two chambers it separates, and every vessel below
 * refers to one by name. That indirection is architecture rule 1: a consumer
 * says "the anterior interventricular groove", never "phi 5.8".
 *
 * `from` and `to` are `t`, so a groove is a run along the long axis; an
 * atrioventricular groove is a run *around* the base instead, and carries
 * `phiFrom`/`phiTo` with a fixed `t`.
 */
export const GROOVES = Object.freeze({
  /**
   * Anterior interventricular groove: the anterior edge of the right
   * ventricle's attachment, from the base down to the apex. The LAD runs here.
   */
  anteriorInterventricular: Object.freeze({
    id: 'anterior-interventricular',
    label: 'Anterior interventricular groove',
    labelJa: '前室間溝',
    phi: SEPTAL_PHI + RV_WRAP_HALF_ANGLE,
    from: BASE_T,
    to: APICAL_STOP_T,
  }),
  /**
   * Posterior interventricular groove: the other edge of the same wrap. The
   * posterior descending artery runs here, and in this specimen it is a branch
   * of the right coronary.
   */
  posteriorInterventricular: Object.freeze({
    id: 'posterior-interventricular',
    label: 'Posterior interventricular groove',
    labelJa: '後室間溝',
    phi: SEPTAL_PHI - RV_WRAP_HALF_ANGLE,
    from: BASE_T,
    to: APICAL_STOP_T + 0.03,
  }),
  /**
   * Left atrioventricular groove: around the base on the free-wall side, from
   * the anterior groove round to the crux. The circumflex runs here.
   */
  leftAtrioventricular: Object.freeze({
    id: 'left-atrioventricular',
    label: 'Left atrioventricular groove',
    labelJa: '左房室溝',
    t: BASE_T,
    phiFrom: SEPTAL_PHI + RV_WRAP_HALF_ANGLE - Math.PI * 2,
    phiTo: SEPTAL_PHI - RV_WRAP_HALF_ANGLE,
  }),
  /**
   * Right atrioventricular groove: around the base on the right side, from the
   * aortic root to the crux, where the right coronary turns down into the
   * posterior interventricular groove.
   */
  rightAtrioventricular: Object.freeze({
    id: 'right-atrioventricular',
    label: 'Right atrioventricular groove',
    labelJa: '右房室溝',
    t: BASE_T,
    /**
     * Decreasing, so the sweep passes **through the septal side** — the short
     * way, over the right ventricle, which is the side the right coronary is
     * named for.
     *
     * Written first as `phiTo: … + 2π`, which lands on the same crux modulo a
     * turn and is therefore the same endpoint, while sweeping the whole way
     * round the patient's left: the right coronary ran in the left
     * atrioventricular groove, on top of the circumflex, and both ends were
     * still exactly where they belong. `tests/coronary-anatomy.test.js`
     * measures the middle of each vessel for that reason.
     */
    phiFrom: SEPTAL_PHI + RV_WRAP_HALF_ANGLE,
    phiTo: SEPTAL_PHI - RV_WRAP_HALF_ANGLE,
  }),
});

/**
 * Where each artery leaves the aorta.
 *
 * Given as a direction from the aortic root's centre rather than as a point,
 * because the root's position and diameter belong to the aorta and this file
 * does not own them. The caller supplies the root; this says which way round it
 * each ostium sits.
 *
 * The right sinus faces the patient's right and forward; the left faces the
 * patient's left and back. Both are built from `ANATOMICAL_AXES` so that a
 * scene which ever corrects its mirroring corrects these with it.
 */
export const CORONARY_SINUSES = Object.freeze({
  right: Object.freeze({
    id: 'right-coronary-sinus',
    label: 'Right coronary sinus',
    labelJa: '右冠尖',
    direction: Object.freeze([
      ANATOMICAL_AXES.right.x * 0.82 + ANATOMICAL_AXES.anterior.x * 0.57,
      -0.06,
      ANATOMICAL_AXES.right.z * 0.82 + ANATOMICAL_AXES.anterior.z * 0.57,
    ]),
  }),
  left: Object.freeze({
    id: 'left-coronary-sinus',
    label: 'Left coronary sinus',
    labelJa: '左冠尖',
    direction: Object.freeze([
      ANATOMICAL_AXES.left.x * 0.74 + ANATOMICAL_AXES.posterior.x * 0.67,
      -0.06,
      ANATOMICAL_AXES.left.z * 0.74 + ANATOMICAL_AXES.posterior.z * 0.67,
    ]),
  }),
});

/**
 * Which sinus each trunk starts from.
 *
 * A separate map from the sinuses themselves, because "the right coronary
 * starts in the right sinus" is the claim a test has to be able to break by
 * swapping two entries. Buried inside the branch list it would be a field
 * nothing compares.
 */
export const OSTIUM_OF = Object.freeze({ rca: 'right', leftMain: 'left' });

/**
 * The named epicardial arteries, as a tree.
 *
 * Only the trunks and the three vessels a territory is named for. Septal and
 * diagonal branches, the coronary veins and any collateral circulation are
 * declared out of scope in `docs/anatomy-specs.md` §2 A3-a — a first version
 * that draws every twig and gets the supply/demand imbalance wrong would have
 * spent its effort in the wrong place.
 */
export const CORONARY_BRANCHES = Object.freeze([
  Object.freeze({
    id: 'rca',
    label: 'Right coronary artery',
    labelJa: '右冠動脈',
    parent: null,
    ostium: 'right',
    groove: 'rightAtrioventricular',
    radius: 0.135,
  }),
  Object.freeze({
    id: 'left-main',
    label: 'Left main coronary artery',
    labelJa: '左冠動脈主幹部',
    parent: null,
    ostium: 'left',
    /** A short trunk before it divides; it runs in no groove of its own. */
    groove: null,
    radius: 0.155,
  }),
  Object.freeze({
    id: 'lad',
    label: 'Left anterior descending artery',
    labelJa: '左前下行枝',
    parent: 'left-main',
    groove: 'anteriorInterventricular',
    radius: 0.115,
  }),
  Object.freeze({
    id: 'lcx',
    label: 'Left circumflex artery',
    labelJa: '左回旋枝',
    parent: 'left-main',
    groove: 'leftAtrioventricular',
    radius: 0.105,
  }),
  Object.freeze({
    id: 'pda',
    label: 'Posterior descending artery',
    labelJa: '後下行枝',
    /**
     * The parent that makes this specimen right-dominant. In a left-dominant
     * heart it would come off the circumflex instead, and this one field is
     * what "dominance" means — which is why a test reads it by name.
     */
    parent: 'rca',
    groove: 'posteriorInterventricular',
    radius: 0.09,
  }),
]);

/** Right-dominant, and stated where a test can read it. */
export const DOMINANCE = 'right';

/** The three territories a myocardial segment can belong to. */
export const TERRITORIES = Object.freeze(['lad', 'rca', 'lcx']);

/**
 * The AHA 17-segment model, and which artery supplies each segment.
 *
 * **Source.** Cerqueira MD, Weissman NJ, Dilsizian V, Jacobs AK, Kaul S,
 * Laskey WK, Pennell DJ, Rumberger JA, Ryan T, Verani MS. *Standardized
 * myocardial segmentation and nomenclature for tomographic imaging of the
 * heart.* Circulation 2002;105:539–542. doi:10.1161/hc0402.102975.
 *
 * ## This table is a convention, and it is wrong about segment 3
 *
 * That is not a defect to fix; it is the nature of a fixed territory map, and
 * saying so is the condition on using one. Contrast-enhanced cardiac MR studies
 * of the correspondence find that only segments 6 and 12 are specific to the
 * circumflex and only segment 10 to the right coronary; segments 4, 5, 9, 11
 * and 15 overlap two arteries between people; and **segment 3, which the chart
 * below assigns to the right coronary, measured as left-anterior-descending
 * territory.** Coronary anatomy varies from person to person, and that
 * variation is the main limitation of the model.
 *
 * The scene must therefore present these as a representative assignment and
 * never as a prediction for anyone. The model card and the scope panel carry
 * that; this comment carries it for whoever edits the table.
 *
 * `level` and `wall` are the anatomy; `at` places the segment on the ventricle
 * in the coordinates above, so a myocardial sample can be asked which
 * territory it is in without anything else re-deriving the layout.
 */
const BASAL_T = 0.83;
const MID_T = 0.5;
const APICAL_T = 0.22;
const APEX_T = 0.03;

/**
 * The six walls of a short-axis level, as azimuths.
 *
 * Derived from the measured convention rather than typed: anterior is the
 * anterior axis, and the ring runs from there through the septum. The septal
 * pair straddles `SEPTAL_PHI` and the lateral pair straddles `LATERAL_PHI`,
 * which is the check that the ring is the right way round — and it is asserted
 * rather than eyeballed.
 */
const SIXTH = Math.PI / 3;
const WALL_PHI = Object.freeze({
  anterior: 0,
  anteroseptal: -SIXTH,
  inferoseptal: -2 * SIXTH,
  inferior: Math.PI,
  inferolateral: 2 * SIXTH,
  anterolateral: SIXTH,
});
const APICAL_WALL_PHI = Object.freeze({
  anterior: 0,
  septal: -Math.PI / 2,
  inferior: Math.PI,
  lateral: Math.PI / 2,
});

export const AHA_SEGMENTS = Object.freeze([
  { number: 1, label: 'Basal anterior', labelJa: '基部前壁', level: 'basal', wall: 'anterior', territory: 'lad' },
  { number: 2, label: 'Basal anteroseptal', labelJa: '基部前中隔', level: 'basal', wall: 'anteroseptal', territory: 'lad' },
  { number: 3, label: 'Basal inferoseptal', labelJa: '基部下中隔', level: 'basal', wall: 'inferoseptal', territory: 'rca' },
  { number: 4, label: 'Basal inferior', labelJa: '基部下壁', level: 'basal', wall: 'inferior', territory: 'rca' },
  { number: 5, label: 'Basal inferolateral', labelJa: '基部下側壁', level: 'basal', wall: 'inferolateral', territory: 'lcx' },
  { number: 6, label: 'Basal anterolateral', labelJa: '基部前側壁', level: 'basal', wall: 'anterolateral', territory: 'lcx' },
  { number: 7, label: 'Mid anterior', labelJa: '中部前壁', level: 'mid', wall: 'anterior', territory: 'lad' },
  { number: 8, label: 'Mid anteroseptal', labelJa: '中部前中隔', level: 'mid', wall: 'anteroseptal', territory: 'lad' },
  { number: 9, label: 'Mid inferoseptal', labelJa: '中部下中隔', level: 'mid', wall: 'inferoseptal', territory: 'rca' },
  { number: 10, label: 'Mid inferior', labelJa: '中部下壁', level: 'mid', wall: 'inferior', territory: 'rca' },
  { number: 11, label: 'Mid inferolateral', labelJa: '中部下側壁', level: 'mid', wall: 'inferolateral', territory: 'lcx' },
  { number: 12, label: 'Mid anterolateral', labelJa: '中部前側壁', level: 'mid', wall: 'anterolateral', territory: 'lcx' },
  { number: 13, label: 'Apical anterior', labelJa: '心尖部前壁', level: 'apical', wall: 'anterior', territory: 'lad' },
  { number: 14, label: 'Apical septal', labelJa: '心尖部中隔', level: 'apical', wall: 'septal', territory: 'lad' },
  { number: 15, label: 'Apical inferior', labelJa: '心尖部下壁', level: 'apical', wall: 'inferior', territory: 'rca' },
  { number: 16, label: 'Apical lateral', labelJa: '心尖部側壁', level: 'apical', wall: 'lateral', territory: 'lcx' },
  { number: 17, label: 'Apex', labelJa: '心尖部', level: 'apex', wall: 'apex', territory: 'lad' },
].map((segment) => Object.freeze({
  ...segment,
  id: `aha-${segment.number}`,
  t: { basal: BASAL_T, mid: MID_T, apical: APICAL_T, apex: APEX_T }[segment.level],
  phi:
    segment.level === 'apex'
      ? 0
      : segment.level === 'apical'
        ? APICAL_WALL_PHI[segment.wall]
        : WALL_PHI[segment.wall],
})));

/** Segment numbers by supplying artery, derived so the two cannot disagree. */
export const SEGMENTS_OF_TERRITORY = Object.freeze(
  Object.fromEntries(
    TERRITORIES.map((territory) => [
      territory,
      Object.freeze(AHA_SEGMENTS.filter((s) => s.territory === territory).map((s) => s.number)),
    ])
  )
);

/** The shortest signed angle between two azimuths. */
function angleBetween(a, b) {
  const d = ((a - b + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return Math.abs(d);
}

/**
 * How near a point on the ventricle is to a segment's centre, as a distance
 * that mixes the two coordinates sensibly.
 *
 * `t` and `phi` are not the same kind of quantity, so a plain Euclidean
 * distance over the pair would be meaningless. `phi` is weighted by how far
 * round the ventricle actually is at that height: near the apex the whole ring
 * is a short distance, which is exactly why the apex is one segment rather than
 * six.
 */
function segmentDistance(t, phi, segment) {
  const circumferential = angleBetween(phi, segment.phi) * Math.max(t, 0.12);
  const longitudinal = (t - segment.t) * 2.4;
  return Math.hypot(circumferential, longitudinal);
}

/** How sharply supply falls off with distance from a segment centre. */
const TERRITORY_FALLOFF = 0.42;

/**
 * Which territory supplies a point on the ventricle, as weights that sum to 1.
 *
 * The weights are the point of this function. A hard assignment would give a
 * wall-motion map with visible seams at segment boundaries, and worse, would
 * claim a precision the AHA model does not have — the real boundaries between
 * territories are not surfaces, they are a watershed. So each segment claims
 * the point with a smooth kernel, the claims are summed by territory, and the
 * result is normalised.
 *
 * The normalisation is not cosmetic: everything downstream multiplies a
 * territory's contractility by these, and weights that summed to anything else
 * would silently scale the whole ventricle's contraction.
 *
 * @param {number} t 0 apex .. 1 base
 * @param {number} phi azimuth, any winding
 * @returns {{ lad: number, rca: number, lcx: number }}
 */
export function territoryWeightsAt(t, phi) {
  const weights = { lad: 0, rca: 0, lcx: 0 };
  let total = 0;
  for (const segment of AHA_SEGMENTS) {
    const d = segmentDistance(t, phi, segment);
    const w = Math.exp(-((d / TERRITORY_FALLOFF) ** 2));
    weights[segment.territory] += w;
    total += w;
  }
  // Every kernel is positive, so `total` can only be zero if the exponentials
  // underflow — which needs a point implausibly far from all seventeen. Falling
  // back to the apex's territory would be a silent wrong answer, so it throws.
  if (!(total > 0)) {
    throw new RangeError(`No AHA segment claims (t=${t}, phi=${phi})`);
  }
  for (const territory of TERRITORIES) weights[territory] /= total;
  return weights;
}

/**
 * The territory that supplies a point, by name.
 *
 * @param {number} t
 * @param {number} phi
 * @returns {'lad' | 'rca' | 'lcx'}
 */
export function dominantTerritoryAt(t, phi) {
  const weights = territoryWeightsAt(t, phi);
  let best = TERRITORIES[0];
  for (const territory of TERRITORIES) {
    if (weights[territory] > weights[best]) best = territory;
  }
  return best;
}

/** The AHA segment nearest a point on the ventricle. */
export function segmentAt(t, phi) {
  let best = AHA_SEGMENTS[0];
  let bestDistance = Infinity;
  for (const segment of AHA_SEGMENTS) {
    const d = segmentDistance(t, phi, segment);
    if (d < bestDistance) {
      bestDistance = d;
      best = segment;
    }
  }
  return best;
}
