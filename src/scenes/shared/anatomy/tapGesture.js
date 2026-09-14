/**
 * Telling a tap apart from the drag that turns the organ.
 *
 * Picking used to ask one question — how far is the release from the press? —
 * and that question has a blind spot a finger walks straight into. Turning the
 * model to compare its two sides is one press that goes out and comes back, and
 * it ends where it started, so the *displacement* is zero and the release was
 * read as a tap: the reader let go and was told the name of whatever happened
 * to be under their thumb. On a mouse the out-and-back is rare. On a phone,
 * where the model is turned by swiping across it and swiping back, it is the
 * normal way to look at something.
 *
 * So the gesture is measured two ways, and a tap has to satisfy both:
 *
 * - **displacement** — the release is on the spot the press started. This is
 *   what stops a one-way drag from selecting whatever it lands on.
 * - **travel** — the pointer never went far in between. This is what stops the
 *   out-and-back from counting as standing still.
 *
 * The travel bound is deliberately much looser than the displacement one. A
 * real tap is not perfectly still — a finger rolls a pixel or two per event
 * while it is down, and a bound as tight as the displacement one would start
 * throwing away taps, which is the worse failure of the two: a reader who taps
 * and is told nothing has no way to understand what they did wrong, while a
 * reader who turns the model and gets no new name has simply turned the model.
 */

/** How far the release may be from the press and still be the same spot. */
export const TAP_DISPLACEMENT_PX = 7;
/** How far the pointer may travel in between. Loose: taps are not still. */
export const TAP_TRAVEL_PX = 24;

/**
 * Track one press and say, at the release, whether it was a tap.
 *
 * @param {{displacementPx?: number, travelPx?: number}} [limits]
 */
export function createTapTracker({
  displacementPx = TAP_DISPLACEMENT_PX,
  travelPx = TAP_TRAVEL_PX,
} = {}) {
  /** @type {[number, number]|null} */
  let start = null;
  /** @type {[number, number]|null} */
  let last = null;
  let travel = 0;

  return {
    /** A press begins. */
    begin(x, y) {
      start = [x, y];
      last = [x, y];
      travel = 0;
    },
    /**
     * The pointer moved. Ignored unless a press is open, so the same handler
     * can carry every move event the canvas sees.
     */
    move(x, y) {
      if (!start || !last) return;
      travel += Math.hypot(x - last[0], y - last[1]);
      last = [x, y];
    },
    /**
     * The press ended. Answers whether it was a tap, and closes it either way.
     *
     * @returns {boolean}
     */
    end(x, y) {
      if (!start || !last) return false;
      const displaced = Math.hypot(x - start[0], y - start[1]);
      const travelled = travel + Math.hypot(x - last[0], y - last[1]);
      start = null;
      last = null;
      travel = 0;
      return displaced <= displacementPx && travelled <= travelPx;
    },
    /** The press was taken away — a cancel, or the pointer leaving. */
    cancel() {
      start = null;
      last = null;
      travel = 0;
    },
    /** Whether a press is open. */
    get pressed() {
      return start !== null;
    },
  };
}
