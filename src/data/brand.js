/**
 * The product's name and the few sentences that say what it is.
 *
 * One place, because the name used to be typed into twenty-odd files — the
 * header, the scene header, the tab title of every surface, the crawlable
 * pages, the JSON-LD, the failure screens, the diagnostic text a reader copies
 * to support, the feedback e-mail's subject, the printed patient handout — and
 * a rename is exactly the change that finds every place a string was copied
 * instead of read. `tests/brand.test.js` holds the other half: no public
 * surface's source spells the old name.
 *
 * BYOKI MOTION is the product; Neco Inc. operates it. The operator is named on
 * the About page and in the footer, and nowhere a reader meets the product
 * first (ADR 2026-09-30).
 *
 * Pure data: `scripts/site-metadata.js` reads it at build time and
 * `node --test` reads it without a DOM.
 */
export const BRAND = Object.freeze({
  name: 'BYOKI MOTION',
  /** The two words, for a wordmark that sets them differently. */
  words: Object.freeze(['BYOKI', 'MOTION']),
  tagline: Object.freeze({
    ja: '病態を、動かして理解する。',
    en: 'Understand pathophysiology by moving it.',
  }),
  /** The one-line English description. Also the crawler's summary of the site. */
  description: 'Interactive models for understanding pathophysiology.',
  descriptionJa: '病態生理の因果関係を、操作と動きで理解するインタラクティブ医学モデル集。',
  operator: Object.freeze({
    en: 'Operated by Neco Inc.',
    ja: '運営：株式会社Neco',
  }),
});

/** `<page> — BYOKI MOTION`, the one shape every tab title takes. */
export const pageTitle = (page) => (page ? `${page} — ${BRAND.name}` : `${BRAND.name} — ${BRAND.tagline.ja}`);
