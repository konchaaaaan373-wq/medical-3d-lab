import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { MODELS_ROUTE, PATHOLOGY_ROUTE, RESERVED_ROUTE_SLUGS, SCENES, sceneById } from '../src/catalog/index.js';
import { isRouteReleased, RELEASED_SCENES } from '../src/catalog/release.js';
import { PUBLIC_MANIFEST } from '../src/catalog/publicManifest.js';
import { isPathologyModelScene, pathologyModelScenes } from '../src/catalog/pathologyModels.js';
import { DOCUMENT_ROUTE_KINDS, resolveRoute } from '../src/app/router.js';
import { redirectFor } from '../src/app/routeRedirects.js';

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

test('every released scene whose breadcrumb names the category appears in the released list', () => {
  const listed = pathologyModelScenes(RELEASED_SCENES).map((scene) => scene.id);
  for (const scene of RELEASED_SCENES.filter(isPathologyModelScene)) assert.ok(listed.includes(scene.id));
  assert.ok(listed.includes('cardiac-output'), 'the scene the breadcrumb is on is on the list it goes back to');
});

test('the list reads what is published from the public manifest, like every other surface', () => {
  const source = readFileSync(new URL('../src/app/PathologyIndex.js', import.meta.url), 'utf8');
  assert.match(source, /manifest = PUBLIC_MANIFEST/);
  assert.match(source, /manifest\.models/);
  assert.doesNotMatch(source, /RELEASED_SCENES/, 'not the release module directly (CLAUDE.md: one public list)');
  const published = PUBLIC_MANIFEST.models.map((model) => sceneById(model.sceneId));
  assert.ok(pathologyModelScenes(published).some((scene) => scene.id === 'cardiac-output'));
});

test('the Explorer names the category by the same rule as the breadcrumb', () => {
  const source = readFileSync(new URL('../src/app/Explorer.js', import.meta.url), 'utf8');
  assert.match(source, /isPathologyModelScene\(scene\) \? PATHOLOGY_CATEGORY/);
  assert.doesNotMatch(source, /scene\.disease \? '病態モデル'/, 'no second definition of the category');
});
