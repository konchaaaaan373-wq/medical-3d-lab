/**
 * Crawlable metadata for a hash-routed application.
 *
 * The app addresses everything through `#/<slug>`, and that is a deliberate
 * architectural decision (`CLAUDE.md`: routing is one hash). A crawler,
 * however, never sees a fragment: to a search engine or a link preview every
 * scene in this catalogue is the same URL with the same title.
 *
 * So the build emits one small static page per public scene at
 * `/s/<slug>/`, carrying that scene's title, description, maturity and review
 * state as real HTML, plus the metadata a preview needs — and a link into the
 * interactive model. The pages are generated from `src/catalog/`, so adding a
 * scene still means one manifest entry and nothing else, exactly as before.
 *
 * These pages are also the most robust WebGL-independent surface in the
 * product: no bundle, no renderer, no JavaScript at all is required to read
 * what a model is about and what it does not claim.
 *
 * Pure string building — no `fs`, no Vite — so `node --test` can assert on the
 * output the way it asserts on the catalogue.
 */

export const SITE_NAME = 'Medical 3D Lab';
export const SITE_TAGLINE_EN = 'Interactive 3D for understanding physiology and disease';
export const SITE_TAGLINE_JA = '見えない病態生理を、3D で動かして理解する';

/** Where a generated scene page lives, relative to the site root. */
export const scenePagePath = (scene) => `s/${scene.slug}/index.html`;

/** Its directory URL — the canonical form, so the page has one address. */
export const scenePageUrl = (scene) => `s/${scene.slug}/`;

/** How many `../` a generated page needs to reach the site root. */
const TO_ROOT = '../../';

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** @param {unknown} value */
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPES[char]);

/**
 * Join a base URL and a path without producing `//` or losing a subpath.
 *
 * @param {string} base
 * @param {string} path
 */
export function absoluteUrl(base, path = '') {
  if (!base) return '';
  const root = base.endsWith('/') ? base : `${base}/`;
  return `${root}${String(path).replace(/^\//, '')}`;
}

/**
 * Everything a crawler, a link preview and a sitemap need about one scene.
 *
 * `baseUrl` may be empty. Canonical and Open Graph URLs are then omitted
 * rather than guessed: a wrong canonical is worse than no canonical, because
 * it tells a search engine that the real page is somewhere that does not
 * exist.
 *
 * @param {object} scene a catalogue entry
 * @param {{ baseUrl?: string, review?: object|null, socialCards?: Set<string> }} [options]
 */
export function sceneMetadata(scene, { baseUrl = '', review = null, socialCards = new Set() } = {}) {
  const canonical = baseUrl ? absoluteUrl(baseUrl, scenePageUrl(scene)) : '';
  const appUrl = baseUrl ? absoluteUrl(baseUrl, `#/${scene.slug}`) : '';
  const hasCard = socialCards.has(scene.slug);

  return {
    id: scene.id,
    slug: scene.slug,
    canonical,
    appUrl,
    // Japanese first: it is the product's language, not a translation.
    title: `${scene.titleJa} / ${scene.titleEn} — ${SITE_NAME}`,
    description: `${scene.descriptionJa} ${scene.description}`,
    status: scene.status,
    reviewStatus: review?.reviewStatus ?? 'pending',
    reviewedAt: review?.reviewedAt ?? null,
    // Only a raster card is advertised. A preview that cannot render the image
    // shows a broken card, which is worse than showing none.
    image: hasCard && baseUrl ? absoluteUrl(baseUrl, `social/${scene.slug}.png`) : '',
    keywords: [scene.system, scene.organ, scene.disease, ...(scene.tags ?? [])].filter(Boolean),
  };
}

/**
 * JSON-LD for one scene.
 *
 * Typed as a `LearningResource`, not a `MedicalWebPage`: the product is an
 * educational conceptual model and must not describe itself to a search engine
 * as clinical reference material. `about` is a plain `Thing` for the same
 * reason — naming a `MedicalCondition` would assert a clinical authority the
 * model card explicitly declines.
 *
 * @param {ReturnType<typeof sceneMetadata>} meta
 * @param {object} scene
 */
export function sceneJsonLd(meta, scene) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name: `${scene.titleJa} / ${scene.titleEn}`,
    description: meta.description,
    inLanguage: ['ja', 'en'],
    learningResourceType: 'Interactive 3D model',
    educationalUse: 'instruction',
    isAccessibleForFree: true,
    keywords: meta.keywords.join(', '),
    creativeWorkStatus: scene.status,
    disclaimer:
      'Educational conceptual model. Not patient-specific diagnosis, treatment or a clinical decision tool.',
  };
  if (meta.canonical) data.url = meta.canonical;
  if (meta.image) data.image = meta.image;
  if (scene.disease) data.about = { '@type': 'Thing', name: scene.disease };
  return data;
}

/**
 * Serialise JSON-LD for embedding in a `<script>` element.
 *
 * `JSON.stringify` alone is not enough: a `</script>` anywhere in the data —
 * inside a scene title, say — terminates the element early and the rest of the
 * object is parsed as markup. Escaping the three characters that can start a
 * tag keeps the JSON valid and the element intact.
 *
 * @param {object} data
 */
export const jsonLdScript = (data) =>
  JSON.stringify(data, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

const metaTag = (attr, name, content) =>
  content ? `    <meta ${attr}="${escapeHtml(name)}" content="${escapeHtml(content)}" />` : null;

/**
 * The `<head>` lines shared by the site shell and every generated page.
 *
 * @param {{title:string, description:string, canonical?:string, image?:string, type?:string}} page
 */
export function headTags({ title, description, canonical = '', image = '', type = 'website' }) {
  return [
    `    <title>${escapeHtml(title)}</title>`,
    metaTag('name', 'description', description),
    canonical ? `    <link rel="canonical" href="${escapeHtml(canonical)}" />` : null,
    metaTag('property', 'og:site_name', SITE_NAME),
    metaTag('property', 'og:type', type),
    metaTag('property', 'og:title', title),
    metaTag('property', 'og:description', description),
    metaTag('property', 'og:url', canonical),
    metaTag('property', 'og:image', image),
    metaTag('property', 'og:locale', 'ja_JP'),
    metaTag('property', 'og:locale:alternate', 'en_US'),
    metaTag('name', 'twitter:card', image ? 'summary_large_image' : 'summary'),
    metaTag('name', 'twitter:title', title),
    metaTag('name', 'twitter:description', description),
    metaTag('name', 'twitter:image', image),
  ].filter(Boolean);
}

const STATUS_COPY = {
  prototype: { en: 'Prototype — shape sketched, motion provisional, no numbers claimed', ja: 'プロトタイプ — 形は概略、動きは仮。数値は出しません' },
  alpha: { en: 'Alpha — model layer, evidence dossier, model card and scope panel in place', ja: 'アルファ — モデル層・証拠・モデルカード・範囲パネルを保有' },
  reviewed: { en: 'Reviewed — a clinical reviewer has signed a specific commit', ja: 'レビュー済 — 特定コミットに臨床レビュー記録があります' },
  production: { en: 'Production — the reference standard for this catalogue', ja: 'プロダクション — このカタログの基準実装' },
};

/**
 * One entry per state in `CLINICAL_REVIEW_STATUSES`, and a test that says so.
 *
 * `stale` was missing, and the fallback to `pending` made three published
 * pages contradict themselves: COPD, asthma and portal hypertension each
 * carried "Reviewed — a clinical reviewer has signed a specific commit"
 * alongside "Clinical review pending". A stale review is neither of those. It
 * is a real historical sign-off whose scope has since changed, and saying so
 * is the entire reason the registry distinguishes the two.
 */
const REVIEW_COPY = {
  reviewed: { en: 'Versioned clinical review', ja: '臨床レビュー記録済み' },
  stale: { en: 'Re-review required — the model changed after its review', ja: '再レビュー必要 — レビュー後にモデルが変更されています' },
  pending: { en: 'Clinical review pending', ja: '臨床レビュー待ち' },
  'legacy-unversioned': { en: 'Legacy production — sign-off unversioned', ja: '旧Production — 現行形式の署名なし' },
};

/**
 * One static page for one scene.
 *
 * Deliberately self-contained: inline styles, no bundle, no fonts, no
 * JavaScript required to read it. The link into the model is relative, so the
 * page works whether the site is served from a domain root or a subpath.
 *
 * @param {object} scene
 * @param {{ baseUrl?: string, review?: object|null, socialCards?: Set<string> }} [options]
 */
export function renderScenePage(scene, options = {}) {
  const meta = sceneMetadata(scene, options);
  const status = STATUS_COPY[scene.status] ?? STATUS_COPY.prototype;
  const review = REVIEW_COPY[meta.reviewStatus] ?? REVIEW_COPY.pending;
  const jsonLd = jsonLdScript(sceneJsonLd(meta, scene));

  return `<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
${headTags({ ...meta, type: 'article' }).join('\n')}
    <script type="application/ld+json">
${jsonLd}
    </script>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; padding: 6vh 5vw; background: #04060c; color: #eaf2ff;
        font-family: system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', sans-serif;
        line-height: 1.7; }
      main { max-width: 720px; margin: 0 auto; }
      h1 { font-size: clamp(26px, 5vw, 40px); line-height: 1.15; margin: 0 0 6px; }
      h1 small { display: block; font-size: 0.5em; font-weight: 500; color: #a7b6ce; margin-top: 8px; }
      p { color: #c9d6ea; }
      .badges { display: flex; flex-wrap: wrap; gap: 8px; margin: 18px 0 24px; }
      .badge { border: 1px solid rgba(140,175,225,0.22); border-radius: 999px;
        padding: 5px 12px; font-size: 12px; color: #a7b6ce; }
      .open { display: inline-block; margin: 8px 0 28px; padding: 12px 22px; border-radius: 12px;
        border: 1px solid rgba(56,225,239,0.5); background: rgba(56,225,239,0.12);
        color: #eaf2ff; text-decoration: none; font-weight: 650; }
      nav a { color: #38e1ef; margin-right: 16px; font-size: 13px; }
      footer { margin-top: 36px; padding-top: 18px; border-top: 1px solid rgba(140,175,225,0.16);
        color: #6b7c95; font-size: 12px; }
    </style>
  </head>
  <body>
    <main>
      <h1>${escapeHtml(scene.titleJa)}<small>${escapeHtml(scene.titleEn)}</small></h1>
      <div class="badges">
        <span class="badge">${escapeHtml(status.ja)}</span>
        <span class="badge">${escapeHtml(review.ja)}</span>
      </div>
      <p>${escapeHtml(scene.descriptionJa)}</p>
      <p lang="en">${escapeHtml(scene.description)}</p>
      <a class="open" href="${TO_ROOT}#/${escapeHtml(scene.slug)}">3D モデルを開く / Open the interactive model</a>
      <p lang="en"><strong>${escapeHtml(status.en)}.</strong> ${escapeHtml(review.en)}.</p>
      <nav>
        <a href="${TO_ROOT}#/organs">すべてのモデル / All models</a>
        <a href="${TO_ROOT}#/trust">医学的信頼性 / Model trust</a>
        <a href="${TO_ROOT}#/">${escapeHtml(SITE_NAME)}</a>
      </nav>
      <footer>
        教育目的の概念モデルです。個別患者の診断・治療を行うものではありません。<br />
        <span lang="en">Educational conceptual model — not patient-specific diagnosis or treatment.</span>
      </footer>
    </main>
  </body>
</html>
`;
}

/**
 * `sitemap.xml`.
 *
 * Returns an empty string without a base URL: a sitemap of relative paths is
 * not a sitemap, and emitting one would be worse than emitting none.
 *
 * @param {object[]} scenes public scenes only — the Lab is not for crawlers
 * @param {{ baseUrl?: string, lastModified?: string, extraPaths?: string[] }} [options]
 */
export function buildSitemap(scenes, { baseUrl = '', lastModified = '', extraPaths = [] } = {}) {
  if (!baseUrl) return '';
  const today = lastModified || new Date().toISOString().slice(0, 10);

  // The application root, the shell surfaces, then one entry per scene page.
  // Priority says what a first-time visitor should land on, not what we like.
  const entries = [
    { path: '', priority: '1.0', changefreq: 'weekly' },
    ...extraPaths.map((path) => ({ path, priority: '0.5', changefreq: 'monthly' })),
    ...scenes.map((scene) => ({
      path: scenePageUrl(scene),
      priority: scene.status === 'production' || scene.status === 'reviewed' ? '0.8' : '0.6',
      changefreq: 'monthly',
    })),
  ];

  const lines = entries.map(
    ({ path, priority, changefreq }) => `  <url>
    <loc>${escapeHtml(absoluteUrl(baseUrl, path))}</loc>
    <lastmod>${escapeHtml(today)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${lines.join('\n')}
</urlset>
`;
}

/**
 * `robots.txt`.
 *
 * There is no `Disallow` for the Lab, and that is not an oversight: robots.txt
 * matches paths, and a crawler is never sent a fragment, so `#/lab` is not a
 * URL a rule could apply to. Experimental work stays out of search results the
 * only way that actually works — no page is generated for it, and it is absent
 * from the sitemap. A Prototype scene makes no numerical claim, and a search
 * result is exactly where that caveat would be lost.
 *
 * @param {{ baseUrl?: string }} [options]
 */
export function buildRobots({ baseUrl = '' } = {}) {
  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    '# Experimental (Prototype) models are deliberately not indexed: no page is',
    '# generated for them and they are absent from the sitemap below.',
  ];
  if (baseUrl) lines.push('', `Sitemap: ${absoluteUrl(baseUrl, 'sitemap.xml')}`);
  return `${lines.join('\n')}\n`;
}

/**
 * JSON-LD for the site itself, injected into the application shell.
 *
 * @param {{ baseUrl?: string }} [options]
 */
export function siteJsonLd({ baseUrl = '' } = {}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: SITE_TAGLINE_JA,
    description: `${SITE_TAGLINE_JA} / ${SITE_TAGLINE_EN}`,
    inLanguage: ['ja', 'en'],
  };
  if (baseUrl) data.url = baseUrl;
  return data;
}

/**
 * Which scenes are missing a social card image.
 *
 * A 1200×630 raster cannot be produced from this repository — there is no
 * rasteriser, and adding one would break the single-dependency rule. So the
 * build reports the gap by name instead of silently advertising an image that
 * does not exist.
 *
 * @param {object[]} scenes
 * @param {Set<string>} socialCards slugs for which `public/social/<slug>.png` exists
 */
export const missingSocialCards = (scenes, socialCards) =>
  scenes.filter((scene) => !socialCards.has(scene.slug)).map((scene) => scene.slug);
