import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ORGANS,
  SCENES,
  DEFAULT_SCENE_ID,
  organsWithScenes,
  loadScene,
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

test('a scene naming an organ that does not exist is reported, not swallowed', () => {
  const warnings = [];
  const original = console.warn;
  console.warn = (message) => warnings.push(message);
  try {
    const grouped = organsWithScenes([...SCENES, { id: 'orphan', organ: 'spleen', label: 'Orphan' }], ORGANS);
    assert.ok(!grouped.some((organ) => organ.scenes.some((scene) => scene.id === 'orphan')));
    assert.equal(warnings.length, 1, 'exactly one warning');
    assert.match(warnings[0], /orphan/, 'and it names the scene');
    assert.match(warnings[0], /spleen/, 'and the organ it asked for');
  } finally {
    console.warn = original;
  }
});

test('the registry as it stands warns about nothing', () => {
  const warnings = [];
  const original = console.warn;
  console.warn = (message) => warnings.push(message);
  try {
    organsWithScenes();
    assert.deepEqual(warnings, []);
  } finally {
    console.warn = original;
  }
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

test('the default scene is a real scene, named rather than positional', () => {
  assert.ok(
    SCENES.some((scene) => scene.id === DEFAULT_SCENE_ID),
    'DEFAULT_SCENE_ID points at a registered scene'
  );
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
    assert.equal(resolveSceneId(`#/${scene.id}`), scene.id);
    assert.equal(resolveSceneId(`#${scene.id}`), scene.id);
  }
  assert.equal(resolveSceneId('#/not-a-scene'), DEFAULT_SCENE_ID);
  assert.equal(resolveSceneId(''), DEFAULT_SCENE_ID);
});
