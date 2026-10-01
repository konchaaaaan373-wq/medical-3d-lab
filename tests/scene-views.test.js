import test from 'node:test';
import assert from 'node:assert/strict';

import { hashWithView, resolveRoute, sameRoute, viewOf } from '../src/app/router.js';
import { hashChangeAction } from '../src/app/departure.js';
import { loadScene } from '../src/catalog/index.js';
import { hashWithPurpose } from '../src/app/purpose.js';

/**
 * Two screens of one model (`?view=`): `#/cardiac-output` opens the
 * introductory lesson, `#/cardiac-output?view=detail` the full model.
 *
 * Same catalogue entry and so the same publication record; different scene
 * classes with different shells, so moving between them has to build a new
 * one — which is what `sameRoute` answering "different" makes happen.
 */

test('a view is read from the route, and only a well-formed one', () => {
  assert.equal(viewOf('#/cardiac-output'), null);
  assert.equal(viewOf('#/cardiac-output?view=detail'), 'detail');
  assert.equal(viewOf('#/cardiac-output?purpose=patient&view=detail'), 'detail');
  assert.equal(viewOf('#/cardiac-output?view='), null);
  assert.equal(viewOf('#/cardiac-output?view=../x'), null, 'nothing but a name');
  assert.equal(viewOf('#/cardiac-output?view=Detail'), null);
});

test('a route without a view reads exactly as it always did', () => {
  assert.deepEqual(resolveRoute('#/cardiac-output'), { kind: 'scene', sceneId: 'cardiac-output', structureId: null });
  assert.deepEqual(resolveRoute('#/cardiac-output?view=detail'), {
    kind: 'scene',
    sceneId: 'cardiac-output',
    structureId: null,
    view: 'detail',
  });
});

test('two views of one model are two screens: moving between them builds a new one', () => {
  assert.equal(sameRoute('#/cardiac-output', '#/cardiac-output?view=detail'), false);
  assert.equal(sameRoute('#/cardiac-output?view=detail', '#/cardiac-output?view=detail&purpose=education'), true);
  assert.equal(hashChangeAction('#/cardiac-output?view=detail', '#/cardiac-output', { canSwap: true }), 'leave');
  assert.equal(hashChangeAction('#/cardiac-output', '#/cardiac-output', { canSwap: true }), 'stay');
});

test('writing a view keeps the rest of the address as written', () => {
  assert.equal(hashWithView('#/cardiac-output', 'detail'), '#/cardiac-output?view=detail');
  assert.equal(hashWithView('#/cardiac-output?view=detail', null), '#/cardiac-output');
  assert.equal(hashWithView('#/cardiac-output?structure=left%20atrium', 'detail'), '#/cardiac-output?structure=left%20atrium&view=detail');
  // And the purpose switch keeps a view it did not write.
  assert.equal(hashWithPurpose('#/cardiac-output?view=detail', 'patient'), '#/cardiac-output?view=detail&purpose=patient');
});

test('the loader opens the view a module offers, and its default screen for any other', async () => {
  const lesson = await loadScene('cardiac-output');
  const detail = await loadScene('cardiac-output', { view: 'detail' });
  const unknown = await loadScene('cardiac-output', { view: 'nonsense' });
  assert.equal(lesson.meta.layout, 'lesson');
  assert.equal(detail.meta.layout, 'experiment');
  assert.equal(unknown, lesson, 'a stale link still lands on the model');
  // A scene with no views ignores the parameter.
  const brain = await loadScene('brain-anatomy');
  assert.equal(await loadScene('brain-anatomy', { view: 'detail' }), brain);
});

test('a malformed escape elsewhere in the address does not stop a view or a purpose being written', () => {
  // `decodeURIComponent` on every key threw here, while the full model's
  // breadcrumb was being built, and the model never opened.
  assert.equal(viewOf('#/cardiac-output?view=detail&%E0=1'), 'detail');
  assert.equal(hashWithView('#/cardiac-output?view=detail&%E0=1', null), '#/cardiac-output?%E0=1');
  assert.equal(hashWithView('#/cardiac-output?%E0=1', 'detail'), '#/cardiac-output?%E0=1&view=detail');
  assert.equal(hashWithPurpose('#/cardiac-output?%E0=1', 'patient'), '#/cardiac-output?%E0=1&purpose=patient');
});
