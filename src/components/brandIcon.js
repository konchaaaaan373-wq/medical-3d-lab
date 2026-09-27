/**
 * The product's icon: a cube, three faces shaded, on a dark tile.
 *
 * One drawing, used three ways — the browser tab (`public/favicon.svg`, the
 * same markup byte for byte; `tests/brand-icon.test.js` holds that), the
 * touch icon rendered from it, and the header of every screen. It replaced a
 * typed `M/3` on the reading pages and a `3D` tile on the models, which were
 * two different marks for one product, and a cyan dot in the tab that was a
 * placeholder.
 *
 * Drawn for 16 px first: three flat faces and no lettering, because letters
 * are the first thing a 16 px tab icon loses.
 */
export const BRAND_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<rect width="64" height="64" rx="15" fill="#0b1320"/>' +
  '<path d="M32 11 51 21.5 32 32 13 21.5Z" fill="#38e1ef"/>' +
  '<path d="M13 21.5 32 32v21.5L13 43Z" fill="#1d6f86"/>' +
  '<path d="M51 21.5 32 32v21.5L51 43Z" fill="#e8f1fb"/>' +
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
