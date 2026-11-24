/**
 * Vite plugin: a production build does not carry the assets of withheld models.
 *
 * `public/` is copied into the build verbatim, and Vite offers no way to copy
 * part of it. Until the brain launch (2026-11-24) that did not matter for
 * assets: every registered mesh belonged to a published model. The launch
 * scope then closed the heart with its record complete and its two meshes
 * still in `public/assets/heart/` — built, licensed, and published to everyone
 * by a model nobody could open. `scripts/check-site-output.js` said so, which
 * is the only reason anybody knew.
 *
 * So the files stay where they are — `npm run dev` and a preview build open
 * every scene and need them — and a production build removes them after the
 * copy. Which files is not decided here: `withheldDeliveryPaths` derives it
 * from the asset manifest and the released scenes, and
 * `assetDeliveryProblems` (run by `npm run verify:site`) reads the same
 * derivation, so a file this failed to remove is a red build rather than a
 * quiet download.
 *
 * Like the scene-loader plugin beside it, this is not access control: the
 * repository is public. It is the difference between "not offered" and "not
 * delivered".
 *
 * A preview build (`VITE_ALLOW_PREVIEW=1`) skips it, for the same reason the
 * scene loaders are kept there.
 */
import { existsSync, readdirSync, rmSync, rmdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { requiredAssetIdsFor, withheldDeliveryPaths } from './asset-delivery.js';

/**
 * @param {object} options
 * @param {ReadonlyArray<object>} options.assets the whole asset manifest
 * @param {ReadonlyArray<object>} options.released the scenes the release opens
 * @param {(scene: object) => object|null} options.profileFor
 * @param {boolean} [options.enabled] false for a preview build
 */
export function withheldAssetsPlugin({ assets, released, profileFor, enabled = true } = {}) {
  const withheld = withheldDeliveryPaths({ assets, requiredAssetIds: requiredAssetIdsFor(released, profileFor) });
  let outDir = '';

  return {
    name: 'medical-3d-lab:withheld-assets',
    apply: 'build',
    enforce: 'post',

    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },

    closeBundle() {
      if (!enabled || !outDir) return;
      const removed = [];
      for (const path of withheld) {
        const file = join(outDir, path);
        if (!existsSync(file)) continue;
        rmSync(file);
        removed.push(path);
        // A folder that held nothing else is not left behind as an empty
        // directory naming an organ the build does not carry.
        for (let dir = dirname(file); dir.startsWith(outDir) && dir !== outDir; dir = dirname(dir)) {
          if (readdirSync(dir).length) break;
          rmdirSync(dir);
        }
      }
      if (removed.length) {
        this.info(
          `${removed.length} file(s) of assets no published model uses were left out of the build: ${removed.join(', ')}`
        );
      }
    },
  };
}
