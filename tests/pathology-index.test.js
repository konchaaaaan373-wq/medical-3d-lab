import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { PATHOLOGY_ROUTE, RESERVED_ROUTE_SLUGS, SCENES, sceneById } from '../src/catalog/index.js';
import { isRouteReleased, RELEASED_SCENES } from '../src/catalog/release.js';
import { isPathologyModelScene, pathologyModelScenes } from '../src/catalog/pathologyModels.js';
import { DOCUMENT_ROUTE_KINDS, resolveRoute } from '../src/app/router.js';

// The breadcrumb "病態モデル ＞ 心拍出量" is only honest if "病態モデル" is a
// place: a route that resolves, is open on a production build, and lists the
// scene the breadcrumb was on.

test('#/pathology is a document route that a production build opens', () => {
  assert.equal(PATHOLOGY_ROUTE, '#/pathology');
  assert.deepEqual(resolveRoute(PATHOLOGY_ROUTE), { kind: 'pathology' });
  assert.ok(DOCUMENT_ROUTE_KINDS.includes('pathology'));
  assert.ok(RESERVED_ROUTE_SLUGS.includes('pathology'), 'no scene may take the slug');
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
