import { defineConfig, loadEnv } from 'vite';

import { PUBLIC_SCENES } from './src/catalog/index.js';
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
        // Public scenes only: Prototype work lives on the Lab shelf and is
        // deliberately not something a search result can strip the caveat from.
        scenes: PUBLIC_SCENES,
        reviews: clinicalReviews,
        baseUrl: env.VITE_SITE_URL ?? '',
      }),
    ],
  };
});
