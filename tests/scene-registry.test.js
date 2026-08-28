import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SCENES,
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

test('every system tab leads somewhere', () => {
  for (const system of systemsWithScenes()) {
    assert.ok(system.scenes.length > 0, `${system.id} has at least one scene`);
    assert.ok(system.label?.length && system.labelJa?.length, `${system.id} is named in both languages`);
  }
});

test('the grouping covers every scene exactly once, in registration order', () => {
  const grouped = systemsWithScenes().flatMap((system) => system.scenes.map((scene) => scene.id));
  assert.deepEqual([...grouped].sort(), SCENES.map((scene) => scene.id).sort(), 'nothing dropped or duplicated');
  for (const system of systemsWithScenes()) {
    const order = system.scenes.map((scene) => SCENES.findIndex((entry) => entry.id === scene.id));
    assert.deepEqual(order, [...order].sort((a, b) => a - b), `${system.id} keeps registration order`);
  }
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
