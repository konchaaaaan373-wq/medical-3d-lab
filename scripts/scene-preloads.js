/**
 * The table `main.js` prefetches from, built with the filesystem.
 *
 * `sceneAssetUrls` (src/app/sceneAssetPreload.js) is pure and knows only what
 * the catalogue says. Two facts it cannot know live in the files themselves:
 * whether a shipped GLB is Draco-compressed — then the scene cannot decode it
 * until the decoder arrives, and the decoder is on the critical path unless it
 * is fetched with the model (measured 2026-09-24: 0.4–0.8 s on a 4G link) —
 * and how big the decoder is. This reads both, so the build and the tests
 * derive the table the same way.
 */
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { sceneAssetUrls } from '../src/app/sceneAssetPreload.js';
import { SHARED_RUNTIME_FILES } from './asset-delivery.js';

/** The glTF extensions a GLB declares, read from its JSON chunk. */
export function glbExtensionsUsed(path) {
  const bytes = readFileSync(path);
  if (bytes.toString('ascii', 0, 4) !== 'glTF') return [];
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength));
  return json.extensionsUsed ?? [];
}

/** The Draco decoder files, as shipped. The glTF loader asks for these two. */
const DRACO_FILES = SHARED_RUNTIME_FILES.map((file) => file.path).filter((path) => /\/draco\/draco_(wasm_wrapper\.js|decoder\.wasm)$/.test(path));

/**
 * @param {{ scenes: object[], profileFor: Function, assetFor: Function, root: string }} options
 */
export function buildScenePreloads({ scenes, profileFor, assetFor, root }) {
  const decoderFor = (asset) => {
    const path = asset?.output?.path;
    if (!path || !path.endsWith('.glb')) return [];
    if (!glbExtensionsUsed(join(root, path)).includes('KHR_draco_mesh_compression')) return [];
    return DRACO_FILES.map((url) => ({ url, bytes: statSync(join(root, 'public', url)).size }));
  };
  return sceneAssetUrls(scenes, profileFor, assetFor, { decoderFor });
}
