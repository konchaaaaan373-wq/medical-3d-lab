import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, sceneBySlug } from '../src/catalog/index.js';
import { namesScene, resolveRoute } from '../src/app/router.js';

test('Trust has a WebGL-independent route and evidence alias', () => {
  assert.deepEqual(resolveRoute('#/trust'), { kind: 'trust' });
  assert.deepEqual(resolveRoute('#/evidence'), { kind: 'trust' });
  assert.equal(namesScene('#/trust'), false);
  assert.equal(namesScene('#/evidence'), false);
});

test('no medical scene may take a reserved Trust route', () => {
  for (const slug of ['trust', 'evidence']) {
    assert.equal(sceneBySlug(slug), null, `${slug} is reserved for the product Trust surface`);
    assert.ok(!SCENES.some((scene) => scene.slug === slug));
  }
});
