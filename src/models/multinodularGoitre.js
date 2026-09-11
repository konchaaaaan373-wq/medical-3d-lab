/**
 * A nodular thyroid, as a statement about **which way it has room to go**.
 *
 * ## Displacement is not narrowing
 *
 * The thyroid is wrapped round the front and sides of the trachea in a neck
 * that is soft in every direction but one. So a gland that enlarges in the neck
 * mostly **pushes the airway aside** — a deviated trachea and a normal lumen —
 * and it is only where the gland has followed the airway down through the
 * thoracic inlet, which is a ring of bone, that the same amount of tissue
 * **narrows** it instead. That distinction is the whole content of this model,
 * and it is a fact about boundaries rather than about thyroid tissue.
 *
 * The second fact is behind rather than in front. The recurrent laryngeal nerve
 * and the parathyroid glands lie against the gland's posterior surface, so an
 * enlargement that goes backwards does not approach them: it **passes them**,
 * and they end up on or inside the thing that was supposed to be in front of
 * them.
 *
 * ## The arithmetic
 *
 * ```text
 * advance   = burden · V(lobe) / faceArea        ← how far the gland's face moves
 * push      = advance · towardTrachea(direction)
 * deviation = push · (1 − confined(direction))
 * indent    = push · confined(direction)
 * width     = (2R − indent) / 2R
 * behind    = advance · behind(direction) / depth(lobe)
 * ```
 *
 * ## What is not here, and one of them matters more than the rest
 *
 * **There is no thyroid function in this model at all.** No hormone, no TSH,
 * no uptake, no autonomy: a goitre of any shape here may be euthyroid,
 * overactive or underactive, and **nothing about the shape says which**. That
 * is not a simplification, it is the point — a scene that let a reader infer
 * function from morphology would be teaching something false.
 *
 * Nor is there malignancy, cytology, calcification or any distinction between
 * one nodule and another; no swallowing, breathing, voice or symptom of any
 * kind; no time, no growth rate and no treatment. The nerve relation here is
 * **anatomy and not injury**: nothing in this model says a nerve is damaged,
 * at risk, or anything else about it.
 *
 * PROTOTYPE. The lobe's volume and depth and the trachea's calibre are measured
 * off this repository's thyroid atlas, whose own proportions are drawn to be
 * legible. **No volume, width or distance here is a measurement of anybody.**
 */

/** The atlas's own gland and airway, measured off its meshes. */
export const THYROID = Object.freeze({
  /** One lobe, in the atlas's units. */
  lobeVolume: 0.226,
  /** How deep a lobe is, front to back. */
  lobeDepth: 0.832,
  /** The trachea the gland is wrapped around. */
  tracheaRadius: 0.24,
});

/**
 * The face the added tissue has to come out through, in the atlas's units.
 *
 * A calibration rather than a measurement: it turns a volume into a distance,
 * and it was chosen so that the range of burdens the scene offers produces
 * displacements and narrowings that are visible without being absurd.
 */
export const FACE_AREA = 1.2;

/** The most the scene lets the gland grow, as a multiple of one lobe. */
export const BURDEN_RANGE = Object.freeze({ min: 0, max: 3 });

/**
 * Which way the enlargement goes, and what is in that direction.
 *
 * Four directions rather than four degrees. `towardTrachea` is how much of the
 * advance is aimed at the airway, `confined` is how much of *that* meets a
 * boundary that will not move — which in this anatomy means the thoracic inlet
 * — and `behind` is how much of it goes back past the nerve and the parathyroid
 * glands. The numbers are this repository's reading of four standard pictures;
 * see the dossier.
 */
export const DIRECTIONS = Object.freeze([
  { id: 'none', towardTrachea: 0, confined: 0, behind: 0 },
  { id: 'anterior', towardTrachea: 0.02, confined: 0, behind: 0 },
  { id: 'medial', towardTrachea: 0.85, confined: 0.05, behind: 0.05 },
  { id: 'posterior', towardTrachea: 0.3, confined: 0.1, behind: 0.85 },
  { id: 'retrosternal', towardTrachea: 0.55, confined: 0.85, behind: 0.3 },
]);

/** Past this share of a lobe's depth, the posterior structures are inside it. */
export const ENVELOPED_ABOVE = 0.4;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const DEFAULT_CONTROLS = Object.freeze({
  direction: 'medial',
  burden: BURDEN_RANGE.max,
});

/**
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveMultinodularGoitre(controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const direction = DIRECTIONS.find((candidate) => candidate.id === settings.direction) ?? DIRECTIONS[0];
  const burden = direction.id === 'none' ? 0 : clamp(settings.burden, BURDEN_RANGE.min, BURDEN_RANGE.max);

  const added = burden * THYROID.lobeVolume;
  const advance = added / FACE_AREA;

  const push = advance * direction.towardTrachea;
  const deviation = push * (1 - direction.confined);
  const indent = push * direction.confined;

  const width = 2 * THYROID.tracheaRadius;
  const behind = (advance * direction.behind) / THYROID.lobeDepth;

  return {
    controls: { ...settings, direction: direction.id, burden },
    direction: direction.id,
    burden,
    /** Both lobes together, against their resting volume. */
    glandVolumeRatio: 1 + burden / 2,
    addedVolume: added,
    advance,
    /** How far the airway has been pushed aside, in tracheal radii. */
    deviationRadii: deviation / THYROID.tracheaRadius,
    deviation,
    /** What is left across the airway, against this model's own resting width. */
    tracheaWidthFraction: Math.max(0.08, (width - indent) / width),
    indent,
    /** Whether anything the gland pushes against refuses to move. */
    confined: direction.confined > 0.5 && burden > 0,
    /** How far past the posterior structures the gland now reaches, as a share of its own depth. */
    behindFraction: behind,
    /**
     * Whether the nerve and the parathyroid glands now lie on or inside the
     * enlargement rather than behind it. **A statement about where things are,
     * and not about whether anything is damaged.**
     */
    envelopsPosterior: behind > ENVELOPED_ABOVE,
    /** Which of the two the airway is getting, for the copy to name. */
    airwayEffect:
      burden === 0 || (deviation < 0.02 && indent < 0.01)
        ? 'neither'
        : indent > deviation
          ? 'narrowed'
          : 'pushed aside',
  };
}
