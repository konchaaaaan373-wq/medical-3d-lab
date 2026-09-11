/**
 * A clouded lens, as a statement about **where in the light's way it sits**.
 *
 * ## An opacity has a place, and the pupil decides whether that place is in use
 *
 * Light reaches the retina through the pupil, and the pupil is an aperture that
 * changes size. So an opacity's position in the lens matters twice over: once
 * because the lens is not uniformly in the path, and again because **which part
 * of the lens is in the path depends on how open the pupil is**.
 *
 * That gives the model its one real claim, and it is a claim a single severity
 * axis cannot make: a small opacity at the centre can stand in more of the
 * light's way than a much larger one at the edge — and opening the pupil
 * reverses which of them matters.
 *
 * ## Three arrangements, not three stages
 *
 * Nuclear, cortical and posterior subcapsular are **three places an opacity
 * can be**. Nothing in this model says one becomes another, and the three are
 * not degrees of one another.
 *
 * ## The arithmetic
 *
 * ```text
 * aperture  = the pupil's radius, as a share of the lens's
 * inPath    = area(opacity ∩ aperture) / area(aperture)
 * blocked   = inPath · density
 * ```
 *
 * `blocked` is **a share of the drawn aperture**, and it is the furthest this
 * model goes. It is not a transmission, not a loss, and above all not a
 * measure of sight.
 *
 * ## What is not here
 *
 * **No vision of any kind.** No acuity, no contrast sensitivity, no glare, no
 * colour, no refraction and no index change — a clouded lens here is an area in
 * an aperture, and **nothing in this model says what anybody can see**. Nothing
 * converts `blocked` into a visual measure, and nothing should.
 *
 * **No indication for anything.** Nothing here says when a lens should be
 * treated, replaced or left alone, and nothing in it is a threshold for any of
 * those. No time, no progression and no cause: no age, no steroid, no diabetes
 * and no trauma. No light physics either — nothing is scattered, refracted or
 * absorbed in this model; a ray either crosses an opacity or does not.
 *
 * PROTOTYPE. The lens and the pupil are this repository's eye atlas's own.
 * **No radius, area or fraction here is a measurement of anybody.**
 */

/** The eye atlas's own lens and pupil, measured off `buildEyeball()`. */
export const LENS = Object.freeze({
  /** The lens's own semi-radius across the light's way. */
  radius: 0.44,
  /** The resting pupil the atlas draws, in the same units. */
  drawnPupilRadius: 0.174,
});

/**
 * Where each kind of opacity sits in the lens, as radii of the lens itself.
 *
 * `from` and `to` are the band of the lens it occupies across the light's way.
 * A nucleus is the middle; a cortical opacity is the rim; a posterior
 * subcapsular one is a small central patch at the back surface.
 *
 * **Three places, not three stages.** `depth` is where along the light's way it
 * sits, from the front of the lens at 0 to the back at 1 — carried so the scene
 * can draw it in the right part of the lens, not because anything in the model
 * depends on it.
 */
export const KINDS = Object.freeze([
  { id: 'none', from: 0, to: 0, depth: 0.5 },
  { id: 'nuclear', from: 0, to: 0.45, depth: 0.5 },
  { id: 'cortical', from: 0.55, to: 1, depth: 0.35 },
  { id: 'posterior-subcapsular', from: 0, to: 0.28, depth: 0.92 },
]);

/**
 * The two pupil sizes, as shares of the lens's own radius.
 *
 * **Two apertures, not a light level.** This model has no light in it: the
 * pupil is a hole of a chosen size, and nothing here says what made it that
 * size or what it is a response to.
 */
export const PUPILS = Object.freeze({
  narrow: 0.32,
  wide: 0.86,
});

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

/** The area of an annulus between two radii, in units of the lens's own area. */
const ring = (from, to) => Math.max(0, to * to - from * from);

export const DEFAULT_CONTROLS = Object.freeze({ kind: 'nuclear', pupil: 'narrow' });

/**
 * @param {number} density how opaque it is, 0 to 1
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveCataract(density, controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const kind = KINDS.find((entry) => entry.id === settings.kind) ?? KINDS[0];
  const aperture = PUPILS[settings.pupil] ?? PUPILS.narrow;
  const cloudiness = kind.id === 'none' ? 0 : clamp(density, 0, 1);

  // The part of the opacity's band that lies inside the aperture, over the
  // aperture's own area. Circles about one axis, so this is exact.
  const overlapFrom = Math.min(kind.from, aperture);
  const overlapTo = Math.min(kind.to, aperture);
  const inPath = aperture > 0 ? ring(overlapFrom, overlapTo) / ring(0, aperture) : 0;

  return {
    controls: { ...settings, kind: kind.id, pupil: settings.pupil },
    density: cloudiness,
    clouded: kind.id !== 'none' && cloudiness > 0,
    kind: kind.id,
    pupil: settings.pupil,
    apertureRadius: aperture,
    /** The band of the lens this opacity occupies, as radii of the lens. */
    band: Object.freeze([kind.from, kind.to]),
    /** Where along the light's way it sits. Carried for the drawing. */
    depth: kind.depth,
    /**
     * How much of the lens's own face this opacity covers, whether or not the
     * pupil is letting light through it. **The number that is not the answer**,
     * printed so a reader can see it is not.
     */
    ofTheLens: ring(kind.from, kind.to),
    /**
     * **How much of the open aperture passes through the opacity.** The model's
     * one real output, and a share of a drawn hole rather than a measure of
     * anything reaching anywhere.
     */
    inPath,
    /**
     * That share weighted by how opaque it is. **Not a transmission, not a
     * loss, and not a measure of sight.**
     */
    blocked: inPath * cloudiness,
    /**
     * **Not here.** No acuity, no contrast, no glare, no indication for any
     * treatment. The field exists so a caller cannot mistake the absence for an
     * oversight.
     */
    vision: null,
  };
}
