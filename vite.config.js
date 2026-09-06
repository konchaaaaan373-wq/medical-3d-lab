import { defineConfig, loadEnv } from 'vite';

import { CRAWLABLE_SCENES } from './src/catalog/release.js';
import { siteMetadataPlugin } from './scripts/site-plugin.js';
import clinicalReviews from './docs/clinical-reviews/registry.json' with { type: 'json' };

export default defineConfig(({ mode }) => {
  // The crawlable surface needs the deployment's own URL, and that is
  // configuration rather than code. Without it the pages are still built; only
  // the absolute URLs are left out. See docs/discoverability.md.
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    base: './',
    server: { host: true, port: 5173 },
    build: {
      target: 'es2020',
      outDir: 'dist',
      // three.js is ~550 kB minified on its own; the default 500 kB warning is noise here.
      chunkSizeWarningLimit: 900,
    },
    plugins: [
      siteMetadataPlugin({
        // Open *and* public — `catalog/release.js` holds the two rules
        // together, because a set that satisfies only one of them is a bug in
        // whichever channel it is not checked in.
        scenes: CRAWLABLE_SCENES,
        reviews: clinicalReviews,
        baseUrl: env.VITE_SITE_URL ?? '',
      }),
    ],
  };
});
