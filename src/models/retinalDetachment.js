/**
 * A separated retina, as a statement about **where, not how much**.
 *
 * ## The two facts that do not follow from each other
 *
 * A detachment has an extent and it has a position, and the question everybody
 * asks about it — is the macula in it — is answered by the position. The macula
 * sits at the back of the eye on the axis; the periphery is some eighty degrees
 * away from it. So **a small separation can include the macula and a large one
 * can miss it entirely**, and an area is not an answer.
 *
 * That is the whole model: a cap on a sphere, and whether one named point on
 * that sphere falls inside it.
 *
 * ## macula-on and macula-off are two pictures
 *
 * They are reported as a state with two values, and they are **a scenario**:
 * which one a given eye is in depends on where the separation is, not on how
 * far along anything is. Nothing here says one becomes the other, and nothing
 * here says what either means for anybody.
 *
 * ## The arithmetic
 *
 * ```text
 * halfAngle = extent · MAX_ARC
 * separated = angle(macula, origin) < halfAngle
 * area      = (1 − cos halfAngle) / 2      ← the cap, as a share of the sphere
 * lift      = extent · MAX_LIFT            ← a drawn height, not a measurement
 * ```
 *
 * ## What is not here
 *
 * **No vision of any kind.** No acuity, no field, no contrast, no distortion and
 * no perception: a retina separated here is a surface that has moved, and
 * **nothing in this model says what anybody can see**. No prognosis: nothing
 * says what recovers, how much, or whether the macula being in it changes that
 * — which is the single most common thing said about this subject and the thing
 * this model most firmly does not compute.
 *
 * No cause and no kind: no tear, no traction, no exudate, no myopia, no trauma
 * and no distinction between the mechanisms a detachment can have. No time and
 * no progression — the axis is how far the separation reaches, not how long it
 * has been reaching. No fluid dynamics, no gravity and no surgery.
 *
 * PROTOTYPE. The globe, its coats and the position of the macula are this
 * repository's eye atlas's own. **No angle, area or height here is a
 * measurement of anybody.**
 */

/** The eye atlas's own globe and coats, measured off `buildEyeball()`. */
export const GLOBE = Object.freeze({
  radius: 1,
  /** Where the retina's two surfaces sit, as radii. */
  retina: Object.freeze([0.912, 0.888]),
  /** The layer it separates from. */
  choroid: Object.freeze([0.944, 0.918]),
});

/**
 * How far each origin is from the macula, in degrees, measured off the atlas.
 *
 * The number that makes the scene's point: the peripheral origins are all
 * around eighty degrees away, so a separation starting at any of them has a
 * long way to go before the macula is in it — while one starting behind is
 * already there.
 */
export const ORIGINS = Object.freeze([
  { id: 'none', toMacula: null },
  { id: 'superior', toMacula: 81.5 },
  { id: 'temporal', toMacula: 77.6 },
  { id: 'inferior', toMacula: 81.5 },
  { id: 'posterior', toMacula: 12 },
]);

/**
 * The widest the separation is drawn, in degrees of arc from its origin.
 *
 * A calibration: chosen so that a peripheral separation can reach the macula
 * before the top of the axis — otherwise the scene could never show the thing
 * it exists to show — while leaving a long span in which it plainly has not.
 */
export const MAX_ARC = 100;

/**
 * How far the retina is drawn lifted off the layer behind it, in globe radii.
 *
 * **Illustrative, and much larger than the gap the atlas draws between the two
 * coats.** A separation drawn at the atlas's own coat spacing is a few pixels
 * and invisible; this is the height at which a reader can see that one surface
 * has left another. It is not a measurement of anything.
 */
export const MAX_LIFT = 0.11;

const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const DEFAULT_CONTROLS = Object.freeze({ origin: 'superior' });

/**
 * @param {number} extent how far the separation has spread, 0 to 1
 * @param {Partial<typeof DEFAULT_CONTROLS>} [controls]
 */
export function solveRetinalDetachment(extent, controls = {}) {
  const settings = { ...DEFAULT_CONTROLS, ...controls };
  const origin = ORIGINS.find((entry) => entry.id === settings.origin) ?? ORIGINS[0];
  const spread = origin.toMacula === null ? 0 : clamp(extent, 0, 1);

  const halfAngle = spread * MAX_ARC;
  const radians = (halfAngle * Math.PI) / 180;
  // A spherical cap's area, as a share of the sphere. Geometry, not a reading.
  const areaFraction = spread > 0 ? (1 - Math.cos(radians)) / 2 : 0;

  const separated = origin.toMacula !== null && spread > 0;
  const maculaInside = separated && halfAngle > origin.toMacula;

  return {
    controls: { ...settings, origin: origin.id },
    extent: spread,
    separated,
    /** Where it started, by name. */
    origin: origin.id,
    /** How far the separation reaches from there, in degrees. */
    halfAngle,
    /** How far the macula is from where it started, in degrees. */
    toMacula: origin.toMacula,
    /**
     * The detached cap, as a share of **the drawn globe**.
     *
     * Not a share of the retina: the retina stops short of the front of the eye,
     * so a cap's share of the sphere is smaller than its share of the retina by
     * a factor this model has no basis for. **Not an area anybody measured.**
     */
    areaFraction,
    /**
     * **The question, answered by position rather than by size.** `off` means
     * the macula is inside the separation and `on` means it is not.
     *
     * A scenario and not a stage: nothing here says one becomes the other, and
     * nothing here says what either means for anybody's sight.
     */
    macula: separated ? (maculaInside ? 'off' : 'on') : 'on',
    maculaInside,
    /** How much further the separation would have to reach, in degrees. `0` once it is in. */
    degreesShort: origin.toMacula === null ? null : Math.max(0, origin.toMacula - halfAngle),
    /**
     * How far the retina is drawn off the layer behind it. **A drawn height**
     * chosen to be visible, not a measurement.
     */
    lift: spread * MAX_LIFT,
    /**
     * **Not here.** No acuity, no field, no prognosis. The field exists so a
     * caller reading the output cannot mistake the absence for an oversight.
     */
    vision: null,
  };
}
