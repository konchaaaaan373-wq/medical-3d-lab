/**
 * The product's mark: a brain seen from above, drawn as a line.
 *
 * 3Dモデルラボ's launch is the brain and nothing else (ADR 2026-11-24), so —
 * unlike BYOKI MOTION, which refused a pictorial logo because an organ would
 * have said "medical 3D" about a product that had stopped being that — the
 * mark is the organ. Two hemispheres either side of the longitudinal fissure,
 * frontal pole up, each with a central sulcus running out from the midline and
 * three short sulci rooted in the outline. No face, no stem, no fill.
 *
 * Four candidates were drawn and compared at 16–256 px on both grounds
 * (`docs/architecture/adr-2026-11-24-brain-launch.md` §Brand). This one won
 * because it is the only one that shows both hemispheres and it reads as a
 * brain at 32 px with nothing propping it up.
 *
 * ## One drawing, two weights
 *
 * A 3-unit line on a 64 grid disappears at 16 px, so the tab icon is its own
 * simplified drawing: a 4-unit line, three scallops, inner edges on a 4-unit
 * grid so the fissure stays two whole pixels wide at 16 px. Both live here.
 * `public/favicon.svg` is `BRAND_FAVICON_SVG` byte for byte and every raster
 * (`apple-touch-icon.png`, the web-manifest icons, `favicon.ico`) is rendered
 * from these strings by `npm run icons`; `tests/brand-icon.test.js` holds that.
 *
 * The half is written once and mirrored by a transform rather than with
 * `<use href="#id">`: the mark is inlined into the page more than once, and a
 * repeated `id` is a duplicate id.
 */

const HALF_FULL =
  '<path d="M28.5 14.5C28.5 10.5 25.5 8.5 22.5 9C19 9.5 16.5 12 16 15.5C12 17 9.5 21 10.5 25.5C7.5 29 7 34.5 9.5 38.5C8.5 43 11 47.5 15 49.5C16.5 53.5 20.5 55.5 24 55C27 54.5 28.5 52.5 28.5 49.5Z"/>' +
  '<path d="M16 15.5C17.5 18.5 20.5 19.5 23 18.5"/>' +
  '<path d="M9.5 38.5C12.5 37 15 38.5 17.5 40.5"/>' +
  '<path d="M15 49.5C16.5 47 19.5 46.5 22.5 47"/>' +
  '<path d="M28.5 33.5C25 34 23.5 30.5 20.5 29.5C18 28.5 16.5 26.5 16.5 24.5"/>';

const HALF_SMALL =
  '<path d="M26 17C26 8 14 7 13 17C5.5 18.5 4.5 30 12 33C5.5 37 6.5 48 14 48.5C15 57 26 56 26 48Z"/>' +
  '<path d="M13 17C14.5 19.5 16.5 20.5 19 20.5"/>' +
  '<path d="M12 33C15 33.5 17.5 32.5 19.5 30.5"/>' +
  '<path d="M14 48.5C15 46.5 17 45.5 19 45.5"/>';

const both = (half) => `<g>${half}</g><g transform="matrix(-1 0 0 1 64 0)">${half}</g>`;

/** Brand pink, and the deeper pink a thin line needs on a pale ground. */
export const BRAND_PINK = '#E879A6';
export const BRAND_PINK_DEEP = '#C94C80';
export const BRAND_PINK_PALE = '#FCE7F0';

/** The header mark. Takes its colour from the element (`currentColor`). */
export const BRAND_ICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" ' +
  'stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
  both(HALF_FULL) +
  '</svg>';

/** The tab icon: the small drawing, deep pink on a light tab, brand pink on a dark one. */
export const BRAND_FAVICON_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  `<style>g{stroke:${BRAND_PINK_DEEP}}@media (prefers-color-scheme:dark){g{stroke:${BRAND_PINK}}}</style>` +
  '<g fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">' +
  both(HALF_SMALL) +
  '</g></svg>';

/**
 * A square icon on a solid ground, for surfaces that crop (home-screen icons).
 * The mark stays inside the central 80% so a circular mask cannot clip it.
 *
 * @param {{size?: number, small?: boolean}} [options]
 */
export function brandTileSvg({ size = 512, small = false } = {}) {
  const scale = (size * 0.66) / 64;
  const offset = (size - 64 * scale) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    `<rect width="${size}" height="${size}" fill="${BRAND_PINK_PALE}"/>` +
    `<g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="${BRAND_PINK_DEEP}" ` +
    `stroke-width="${small ? 4 : 3}" stroke-linecap="round" stroke-linejoin="round">` +
    both(small ? HALF_SMALL : HALF_FULL) +
    '</g></svg>'
  );
}

export function brandIcon(el, className = '') {
  return el('span', { class: `brand-icon ${className}`.trim(), 'aria-hidden': 'true', html: BRAND_ICON_SVG });
}
