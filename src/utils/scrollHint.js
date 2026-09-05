/**
 * Marks a scrolling region while it still has content past its bottom edge.
 *
 * A clipped scrolling panel looks exactly like a panel that ends there. On a
 * short or narrow window the inspection surface really does run past the rail,
 * and the viewport check records how many controls sit past the fold — they are
 * reachable, but nothing on screen said so. This is what says so.
 *
 * The class is toggled rather than a style written, so the cue itself stays in
 * the stylesheet with the rest of the panel's language.
 *
 * @param {HTMLElement} element a region with `overflow-y: auto`
 * @returns {() => void} stops observing
 */
export function markScrollable(element) {
  if (!element) return () => {};
  const update = () => {
    const past = element.scrollHeight - element.clientHeight - element.scrollTop;
    element.classList.toggle('has-more', past > 2);
  };
  element.addEventListener('scroll', update, { passive: true });
  // Opening a panel, switching a scene and rotating a phone all change the
  // answer without a scroll event, so the box itself is watched.
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
  observer?.observe(element);
  for (const child of element.children) observer?.observe(child);
  update();
  return () => {
    observer?.disconnect();
    element.removeEventListener('scroll', update);
  };
}

/**
 * Publishes an element's live height as a custom property.
 *
 * On a phone the display panel docks above the console, and the console is a
 * different height on every scene. Measuring it beats guessing: a constant
 * tuned against one scene is wrong on the next.
 *
 * @param {HTMLElement} element the element to measure
 * @param {HTMLElement} target the element the property is set on
 * @param {string} property the custom property name
 * @param {(box: DOMRect) => number} [pick] which measurement to publish
 * @returns {() => void} stops observing
 */
export function publishHeight(element, target, property, pick = (box) => box.height) {
  if (!element || !target) return () => {};
  const update = () => {
    target.style.setProperty(property, `${Math.round(pick(element.getBoundingClientRect()))}px`);
  };
  // A resize can change the measurement without changing the observed box, so
  // the window is watched too — where there is one.
  const view = typeof window === 'undefined' ? null : window;
  view?.addEventListener('resize', update, { passive: true });
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null;
  observer?.observe(element);
  update();
  return () => {
    observer?.disconnect();
    view?.removeEventListener('resize', update);
  };
}
