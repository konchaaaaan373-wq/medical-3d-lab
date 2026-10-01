/**
 * The product's icon: one state, a change, and the state it became.
 *
 * A hollow point (before), a rising curve (the change), a filled point (after)
 * on a charcoal tile. It is deliberately not an organ, an ECG trace, a cross or
 * a molecule: BYOKI MOTION is about what a condition *does* over time, and the
 * mark says "a state moved" rather than "medicine" (ADR 2026-09-30). The one
 * colour is the product's orange, which elsewhere marks an intervention or an
 * active change — the same meaning here.
 *
 * One drawing, used three ways — the browser tab (`public/favicon.svg`, the
 * same markup byte for byte; `tests/brand-icon.test.js` holds that), the
 * touch icon rendered from it, and beside the wordmark where a header has
 * room for only the mark.
 *
 * Drawn for 16 px first: two points and one stroke, no lettering, because
 * letters are the first thing a 16 px tab icon loses.
 */
export const BRAND_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<rect width="64" height="64" rx="14" fill="#1f1e1c"/>' +
  '<path d="M23 41C31 41 33 25 41 25" fill="none" stroke="#f3f0ea" stroke-width="4" stroke-linecap="round"/>' +
  '<circle cx="18" cy="41" r="6.5" fill="#1f1e1c" stroke="#f3f0ea" stroke-width="4"/>' +
  '<circle cx="46" cy="25" r="8" fill="#e0662f"/>' +
  '</svg>';

/**
 * The icon as an element, for a header.
 *
 * `aria-hidden`: it is always inside a link that carries its own name.
 *
 * @param {(tag: string, props?: object) => HTMLElement} el
 * @param {string} [className]
 */
export function brandIcon(el, className = '') {
  return el('span', { class: `brand-icon ${className}`.trim(), 'aria-hidden': 'true', html: BRAND_ICON_SVG });
}
