import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, sceneBySlug } from '../src/catalog/index.js';
import { namesScene, resolveRoute } from '../src/app/router.js';

test('Trust has a WebGL-independent route and evidence alias', () => {
  assert.deepEqual(resolveRoute('#/trust'), { kind: 'trust', focusId: null });
  assert.deepEqual(resolveRoute('#/evidence'), { kind: 'trust', focusId: null });
  assert.equal(namesScene('#/trust'), false);
  assert.equal(namesScene('#/evidence'), false);
});

test('a Trust route can carry the model it should open focused', () => {
  assert.deepEqual(resolveRoute('#/trust?model=heart-failure'), {
    kind: 'trust',
    focusId: 'heart-failure',
  });
  // Blank and missing are the same "no focus" answer.
  assert.deepEqual(resolveRoute('#/trust?model='), { kind: 'trust', focusId: null });
});

test('no medical scene may take a reserved Trust route', () => {
  for (const slug of ['trust', 'evidence']) {
    assert.equal(sceneBySlug(slug), null, `${slug} is reserved for the product Trust surface`);
    assert.ok(!SCENES.some((scene) => scene.slug === slug));
  }
});
