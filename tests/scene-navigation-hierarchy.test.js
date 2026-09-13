import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';
import { activeUsesForScene } from '../src/access/features.js';
import { activeUsesForSceneEntry } from '../src/access/sceneUses.js';
import {
  navigationKindGroups,
  navigationUseLabel,
} from '../src/app/sceneNavigationModel.js';

const scene = (id) => {
  const found = SCENE_MANIFEST.find((entry) => entry.id === id);
  assert.ok(found, `${id}: scene exists`);
  return found;
};

test('navigation uses the same fail-closed patient-use gate as product features', () => {
  for (const entry of SCENE_MANIFEST) {
    assert.deepEqual(
      activeUsesForSceneEntry(entry),
      activeUsesForScene(entry),
      entry.id
    );
  }
});

test('navigation never labels education-only circulation as patient explanation', () => {
  const circulation = scene('circulation');
  const uses = activeUsesForSceneEntry(circulation);
  assert.deepEqual(uses, ['education', 'clinical-learning']);
  assert.deepEqual(
    navigationUseLabel(circulation, uses),
    { en: 'Medical education', ja: '医学教育' }
  );
});

test('navigation hides patient explanation while a production scene lacks current review', () => {
  const heartFailure = scene('heart-failure');
  const uses = activeUsesForSceneEntry(heartFailure);
  assert.equal(heartFailure.uses.includes('patient'), true, 'patient is an authored intended use');
  assert.equal(uses.includes('patient'), false, 'patient use stays hidden until current review exists');
  assert.deepEqual(
    navigationUseLabel(heartFailure, uses),
    { en: 'Medical education', ja: '医学教育' }
  );
});

test('patient explanation remains the first visible product use when it is enabled', () => {
  const label = navigationUseLabel(
    { disease: 'example' },
    ['education', 'patient', 'clinical-learning']
  );
  assert.deepEqual(
    label,
    { en: 'Patient explanation · Medical education', ja: '患者説明・医学教育' }
  );
});

test('a pathology-only organ keeps the disease/pathophysiology hierarchy level', () => {
  const circulation = scene('circulation');
  const kinds = navigationKindGroups({
    foundation: [],
    pathophysiology: [circulation],
  });
  assert.equal(kinds.length, 1);
  assert.equal(kinds[0].id, 'pathophysiology');
  assert.equal(kinds[0].labelJa, '病態');
  assert.equal(kinds[0].scenes[0].id, 'circulation');
});
