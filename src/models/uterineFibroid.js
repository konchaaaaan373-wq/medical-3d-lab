/**
 * A uterine fibroid, as a statement about **where in the wall**.
 *
 * ## Three locations, not three stages
 *
 * Submucosal, intramural and subserosal are not a progression and not a
 * severity. They are three depths in one wall, and the whole content of this
 * model is that **the same amount of tissue at a different depth does something
 * different**: one presses into the cavity, one pushes the outline out, and one
 * in the middle of the wall reaches neither until it is big enough to reach
 * both. A fibroid does not travel from one to the next, and the scene's axis is
 * size at a chosen depth rather than a walk between them.
 *
 * ## The arithmetic
 *
 * The wall at the body of the uterus runs from the cavity — which is a flattened
 * plane, not a bag — out to the serosa. A fibroid is a sphere in that wall,
 * centred at a depth the location decides:
 *
 * ```text
 * indent(cavity)   = max(0, r − depth)
 * bulge(serosa)    = max(0, depth + r − wall)
 * contact(cavity)  = π·(r² − depth²) / area(cavity)        where r > depth
 * uterineVolume    = V₀ + (4/3)π r³
 * ```
 *
 * Two things fall out that are worth a scene. **The volume is the same wherever
 * it sits** — so a figure for how big the uterus has become says nothing about
 * what the fibroid is doing. And **the middle of the wall is the one place that
 * reaches nothing**, until a diameter at which it reaches the cavity and the
 * serosa in the same moment.
 *
 * ## What is not here
 *
 * No bleeding, no pain, no pressure symptoms, no fertility and no pregnancy.
 * No number here is a symptom, a score or a probability of one, and nothing in
 * this model makes any of them follow from size: **that they do not follow from
 * size in any simple way is the reason the scene is about location.** There is
 * no time, no growth, no hormone, no degeneration, no sarcoma and no treatment.
 * There is one fibroid, and most uteruses that have them have several.
 *
 * PROTOTYPE. The wall's depth, the cavity's area and the organ's volume are
 * measured off this repository's uterine atlas, whose own proportions are drawn
 * to be legible. **No length, area or volume here is a measurement of anybody.**
 */

/**
 * The atlas's own uterus, measured off its meshes.
 *
 * `tests/calibration.test.js` recomputes each of these from the geometry and
 * fails if the two drift apart, so the arithmetic and the picture stay the same
 * organ.
 */
export const UTERUS = Object.freeze({
  /** The whole drawn organ's volume, in the atlas's units. */
  volume: 0.668,
  /** Cavity plane to serosa at the body, in front. */
  wallDepth: 0.377,
  /** The cavity is a flattened triangle; this is its area. */
  cavityArea: 0.336,
});

/**
 * Where in the wall each location puts the middle of the fibroid, as a fraction
 * of the wall's depth.
 *
 * Three depths, offered as three alternatives. The names are the standard ones
 * and the fractions are this repository's reading of them: just under the
 * cavity, in the middle, just under the serosa.
 */
export const LOCATIONS = Object.freeze([
  { id: 'none', depthFraction: null },
  { id: 'submucosal', depthFraction: 0.14 },
  { id: 'intramural', depthFraction: 0.5 },
  { id: 'subserosal', depthFraction: 0.84 },
]);

/** The range of diameters the scene offers, in the atlas's units. */
export const DIAMETER_RANGE = Object.freeze({ min: 0.12, max: 0.62 });

/** Below this share of the cavity, a contact is a touch rather than a distortion. */
export const DISTORTS_CAVITY_ABOVE = 0.05;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const DEFAULT_CONTROLS = Object.freeze({
  location: 'intramural',
  diameter: DIAMETER_RANGE.max,
});

/**
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveUterineFibroid(controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const location = LOCATIONS.find((candidate) => candidate.id === settings.location) ?? LOCATIONS[0];
  const diameter = clamp(settings.diameter, DIAMETER_RANGE.min, DIAMETER_RANGE.max);
  const present = location.depthFraction !== null;

  const radius = present ? diameter / 2 : 0;
  const depth = present ? location.depthFraction * UTERUS.wallDepth : 0;

  // How far past each boundary of the wall the sphere reaches.
  const indent = present ? Math.max(0, radius - depth) : 0;
  const bulge = present ? Math.max(0, depth + radius - UTERUS.wallDepth) : 0;

  /**
   * The footprint a sphere makes where it crosses a plane: a disc of radius
   * √(r² − d²), with d the distance from the centre to the plane. The cavity is
   * a plane in this model, so this is the share of it the fibroid presses into.
   */
  const capArea = (distance) =>
    radius > distance ? Math.PI * (radius ** 2 - distance ** 2) : 0;

  const cavityContact = Math.min(1, capArea(depth) / UTERUS.cavityArea);
  const serosalFootprint = capArea(Math.max(0, UTERUS.wallDepth - depth));

  const fibroidVolume = (4 / 3) * Math.PI * radius ** 3;

  return {
    controls: { ...settings, location: location.id, diameter: present ? diameter : 0 },
    present,
    location: location.id,
    diameter: present ? diameter : 0,
    radius,
    /** From the cavity plane, outward. */
    centreDepth: depth,
    fibroidVolume,
    /** **The same at every location, which is the point.** */
    uterineVolumeRatio: (UTERUS.volume + fibroidVolume) / UTERUS.volume,
    reachesCavity: indent > 0,
    reachesSerosa: bulge > 0,
    /** How far past the cavity plane it reaches, and how much of the cavity it touches. */
    cavityIndent: indent,
    cavityContactFraction: cavityContact,
    distortsCavity: cavityContact > DISTORTS_CAVITY_ABOVE,
    /** How far past the serosa it reaches, against the wall's own depth. */
    serosalBulge: bulge,
    serosalBulgeFraction: bulge / UTERUS.wallDepth,
    serosalFootprint,
    /** The wall's depth where the fibroid is, against its depth elsewhere. */
    wallThickeningRatio: (UTERUS.wallDepth + bulge + indent) / UTERUS.wallDepth,
    /** The diameter at which a fibroid at this depth first reaches each boundary. */
    reachesCavityAt: present ? 2 * depth : null,
    reachesSerosaAt: present ? 2 * (UTERUS.wallDepth - depth) : null,
  };
}
