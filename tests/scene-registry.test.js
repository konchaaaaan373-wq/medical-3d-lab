import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENES,
  PUBLIC_SCENES,
  LAB_SCENES,
  DEFAULT_SCENE_ID,
  loadScene,
  resolveSceneId,
  sceneById,
  systemsWithScenes,
} from '../src/app/sceneRegistry.js';

/**
 * The app's view of the catalogue.
 *
 * `tests/catalog.test.js` checks the catalogue itself; this checks the small
 * adapter the UI talks to — the shape the components read, and the two places
 * a mismatch would be invisible: a scene that loads while the navigation marks
 * another as current, and a tab that leads nowhere.
 */

test('scene entries carry the labels the UI components read', () => {
  for (const scene of SCENES) {
    assert.ok(scene.label?.length && scene.labelJa?.length, `${scene.id} is named in both languages`);
    assert.equal(scene.label, scene.titleEn, 'the label is the catalogue title, not a second copy of it');
    assert.equal(scene.labelJa, scene.titleJa);
  }
});

test('every system tab leads somewhere on both public and Lab shelves', () => {
  for (const scope of ['public', 'lab']) {
    for (const system of systemsWithScenes(scope)) {
      assert.ok(system.scenes.length > 0, `${scope}/${system.id} has at least one scene`);
      assert.ok(system.label?.length && system.labelJa?.length, `${scope}/${system.id} is named in both languages`);
    }
  }
});

function assertGrouping(scope, expectedScenes) {
  const groups = systemsWithScenes(scope);
  const grouped = groups.flatMap((system) => system.scenes.map((scene) => scene.id));
  assert.deepEqual(
    [...grouped].sort(),
    expectedScenes.map((scene) => scene.id).sort(),
    `${scope}: nothing dropped or duplicated`,
  );

  for (const system of groups) {
    const order = system.scenes.map((scene) => SCENES.findIndex((entry) => entry.id === scene.id));
    assert.deepEqual(order, [...order].sort((a, b) => a - b), `${scope}/${system.id} keeps registration order`);
  }
}

test('public and Lab groupings each cover exactly their own shelf, in registration order', () => {
  assertGrouping('public', PUBLIC_SCENES);
  assertGrouping('lab', LAB_SCENES);
});

test('the complete grouping still covers every registered scene when explicitly requested', () => {
  assertGrouping('all', SCENES);
});

test('the default scene is a real scene, named rather than positional', () => {
  assert.ok(sceneById(DEFAULT_SCENE_ID), 'DEFAULT_SCENE_ID points at a registered scene');
});

test('an unknown id loads the same scene the URL would resolve to', async () => {
  // Otherwise an id that reaches loadScene without going through resolveSceneId
  // could load one scene while the navigation marks another as current.
  const fallback = await loadScene('no-such-scene');
  const expected = await loadScene(DEFAULT_SCENE_ID);
  assert.equal(fallback, expected);
});

test('scene links keep working, with or without the slash', () => {
  for (const scene of SCENES) {
    assert.equal(resolveSceneId(`#/${scene.slug}`), scene.id);
    assert.equal(resolveSceneId(`#${scene.slug}`), scene.id);
  }
  assert.equal(resolveSceneId('#/not-a-scene'), DEFAULT_SCENE_ID);
  assert.equal(resolveSceneId(''), DEFAULT_SCENE_ID);
});

test('the two scenes that shipped first keep the ids their links use', () => {
  // Published URLs. Renaming either one silently breaks every link to it.
  assert.ok(sceneById('heart-failure'), '#/heart-failure still resolves');
  assert.ok(sceneById('amyloid-beta'), '#/amyloid-beta still resolves');
});
