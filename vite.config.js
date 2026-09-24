import { defineConfig, loadEnv } from 'vite';

import { SCENES } from './src/catalog/index.js';
import { CRAWLABLE_SCENES, RELEASED_SCENES } from './src/catalog/release.js';
import { assetById } from './src/catalog/assetManifest.js';
import { modelProfileForScene } from './src/catalog/modelProfiles.js';
import { sceneAssetUrls } from './src/app/sceneAssetPreload.js';
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

  // Which build this is, carried inside the bundle.
  //
  // Netlify sets these on every build it runs; a local `npm run build` sets
  // none of them, and `local` is the right answer there. They are `define`d
  // rather than read through `import.meta.env` because they are not
  // `VITE_`-prefixed and they are not configuration a deploy chooses — they
  // are facts about the build, and the deploy states them by existing.
  const buildIdentity = {
    __BUILD_CONTEXT__: JSON.stringify(process.env.CONTEXT || 'local'),
    __BUILD_COMMIT__: JSON.stringify(process.env.COMMIT_REF || ''),
    __BUILD_REVIEW__: JSON.stringify(process.env.REVIEW_ID || ''),
  };

  // Which model files `main.js` starts fetching for each scene, before the
  // scene's own code has arrived. Released scenes only, in every build: a
  // withheld scene's asset is not shipped, and a preview build unlocking it
  // simply loads it the slow way. See src/app/sceneAssetPreload.js.
  const scenePreloads = {
    __SCENE_ASSET_PRELOADS__: JSON.stringify(sceneAssetUrls(RELEASED_SCENES, modelProfileForScene, assetById)),
  };

  return {
    base: './',
    define: { ...buildIdentity, ...scenePreloads },
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
