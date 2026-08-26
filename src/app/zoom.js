/**
 * The viewer's own zoom, as a multiplier on whatever distance the framing works
 * out for the current window and view.
 *
 * It is a multiplier rather than a camera distance because the framing is
 * recomputed on every stage change, view toggle and resize. Someone who pulled
 * back to see the aortic arch should still be looking at the arch after they
 * click the next stage, and someone who came in close on the cavity should stay
 * close — so what is remembered is the choice, not the number of centimetres it
 * happened to produce.
 */

/**
 * How far the zoom may go either side of the authored framing.
 *
 * Out far enough to hold the whole subject with the aortic arch and the
 * pulmonary side in frame; in far enough that the cavity fills the window and
 * nothing else is left in it.
 */
export const ZOOM_RANGE = [0.5, 2.4];

/** One press. Five of them roughly double or halve the distance. */
export const ZOOM_STEP = 1.18;

export const clampZoom = (zoom) => Math.min(ZOOM_RANGE[1], Math.max(ZOOM_RANGE[0], zoom));

/**
 * @param {number} zoom current multiplier
 * @param {number} direction +1 to move in, -1 to move out
 * @returns {number} the next multiplier, clamped to the range
 */
export function steppedZoom(zoom, direction) {
  return clampZoom(zoom * (direction > 0 ? 1 / ZOOM_STEP : ZOOM_STEP));
}

/**
 * A framed distance with the zoom applied, kept inside the orbit controls' own
 * limits so the camera can never end up somewhere the controls would not let
 * the viewer drag it.
 *
 * @param {number} distance the framing's distance, before zoom
 * @param {number} zoom multiplier
 * @param {{ minDistance: number, maxDistance: number }} limits
 */
export function zoomedDistance(distance, zoom, { minDistance, maxDistance }) {
  return Math.min(maxDistance, Math.max(minDistance, distance * zoom));
}
