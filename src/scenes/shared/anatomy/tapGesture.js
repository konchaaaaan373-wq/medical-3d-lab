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
 * - **excursion** — the pointer never got far from that spot *while it was
 *   down*. This is what stops the out-and-back from counting as standing still.
 *
 * ## Excursion is the greatest distance from the press, not the path length
 *
 * Summing the path was the obvious way to write the second rule and it is the
 * wrong measure, because the sum grows with how *long* the press lasts rather
 * than how far it went. A finger is never still: a contact patch rolls a
 * fraction of a pixel per event, and at 120 Hz a deliberate three-quarter-second
 * press on a small structure emits enough events for that drift to total thirty
 * pixels without the finger ever leaving a two-pixel neighbourhood. Measured by
 * path length that careful tap is a drag and the reader is told nothing —
 * which is the worse of the two failures, because someone who taps and gets no
 * answer has no way to know what they did wrong, while someone who turns the
 * model and gets no new name has simply turned the model.
 *
 * The greatest distance from the press point does not accumulate: jitter stays
 * jitter however long the press lasts, and the out-and-back still reaches the
 * far end of its swing. Both bounds are therefore about *where the pointer was*
 * and neither is about time.
 */

/** How far the release may be from the press and still be the same spot. */
export const TAP_DISPLACEMENT_PX = 7;
/** How far the pointer may get from the press in between. Looser: see above. */
export const TAP_EXCURSION_PX = 16;

/**
 * Track one press and say, at the release, whether it was a tap.
 *
 * @param {{displacementPx?: number, excursionPx?: number}} [limits]
 */
export function createTapTracker({
  displacementPx = TAP_DISPLACEMENT_PX,
  excursionPx = TAP_EXCURSION_PX,
} = {}) {
  /** @type {[number, number]|null} */
  let start = null;
  let excursion = 0;

  /** @param {number} x @param {number} y */
  const distanceFromStart = (x, y) =>
    start ? Math.hypot(x - start[0], y - start[1]) : 0;

  return {
    /** A press begins. */
    begin(x, y) {
      start = [x, y];
      excursion = 0;
    },
    /**
     * The pointer moved. Ignored unless a press is open, so the same handler
     * can carry every move event the canvas sees.
     */
    move(x, y) {
      if (!start) return;
      excursion = Math.max(excursion, distanceFromStart(x, y));
    },
    /**
     * The press ended. Answers whether it was a tap, and closes it either way.
     *
     * @returns {boolean}
     */
    end(x, y) {
      if (!start) return false;
      const displaced = distanceFromStart(x, y);
      const furthest = Math.max(excursion, displaced);
      start = null;
      excursion = 0;
      return displaced <= displacementPx && furthest <= excursionPx;
    },
    /** The press was taken away — a cancel, or the browser claiming the gesture. */
    cancel() {
      start = null;
      excursion = 0;
    },
    /** Whether a press is open. */
    get pressed() {
      return start !== null;
    },
  };
}
