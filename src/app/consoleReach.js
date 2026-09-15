/**
 * How far up the screen the control bar reaches, as a CSS custom property.
 *
 * Anything that has to sit *above* the bar needs its height, and CSS cannot ask
 * for it. So the numbers were copied by hand — the first-use gesture hint's
 * `bottom` was a px constant per media query, one for the portrait phone, one
 * for the landscape phone, one for everything under 720px, each written as "the
 * console is N tall and stands M off the bottom".
 *
 * That broke twice. Once the hint printed across the slider it was meant to sit
 * above; once the control bar grew a line when the clinical-use notice stopped
 * being dropped on phones (F-115), and the hint printed across the bar again.
 * Both times `verify:ui` caught it in a browser and nothing prevented it, and
 * both times the repair was to copy a new number into three places.
 *
 * One number replaces all of them: the distance from the bottom of the viewport
 * to the top of the bar. That is the bar's height *and* its standoff *and*
 * whatever the safe-area inset did to it, measured rather than assumed, so a
 * caller writes `bottom: calc(var(--console-reach) + 12px)` and stops caring.
 *
 * ## Why a measurement and not a layout
 *
 * The obvious alternative is to stop overlaying: put the hint in normal flow
 * above the bar. It is deliberately not in flow — it is `pointer-events: none`
 * and floats over the model, so it can sit close to the thing it describes and
 * disappear on first touch without the page reflowing under the reader's
 * finger. Keeping that and measuring is the smaller change.
 *
 * ## What it does when it cannot measure
 *
 * Clears the property, so the CSS fallback in `var(--console-reach, 132px)`
 * applies. A bar that is `display: none`, a document without
 * `ResizeObserver`, a stand-in document under `node --test`: in each case the
 * page keeps a sane hard-coded distance rather than the hint flying to the
 * bottom of the screen because a missing element measured as zero.
 */

/** The fallback in the stylesheet. Exported so a test can pin them together. */
export const CONSOLE_REACH_FALLBACK_PX = 132;

/** The property everything above the bar reads. */
export const CONSOLE_REACH_PROPERTY = '--console-reach';

/**
 * Keep `--console-reach` on `ui` equal to how far the bar reaches up the page.
 *
 * @param {object} options
 * @param {HTMLElement} options.ui          the element the property is set on
 * @param {Document} [options.doc]
 * @param {Window} [options.windowRef]
 * @param {string} [options.selector]       the bar to measure
 * @returns {{measure:() => number|null, destroy:() => void}}
 */
export function watchConsoleReach({
  ui,
  doc = globalThis.document,
  windowRef = globalThis.window,
  selector = '.console',
}) {
  let observer = null;
  let watching = null;

  /** @returns {number|null} px from the bottom of the viewport to the bar's top */
  function measure() {
    const bar = doc?.querySelector?.(selector) ?? null;
    const box = bar?.getBoundingClientRect?.();
    const height = windowRef?.innerHeight;

    // A bar with no box is a bar that is not on screen — hidden, not yet laid
    // out, or absent on this surface. Zero would read as "the bar reaches
    // nowhere", which is a true statement and the wrong answer: the fallback is
    // what the page looked like before any of this existed.
    if (!box || !(box.height > 0) || !(height > 0)) {
      ui?.style?.removeProperty?.(CONSOLE_REACH_PROPERTY);
      attach(null);
      return null;
    }

    const reach = Math.max(0, Math.round(height - box.top));
    ui?.style?.setProperty?.(CONSOLE_REACH_PROPERTY, `${reach}px`);
    attach(bar);
    return reach;
  }

  /** Follow the bar that is on screen now, which is not always the first one. */
  function attach(bar) {
    if (bar === watching) return;
    if (watching) observer?.unobserve?.(watching);
    watching = bar;
    if (bar) observer?.observe?.(bar);
  }

  if (typeof windowRef?.ResizeObserver === 'function') {
    observer = new windowRef.ResizeObserver(() => measure());
  }

  // `resize` as well as the observer, and not instead of it: the bar's own box
  // can stay the same size while the viewport it sits in changes, and a phone
  // rotating does both at once.
  windowRef?.addEventListener?.('resize', measure);
  windowRef?.addEventListener?.('orientationchange', measure);
  measure();

  return {
    measure,
    destroy() {
      windowRef?.removeEventListener?.('resize', measure);
      windowRef?.removeEventListener?.('orientationchange', measure);
      observer?.disconnect?.();
      observer = null;
      watching = null;
      ui?.style?.removeProperty?.(CONSOLE_REACH_PROPERTY);
    },
  };
}
