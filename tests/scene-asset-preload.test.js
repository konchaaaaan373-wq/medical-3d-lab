import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

import { preloadSceneAssets, sceneAssetUrls } from '../src/app/sceneAssetPreload.js';
import { assetById } from '../src/catalog/assetManifest.js';
import { modelProfileForScene } from '../src/catalog/modelProfiles.js';
import { SCENES } from '../src/catalog/index.js';
import { RELEASED_SCENES } from '../src/catalog/release.js';

/** The table the build injects — derived exactly as `vite.config.js` derives it. */
const table = sceneAssetUrls(RELEASED_SCENES, modelProfileForScene, assetById);

test('every released scene that loads a model file has it preloaded', () => {
  for (const scene of RELEASED_SCENES) {
    const assets = modelProfileForScene(scene)?.assets ?? [];
    if (!assets.length) {
      assert.equal(table[scene.id], undefined, `${scene.id} loads no asset and must not preload one`);
      continue;
    }
    assert.equal(table[scene.id]?.length, assets.length, `${scene.id}: one preload per asset its profile names`);
  }
});

test('every preloaded file ships with the build', () => {
  // A preload for a file that is not in `dist/` is a 404 on every visit.
  for (const [sceneId, urls] of Object.entries(table)) {
    for (const url of urls) {
      assert.ok(existsSync(new URL(`../public/${url}`, import.meta.url)), `${sceneId}: public/${url} does not exist`);
    }
  }
});

test('a scene the release withholds gets no preload, even when its profile names an asset', () => {
  const withheld = SCENES.filter((scene) => !RELEASED_SCENES.includes(scene));
  const all = sceneAssetUrls(SCENES, modelProfileForScene, assetById);
  for (const scene of withheld) assert.equal(table[scene.id], undefined, scene.id);
  // The rule is the release, not an accident of which profiles have assets:
  // there is a withheld scene with an asset today, and it is left out.
  assert.ok(withheld.some((scene) => all[scene.id]), 'expected at least one withheld scene with an asset to exercise this');
});

test('the preload matches the request three.js FileLoader makes, or the file downloads twice', () => {
  const added = [];
  const doc = {
    createElement: () => ({}),
    head: { append: (link) => added.push(link) },
  };
  assert.equal(preloadSceneAssets(doc, ['assets/heart/a.glb', 'assets/heart/b.glb'], './'), 2);
  for (const link of added) {
    assert.equal(link.rel, 'preload');
    assert.equal(link.as, 'fetch');
    // FileLoader's Request is mode `cors`, credentials `same-origin`; only
    // `crossorigin="anonymous"` matches it. `verify:anatomy` counts requests.
    assert.equal(link.crossOrigin, 'anonymous');
  }
  assert.deepEqual(added.map((link) => link.href), ['./assets/heart/a.glb', './assets/heart/b.glb']);
  assert.equal(preloadSceneAssets(doc, undefined), 0);
});
