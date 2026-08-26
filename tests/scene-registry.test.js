import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ORGANS,
  SCENES,
  DEFAULT_SCENE_ID,
  organsWithScenes,
  organIdFor,
  resolveSceneId,
} from '../src/app/sceneRegistry.js';

test('every scene belongs to an organ that exists', () => {
  const ids = new Set(ORGANS.map((organ) => organ.id));
  for (const scene of SCENES) {
    assert.ok(scene.organ, `${scene.id} names an organ`);
    assert.ok(ids.has(scene.organ), `${scene.id} names a real organ (got "${scene.organ}")`);
  }
});

test('every organ tab leads somewhere', () => {
  for (const organ of organsWithScenes()) {
    assert.ok(organ.scenes.length > 0, `${organ.id} has at least one scene`);
  }
  // And an organ with nothing in it is left out rather than drawn as a dead tab.
  const empty = organsWithScenes(SCENES, [...ORGANS, { id: 'nothing', label: 'Nothing' }]);
  assert.ok(!empty.some((organ) => organ.id === 'nothing'));
});

test('the grouping covers every scene exactly once, in registration order', () => {
  const grouped = organsWithScenes().flatMap((organ) => organ.scenes.map((scene) => scene.id));
  assert.deepEqual(
    [...grouped].sort(),
    SCENES.map((scene) => scene.id).sort(),
    'no scene is dropped or duplicated'
  );
  for (const organ of organsWithScenes()) {
    const order = organ.scenes.map((scene) => SCENES.indexOf(scene));
    assert.deepEqual(order, [...order].sort((a, b) => a - b), `${organ.id} keeps registration order`);
  }
});

test('organs and scenes are named in both languages', () => {
  for (const organ of ORGANS) {
    assert.ok(organ.label?.length, `${organ.id} has an English name`);
    assert.ok(organ.labelJa?.length, `${organ.id} has a Japanese name`);
  }
  for (const scene of SCENES) {
    assert.ok(scene.label?.length && scene.labelJa?.length, `${scene.id} is named in both languages`);
  }
});

test('organIdFor answers for real scenes and refuses to invent one', () => {
  for (const scene of SCENES) assert.equal(organIdFor(scene.id), scene.organ);
  assert.equal(organIdFor('no-such-scene'), null);
});

test('the default scene is a real scene, named rather than positional', () => {
  assert.ok(
    SCENES.some((scene) => scene.id === DEFAULT_SCENE_ID),
    'DEFAULT_SCENE_ID points at a registered scene'
  );
});

test('scene links keep working, with or without the slash', () => {
  for (const scene of SCENES) {
    assert.equal(resolveSceneId(`#/${scene.id}`), scene.id);
    assert.equal(resolveSceneId(`#${scene.id}`), scene.id);
  }
  assert.equal(resolveSceneId('#/not-a-scene'), DEFAULT_SCENE_ID);
  assert.equal(resolveSceneId(''), DEFAULT_SCENE_ID);
});
