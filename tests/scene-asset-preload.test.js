import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';

import { describeAssetProgress, prefetchSceneAssets, sceneAssetUrls } from '../src/app/sceneAssetPreload.js';
import { assetById } from '../src/catalog/assetManifest.js';
import { modelProfileForScene } from '../src/catalog/modelProfiles.js';
import { SCENES } from '../src/catalog/index.js';
import { RELEASED_SCENES } from '../src/catalog/release.js';
import { buildScenePreloads, glbExtensionsUsed } from '../scripts/scene-preloads.js';
import { fileURLToPath } from 'node:url';

/** The table the build injects — derived exactly as `vite.config.js` derives it. */
const root = fileURLToPath(new URL('..', import.meta.url));
const table = buildScenePreloads({ scenes: RELEASED_SCENES, profileFor: modelProfileForScene, assetFor: assetById, root });

test('every released scene that loads a model file has it preloaded', () => {
  for (const scene of RELEASED_SCENES) {
    const assets = modelProfileForScene(scene)?.assets ?? [];
    if (!assets.length) {
      assert.equal(table[scene.id], undefined, `${scene.id} loads no asset and must not preload one`);
      continue;
    }
    const urls = (table[scene.id] ?? []).map((file) => file.url);
    for (const id of assets) {
      const path = assetById(id).output.path;
      assert.ok(urls.includes(path.replace(/^public\//, '')), `${scene.id}: ${id} is not prefetched`);
      // A compressed model cannot be read until the decoder is in, so the
      // decoder is fetched with it — once, whatever number of files need it.
      if (glbExtensionsUsed(fileURLToPath(new URL(`../${path}`, import.meta.url))).includes('KHR_draco_mesh_compression')) {
        for (const decoder of ['assets/brain/draco/draco_wasm_wrapper.js', 'assets/brain/draco/draco_decoder.wasm']) {
          assert.equal(urls.filter((url) => url === decoder).length, 1, `${scene.id}: ${decoder} is fetched once with ${id}`);
        }
      }
    }
  }
});

test('every preloaded file ships with the build', () => {
  // A preload for a file that is not in `dist/` is a 404 on every visit.
  for (const [sceneId, files] of Object.entries(table)) {
    for (const { url, bytes } of files) {
      const path = new URL(`../public/${url}`, import.meta.url);
      assert.ok(existsSync(path), `${sceneId}: public/${url} does not exist`);
      // The veil's total is this number; a stale one ends the bar short or long.
      assert.equal(bytes, statSync(path).size, `${sceneId}: the manifest's size for ${url} is not the file's`);
    }
  }
});

test('a scene the release withholds gets no preload, even when its profile names an asset', () => {
  const withheld = SCENES.filter((scene) => !RELEASED_SCENES.includes(scene));
  const all = buildScenePreloads({ scenes: SCENES, profileFor: modelProfileForScene, assetFor: assetById, root });
  for (const scene of withheld) assert.equal(table[scene.id], undefined, scene.id);
  // The rule is the release, not an accident of which profiles have assets:
  // there is a withheld scene with an asset today, and it is left out.
  assert.ok(withheld.some((scene) => all[scene.id]), 'expected at least one withheld scene with an asset to exercise this');
});

/** A window with a fetch that answers from a table, streaming in two chunks. */
function fakeWindow(bodies) {
  const calls = [];
  const win = {
    location: { href: 'https://example.test/app/index.html#/heart-anatomy' },
    Response,
    Blob,
    fetch(input, init) {
      const href = typeof input === 'string' ? new URL(input, win.location.href).href : input.url;
      calls.push({ href, init });
      const bytes = bodies[href];
      if (!bytes) return Promise.reject(new TypeError('Failed to fetch'));
      const half = Math.floor(bytes.length / 2);
      const body = new ReadableStream({
        start(controller) {
          controller.enqueue(bytes.slice(0, half));
          controller.enqueue(bytes.slice(half));
          controller.close();
        },
      });
      return Promise.resolve(new Response(body, { status: 200, headers: { 'content-type': 'model/gltf-binary' } }));
    },
  };
  return { win, calls };
}

const A = 'https://example.test/app/assets/heart/a.glb';
const B = 'https://example.test/app/assets/heart/b.glb';
const files = [{ url: 'assets/heart/a.glb', bytes: 6 }, { url: 'assets/heart/b.glb', bytes: 4 }];

test('the scene\'s own request is answered with the prefetched bytes, once, and fetch is given back', async () => {
  const { win, calls } = fakeWindow({ [A]: new Uint8Array([1, 2, 3, 4, 5, 6]), [B]: new Uint8Array([7, 8, 9, 10]) });
  const original = win.fetch;
  prefetchSceneAssets({ files, baseUrl: './', win });
  assert.equal(calls.length, 2, 'both files start at once, not one after the other');

  // three's FileLoader asks with a Request, not a string.
  const first = await win.fetch(new Request(A, { credentials: 'same-origin' }));
  assert.deepEqual([...new Uint8Array(await first.arrayBuffer())], [1, 2, 3, 4, 5, 6]);
  assert.equal(first.status, 200);
  assert.equal(calls.length, 2, 'answered from the prefetch, not the network');

  // Asking again is a new request — a retry must reach the network.
  await win.fetch(A).catch(() => {});
  assert.equal(calls.length, 3);

  await win.fetch('./assets/heart/b.glb');
  assert.equal(win.fetch, original, 'once every file is handed over, fetch is the browser\'s again');
});

test('progress counts bytes as they arrive and ends exactly at the whole model', async () => {
  const { win } = fakeWindow({ [A]: new Uint8Array(6), [B]: new Uint8Array(4) });
  const seen = [];
  const download = prefetchSceneAssets({ files, win });
  download.subscribe((state) => seen.push(state));
  await win.fetch(A);
  await win.fetch(B);
  const loaded = seen.map((state) => state.loaded);
  assert.ok(loaded.every((value, i) => i === 0 || value >= loaded[i - 1]), `never backwards: ${loaded}`);
  assert.ok(seen.some((state) => state.loaded > 0 && state.loaded < 10), 'there is a state in between');
  assert.deepEqual(seen.at(-1), { loaded: 10, total: 10, done: true, failed: false });
});

test('a file that fails reaches the scene as the same failure, and the veil stops counting', async () => {
  const { win } = fakeWindow({ [B]: new Uint8Array(4) });
  const download = prefetchSceneAssets({ files, win });
  await assert.rejects(win.fetch(A), TypeError);
  await win.fetch(B);
  assert.equal(download.state().failed, true);
  assert.equal(describeAssetProgress(download.state(), 'ja'), '');
});

test('nothing to fetch installs nothing', () => {
  const { win } = fakeWindow({});
  const original = win.fetch;
  assert.equal(prefetchSceneAssets({ files: [], win }), null);
  assert.equal(prefetchSceneAssets({ files: undefined, win }), null);
  assert.equal(win.fetch, original);
});

test('the veil line: megabytes while downloading, a sentence while preparing', () => {
  assert.equal(describeAssetProgress({ loaded: 2_100_000, total: 6_748_000, done: false, failed: false }, 'ja'), '2.1 / 6.7 MB');
  assert.equal(describeAssetProgress({ loaded: 1, total: 1, done: true, failed: false }, 'ja'), '表示を準備しています');
  assert.equal(describeAssetProgress({ loaded: 1, total: 1, done: true, failed: false }, 'en'), 'Preparing the model');
});
