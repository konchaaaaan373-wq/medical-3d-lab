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
 * 3Dモデルラボ is the product; Neco Inc. operates it. The operator is named on
 * the About page and in the footer, and nowhere a reader meets the product
 * first. The name before this one was BYOKI MOTION (ADR 2026-09-30); the launch
 * narrowed the product to the brain and renamed it (ADR 2026-11-24).
 *
 * Pure data: `scripts/site-metadata.js` reads it at build time and
 * `node --test` reads it without a DOM.
 */
export const BRAND = Object.freeze({
  name: '3Dモデルラボ',
  /** For a surface that is English throughout (a crawler's summary, an `alt`). */
  nameEn: '3D Model Lab',
  /** The two parts, for a wordmark that sets them differently. They join with no space. */
  words: Object.freeze(['3D', 'モデルラボ']),
  tagline: Object.freeze({
    ja: '脳を、立体的に理解する。',
    en: 'Understand the brain in three dimensions.',
  }),
  /** The one-line English description. Also the crawler's summary of the site. */
  description: 'Brain anatomy, neural circuits and higher brain function, learned by linking 3D models with MRI.',
  descriptionJa: '脳の解剖、神経回路、高次脳機能を、3DモデルとMRIでつなげて学ぶ。',
  operator: Object.freeze({
    en: 'Operated by Neco Inc.',
    ja: '運営：株式会社Neco',
  }),
});

/** `<page> — 3Dモデルラボ`, the one shape every tab title takes. */
export const pageTitle = (page) => (page ? `${page} — ${BRAND.name}` : `${BRAND.name} — ${BRAND.tagline.ja}`);
