/**
 * Vite plugin: emit the crawlable surface at build time.
 *
 * Produces, from `src/catalog/` and nothing else:
 *
 *   dist/s/<slug>/index.html   one static page per public scene
 *   dist/sitemap.xml           when a site URL is configured
 *   dist/robots.txt
 *
 * and injects the shared metadata (canonical, Open Graph, Twitter, JSON-LD)
 * into the application shell's `<head>`.
 *
 * The catalogue stays the only registration point: a new scene appears in the
 * sitemap, gets its own page and its own preview card with no build change,
 * which is the same promise routing and the explorer already make.
 *
 * `VITE_SITE_URL` is optional. Without it the pages are still emitted — they
 * are useful without JavaScript regardless — but canonical and Open Graph URLs
 * are omitted rather than pointed at a guessed domain, and the sitemap is
 * skipped, because a sitemap of relative paths is not a sitemap.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import {
  SITE_NAME,
  SITE_TAGLINE_EN,
  SITE_TAGLINE_JA,
  buildRobots,
  buildSitemap,
  headTags,
  jsonLdScript,
  missingSocialCards,
  renderScenePage,
  scenePagePath,
  siteJsonLd,
} from './site-metadata.js';

/** Slugs for which a raster preview image actually exists. */
function socialCardSlugs(root) {
  const dir = join(root, 'public', 'social');
  if (!existsSync(dir)) return new Set();
  return new Set(
    readdirSync(dir)
      .filter((name) => name.endsWith('.png'))
      .map((name) => name.replace(/\.png$/, ''))
  );
}

/**
 * @param {{ scenes: object[], reviews?: object[], root?: string, baseUrl?: string }} options
 */
export function siteMetadataPlugin({ scenes, reviews = [], root = process.cwd(), baseUrl = '' } = {}) {
  const reviewById = new Map(reviews.map((record) => [record.sceneId, record]));
  const socialCards = socialCardSlugs(root);

  return {
    name: 'medical-3d-lab:site-metadata',
    apply: 'build',

    /**
     * The shell's own head. Written here rather than in `index.html` so the
     * canonical URL follows the configured deployment instead of being a
     * literal somebody has to remember to change.
     */
    transformIndexHtml(html) {
      const tags = headTags({
        title: `${SITE_NAME} — ${SITE_TAGLINE_EN}`,
        description: `${SITE_TAGLINE_JA} / ${SITE_TAGLINE_EN}`,
        canonical: baseUrl,
        image: baseUrl && socialCards.has('site') ? `${baseUrl.replace(/\/$/, '')}/social/site.png` : '',
      })
        // `index.html` already carries its own title and description; the
        // build must not give the page two of either.
        .filter((line) => !line.includes('<title>') && !line.includes('name="description"'));

      const jsonLd = `    <script type="application/ld+json">\n${jsonLdScript(
        siteJsonLd({ baseUrl })
      )}\n    </script>`;

      return html.replace('</head>', `${[...tags, jsonLd].join('\n')}\n  </head>`);
    },

    generateBundle() {
      for (const scene of scenes) {
        this.emitFile({
          type: 'asset',
          fileName: scenePagePath(scene),
          source: renderScenePage(scene, {
            baseUrl,
            review: reviewById.get(scene.id) ?? null,
            socialCards,
          }),
        });
      }

      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: buildRobots({ baseUrl }) });

      const sitemap = buildSitemap(scenes, { baseUrl });
      if (sitemap) {
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
      } else {
        this.warn(
          'VITE_SITE_URL is not set: sitemap.xml and canonical URLs were skipped rather than pointed at a guessed domain.'
        );
      }

      const missing = missingSocialCards(scenes, socialCards);
      if (missing.length) {
        this.warn(
          `No link-preview image for ${missing.length} scene(s): ${missing.join(', ')}. ` +
            'Add public/social/<slug>.png at 1200x630 and the build will advertise it.'
        );
      }
    },
  };
}
