/**
 * Knee osteoarthritis, as a statement about **which compartment**.
 *
 * ## A knee does not wear out; a compartment does
 *
 * The commonest picture is not a joint that has worn evenly. It is one
 * compartment of the same joint that has lost its layer while the other still
 * has one — and everything that follows goes with the side rather than with the
 * joint: the meniscus squeezed out from between converging surfaces on that
 * side, the marginal bone that grows at that rim. A reader who leaves with "the
 * cartilage wore out" has the wrong picture, and this model is built so that
 * the two pictures cannot be confused: the axis is how much is gone, and a
 * separate control says how confined to one compartment that is.
 *
 * ```text
 * lost(worst) = loss
 * lost(other) = loss · (1 − confinement)
 * remaining   = 1 − lost
 * extrusion   = k · lost                     ← a wedge between converging surfaces
 * ```
 *
 * ## What the figures are not
 *
 * `remaining` is **a fraction of this model's own drawn layer**, and it is
 * emphatically **not a joint space width**. Joint space width on a radiograph
 * is a different quantity: it is the distance between two bone surfaces on a
 * weight-bearing film, it includes the meniscus, and it is measured in
 * millimetres by somebody. Nothing here is measured, nothing here bears weight,
 * and nothing here is millimetres.
 *
 * ## What is not here
 *
 * No pain of any kind, no stiffness, no function and no progression: there is
 * no time in this model, and the axis is how much is gone rather than how long
 * it has taken. No inflammation, no subchondral bone, no synovium, no effusion,
 * no crystals, no grade and no treatment. **And the loop that matters most is
 * open**: uneven loss loads the worn side harder, which is thought to be part
 * of why it goes on — and this model does not close that loop, because it has
 * no loading in it at all.
 *
 * PROTOTYPE. The layer's thickness and the compartments' separation are the
 * knee atlas's drawn values. **No thickness, distance or fraction here is a
 * measurement of anybody.**
 */

/** The knee atlas's own drawn values. */
export const KNEE = Object.freeze({
  /** How far the layer is drawn off the femoral condyle, as a fraction of it. */
  condylarLayer: 0.04,
  /** How far it is drawn off the tibial plateau, in the atlas's units. */
  plateauLayer: 0.09,
  /** Between the two compartments' centres. */
  compartmentSeparation: 0.88,
});

/**
 * How far a meniscus is pushed out per unit of layer lost, as a fraction of its
 * own width.
 *
 * Illustrative. The direction is geometry — a wedge between two surfaces that
 * are converging has one way to go — but the size is this repository's, and no
 * millimetre of extrusion follows from it.
 */
export const EXTRUSION_PER_LOSS = 0.55;

/** Past this much lost, the scene draws marginal bone at that rim. */
export const OSTEOPHYTE_FROM = 0.45;
/** Below this much layer, the two surfaces are drawn as touching. */
export const SURFACES_MEET_BELOW = 0.08;
/** Past this difference between the sides, the loss is confined rather than even. */
export const CONFINED_ABOVE = 0.15;

export const SIDES = Object.freeze(['none', 'medial', 'lateral']);

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const DEFAULT_CONTROLS = Object.freeze({
  side: 'medial',
  loss: 1,
  confinement: 1,
});

/**
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveKneeOsteoarthritis(controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const side = SIDES.includes(settings.side) ? settings.side : 'none';
  const present = side !== 'none';
  const loss = present ? clamp(settings.loss, 0, 1) : 0;
  const confinement = clamp(settings.confinement, 0, 1);

  const worst = present ? side : null;
  const other = side === 'medial' ? 'lateral' : side === 'lateral' ? 'medial' : null;

  const lost = { medial: 0, lateral: 0 };
  if (present) {
    lost[worst] = loss;
    lost[other] = loss * (1 - confinement);
  }

  const compartment = (id) => {
    const gone = lost[id];
    const remaining = 1 - gone;
    return {
      id,
      lost: gone,
      /** **A fraction of this model's own drawn layer. Not a joint space width.** */
      remaining,
      /** A wedge between converging surfaces has one way to go. */
      meniscalExtrusion: EXTRUSION_PER_LOSS * gone,
      osteophyte: gone > OSTEOPHYTE_FROM ? (gone - OSTEOPHYTE_FROM) / (1 - OSTEOPHYTE_FROM) : 0,
      surfacesMeet: remaining < SURFACES_MEET_BELOW,
    };
  };

  const medial = compartment('medial');
  const lateral = compartment('lateral');
  const difference = Math.abs(medial.remaining - lateral.remaining);

  return {
    controls: { ...settings, side, loss, confinement },
    present,
    side,
    loss,
    medial,
    lateral,
    compartment: (id) => (id === 'medial' ? medial : id === 'lateral' ? lateral : null),
    /** The compartment that has lost the most, or null when nothing has. */
    worst: present && loss > 0 ? (medial.lost >= lateral.lost ? medial : lateral) : null,
    /** How far apart the two sides are, as a share of the drawn layer. */
    difference,
    /**
     * Whether this is one compartment or a whole joint.
     *
     * The distinction the scene exists for: at the same amount lost, a confined
     * loss and an even one are two different pictures and not two severities.
     */
    confinedToOneCompartment: difference > CONFINED_ABOVE,
  };
}
