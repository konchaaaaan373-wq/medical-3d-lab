/**
 * Tissue under a load, as a statement about **where the worst of it is**.
 *
 * ## The picture this model exists to refuse
 *
 * The intuitive account of a pressure injury runs downwards: the skin gives
 * first, then the layer under it, then the one under that. It is a tidy story
 * and it is the wrong shape, because it makes depth a matter of *how long* and
 * *how bad* rather than of where the tissue actually is.
 *
 * What this model computes instead is a **profile of deformation against
 * depth**, and its one claim is that the profile's peak is not always at the
 * surface. Tissue trapped between a load and a bone underneath is deformed most
 * **at that interface**, which is deep — so the most deformed tissue can be at
 * the bottom of the block while the skin at the top is barely changed.
 *
 * That arrangement is what makes an injury that begins deep possible at all,
 * and a model whose deformation only ever decreased with depth could not
 * represent one.
 *
 * ## Two arrangements, and they are not two amounts
 *
 * The same load over a bony prominence and over soft tissue give **different
 * shapes**, not different sizes. Over soft tissue the profile decays downwards;
 * over bone it rises again to a second, larger peak at the interface. Nothing
 * in this model says one becomes the other.
 *
 * ## The arithmetic
 *
 * ```text
 * fromAbove = load · e^(−(surface − y) / REACH)      ← pressed from the top
 * fromBelow = load · TRAPPED · e^(−(y − bone) / REACH)   ← only over a prominence
 * deform(y) = fromAbove + fromBelow
 * ```
 *
 * Both terms are **shapes chosen to be the two shapes**, not a mechanics. There
 * is no stress, no strain, no modulus, no perfusion and no time in this model:
 * `deform` is an unscaled number saying how hard this depth is being squeezed
 * relative to the others in the same picture, reported as a share of the
 * profile's own peak — and nothing converts it into a tissue that has died.
 *
 * ## What is not here
 *
 * **No clinical stage.** This model does not stage a pressure injury and cannot
 * be made to: staging rests on what tissue is visible and what has been lost,
 * and this model has neither. **No output here is a stage, a grade or a
 * threshold**, and a geometry could not be one.
 *
 * No time, no duration and no relief — the axis is how hard it is loaded, not
 * how long it has been. No blood, no perfusion, no ischaemia, no inflammation
 * and no repair. No damage, no death and no depth of loss: **tissue deforms in
 * this model and nothing else happens to it.** No temperature, no moisture, no
 * friction and no continence. No person, no position and no surface.
 *
 * PROTOTYPE. The layer depths are this repository's skin atlas's own display
 * values, which that atlas declares are **deliberately not to scale**. **No
 * depth, fraction or profile here is a measurement of anybody.**
 */

/**
 * The depths the skin atlas draws, and the one this model adds.
 *
 * `surface` down to `subcutisFloor` are `LAYER_DISPLAY_THICKNESS` in
 * `src/scenes/integumentary/organs/skinBlock.js`, which says of itself that the
 * epidermis is drawn some twenty times too thick because a line cannot carry
 * what a reader needs to see in it. **Nothing derived from them is a
 * thickness.** `bone` is the block's own floor, where the scene puts the apex of a
 * prominence it adds — because the atlas is a specimen of skin and has no
 * skeleton in it, and something has to be under the load for the claim to have
 * anything to rest on.
 */
export const DEPTHS = Object.freeze({
  surface: 1.0,
  epidermisFloor: 0.78,
  dermisFloor: 0.06,
  subcutisFloor: -1.1,
  bone: -1.1,
});

/** The layers the model reports on, from the top down. */
export const LAYERS = Object.freeze([
  { id: 'epidermis', at: 0.89 },
  { id: 'dermis', at: 0.42 },
  { id: 'subcutis', at: -0.5 },
  { id: 'deep-interface', at: -1.05 },
]);

/**
 * How far a squeeze reaches from the surface it is applied at, in the atlas's
 * own units.
 *
 * A calibration, and it sets the shape of the whole profile: too short and
 * nothing at the top reaches the bottom, too long and the two peaks merge into
 * one flat block. Chosen so both shapes are legible across the range.
 */
export const REACH = 0.85;

/**
 * How much harder the tissue caught against a prominence is squeezed than the
 * tissue directly under the load.
 *
 * **The number the claim rests on**, and a chosen one: above one, the deep peak
 * is the larger and an injury that begins deep is representable; at or below
 * one the model could only ever draw the tidy downward story. It is not a ratio
 * anybody measured, and `physiology: over a prominence the worst of it is deep`
 * fixes the consequence rather than the value.
 */
export const TRAPPED = 1.45;

/** Above this much of the peak, a layer is reported as among the worst-off. */
export const WORST_WITHIN = 0.92;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

/** What lies under the load. Two arrangements, not two amounts. */
export const GROUNDS = Object.freeze([
  { id: 'none', overBone: false, loaded: false },
  { id: 'soft-tissue', overBone: false, loaded: true },
  { id: 'bony-prominence', overBone: true, loaded: true },
]);

export const DEFAULT_CONTROLS = Object.freeze({ ground: 'bony-prominence' });

/**
 * @param {number} load how hard the surface is being pressed, 0 to 1
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solvePressureInjury(load, controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const ground = GROUNDS.find((entry) => entry.id === settings.ground) ?? GROUNDS[0];
  const pressing = ground.loaded ? clamp(load, 0, 1) : 0;

  const deformAt = (y) => {
    const fromAbove = pressing * Math.exp(-(DEPTHS.surface - y) / REACH);
    const fromBelow = ground.overBone
      ? pressing * TRAPPED * Math.exp(-(y - DEPTHS.bone) / REACH)
      : 0;
    // Deliberately not clamped: a ceiling at one flattens both ends of the
    // profile into the same value, and a profile whose peak cannot exceed its
    // surface cannot make this model's claim. Layers are reported against the
    // profile's own peak instead.
    return fromAbove + fromBelow;
  };

  const layers = LAYERS.map((layer) => ({
    id: layer.id,
    at: layer.at,
    /** How hard this depth is being squeezed. **Not a stress and not a strain.** */
    deform: deformAt(layer.at),
  }));

  const peak = layers.reduce((most, layer) => (layer.deform > most.deform ? layer : most), layers[0]);
  const surface = layers[0];
  // Each layer against the profile's own peak, so the read-out compares depths
  // within one picture rather than offering a number that looks absolute.
  for (const layer of layers) layer.share = peak.deform > 0 ? layer.deform / peak.deform : 0;

  return {
    controls: { ...settings, ground: ground.id },
    load: pressing,
    loaded: ground.loaded && pressing > 0,
    ground: ground.id,
    overBone: ground.overBone,
    layers,
    layer: (id) => layers.find((entry) => entry.id === id) ?? null,
    /**
     * **Which depth is deformed most.** The model's one real output, and the
     * reason it exists: over a prominence this is not the surface.
     */
    worstAt: pressing > 0 ? peak.id : null,
    worstDeform: pressing > 0 ? peak.deform : 0,
    /** Every layer within a little of the peak, so a flat profile is not read as one place. */
    worstLayers: pressing > 0 ? layers.filter((l) => l.deform >= peak.deform * WORST_WITHIN).map((l) => l.id) : [],
    /**
     * How much more deformed the worst depth is than the skin at the top. Above
     * one, the picture is not the tidy downward one.
     */
    againstTheSurface: surface.deform > 0 ? peak.deform / surface.deform : 1,
    /**
     * **Not here.** No stage, no grade, no tissue loss, no damage of any kind.
     * The field exists so a caller cannot mistake the absence for an oversight.
     */
    stage: null,
  };
}
