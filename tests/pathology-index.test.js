import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { MODELS_ROUTE, PATHOLOGY_ROUTE, RESERVED_ROUTE_SLUGS, SCENES, sceneById } from '../src/catalog/index.js';
import { isRouteReleased, RELEASED_SCENES } from '../src/catalog/release.js';
import { PUBLIC_MANIFEST } from '../src/catalog/publicManifest.js';
import { isPathologyModelScene, pathologyModelScenes } from '../src/catalog/pathologyModels.js';
import { DOCUMENT_ROUTE_KINDS, resolveRoute } from '../src/app/router.js';
import { redirectFor } from '../src/app/routeRedirects.js';
import { BETA_CLEAR_SCENES, SCOPED_OUT_SCENES, WIDE_MANIFEST } from './helpers/wide-release.js';

// The breadcrumb "病態モデル ＞ 心拍出量" is only honest if "病態モデル" is a
// place: a route that resolves, is open on a production build, and lists the
// scene the breadcrumb was on.

test('#/models is the model index a production build opens, and #/pathology still arrives there', () => {
  // BYOKI MOTION (2026-09-30): the disease-model list became the product's
  // "Models". The breadcrumb goes to its canonical address; the old one is a
  // link that has been shared and still resolves, corrected in the address bar.
  assert.equal(PATHOLOGY_ROUTE, MODELS_ROUTE);
  assert.equal(MODELS_ROUTE, '#/models');
  assert.deepEqual(resolveRoute(MODELS_ROUTE), { kind: 'pathology' });
  assert.deepEqual(resolveRoute('#/pathology'), { kind: 'pathology' });
  assert.equal(redirectFor('#/pathology', { unlocked: false }), MODELS_ROUTE);
  assert.equal(redirectFor(MODELS_ROUTE, { unlocked: false }), null);
  assert.ok(DOCUMENT_ROUTE_KINDS.includes('pathology'));
  for (const slug of ['pathology', 'models']) {
    assert.ok(RESERVED_ROUTE_SLUGS.includes(slug), `no scene may take the slug ${slug}`);
  }
  assert.equal(isRouteReleased({ kind: 'pathology' }), true);
});

test('the surface table mounts the list for the route', () => {
  const surfaces = readFileSync(new URL('../src/app/documentSurfaces.js', import.meta.url), 'utf8');
  assert.match(surfaces, /kind === 'pathology'/);
  assert.match(surfaces, /createPathologyIndex/);
});

test('the category is read off the model profile, and no anatomy scene is in it', () => {
  assert.equal(isPathologyModelScene(sceneById('cardiac-output')), true);
  assert.equal(isPathologyModelScene(sceneById('heart-failure')), true);
  const anatomy = SCENES.filter((scene) => scene.tags?.includes('anatomy'));
  assert.ok(anatomy.length > 0);
  assert.deepEqual(anatomy.filter(isPathologyModelScene).map((scene) => scene.id), []);
});

test('every published scene whose breadcrumb names the category appears in the list it goes back to', () => {
  // On everything the beta gate clears: the launch scope (2026-11-24) publishes
  // no disease model, so on the real release this loop had nothing in it.
  const listed = pathologyModelScenes(BETA_CLEAR_SCENES).map((scene) => scene.id);
  for (const scene of BETA_CLEAR_SCENES.filter(isPathologyModelScene)) assert.ok(listed.includes(scene.id));
  assert.ok(listed.includes('cardiac-output'), 'the scene the breadcrumb is on is on the list it goes back to');
  // And the real release, said out loud rather than left as an empty loop.
  assert.deepEqual(pathologyModelScenes(RELEASED_SCENES).map((scene) => scene.id), []);
});

const scenesOf = (manifest) => manifest.models.map((model) => sceneById(model.sceneId));

test('the list reads what is published from the public manifest, like every other surface', () => {
  // `PathologyIndex.js` imports its stylesheet, so `node --test` cannot mount
  // it; what is held is the source's one read of the manifest and the pure
  // projection it applies to it.
  const source = readFileSync(new URL('../src/app/PathologyIndex.js', import.meta.url), 'utf8');
  assert.match(source, /manifest = PUBLIC_MANIFEST/);
  assert.match(source, /manifest\.models/);
  assert.doesNotMatch(source, /RELEASED_SCENES/, 'not the release module directly (CLAUDE.md: one public list)');
  assert.match(source, /const listed = pathologyModelScenes\(scenes \?\? \(unlocked \? SCENES : published\(\)\)\);/);

  // From a manifest with a disease model in it, the list is that model.
  assert.deepEqual(pathologyModelScenes(scenesOf(WIDE_MANIFEST)).map((scene) => scene.id), ['cardiac-output']);
});

test('the launch as published: #/models has no disease model to list, says so in words, and withholds the rest', () => {
  // The page is still a route (the menu's and every disease model's way back).
  // With the launch scope (2026-11-24) nothing is on its first shelf, and an
  // empty shelf under 「病態モデル」 reads as a page that failed to load.
  assert.deepEqual(pathologyModelScenes(scenesOf(PUBLIC_MANIFEST)), []);
  const source = readFileSync(new URL('../src/app/PathologyIndex.js', import.meta.url), 'utf8');
  assert.match(
    source,
    /listed\.length\s*\?[\s\S]*?:\s*el\('p', \{ class: 'bm-empty explorer-empty', role: 'status' \}, dual\(\s*'No disease model is open in this release\.',\s*'この版で公開している病態モデルはありません。'/,
    'the empty shelf is announced, in both languages'
  );
  // The anatomy shelf under it is manifest rows — so it is the brain's two
  // models and none of the four the launch withholds.
  assert.match(source, /const anatomy = manifest\.models\.filter\(\(model\) => model\.layer === 'anatomy'\);/);
  const shelf = PUBLIC_MANIFEST.models.filter((model) => model.layer === 'anatomy').map((model) => model.sceneId);
  assert.deepEqual(shelf, ['brain-anatomy', 'mri-atlas']);
  for (const scene of SCOPED_OUT_SCENES) assert.equal(shelf.includes(scene.id), false, scene.id);
});

test('the Explorer names the category by the same rule as the breadcrumb', () => {
  const source = readFileSync(new URL('../src/app/Explorer.js', import.meta.url), 'utf8');
  assert.match(source, /isPathologyModelScene\(scene\) \? PATHOLOGY_CATEGORY/);
  assert.doesNotMatch(source, /scene\.disease \? '病態モデル'/, 'no second definition of the category');
});
