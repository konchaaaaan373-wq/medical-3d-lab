import { defineConfig, loadEnv } from 'vite';

import { SCENES } from './src/catalog/index.js';
import { CRAWLABLE_SCENES, RELEASED_SCENES } from './src/catalog/release.js';
import { publicSceneLoadersPlugin } from './scripts/scene-loaders-plugin.js';
import { siteMetadataPlugin } from './scripts/site-plugin.js';
import clinicalReviews from './docs/clinical-reviews/registry.json' with { type: 'json' };

export default defineConfig(({ mode }) => {
  // The crawlable surface needs the deployment's own URL, and that is
  // configuration rather than code. Without it the pages are still built; only
  // the absolute URLs are left out. See docs/discoverability.md.
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  // The one switch that decides whether this build can be unlocked at all.
  // `src/app/releaseGate.js` reads the same variable in the browser; here it
  // decides whether the locked scenes are in the bundle to be unlocked.
  const allowPreview = env.VITE_ALLOW_PREVIEW === '1';

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
      // Not offered *and* not delivered. A preview build keeps everything,
      // because a reviewer has to be able to open the work in progress.
      publicSceneLoadersPlugin({
        scenes: SCENES,
        released: RELEASED_SCENES,
        enabled: !allowPreview,
      }),
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
