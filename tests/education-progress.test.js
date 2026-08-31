import test from 'node:test';
import assert from 'node:assert/strict';
import { educationCompletionSummary } from '../src/access/educationProgress.js';

const SCENES = ['amyloid-beta', 'heart-failure', 'copd-hyperinflation', 'asthma-heterogeneity', 'portal-hypertension'];

test('education progress: counts only current catalogue scenes and guided teaching module', () => {
  const summary = educationCompletionSummary([
    { sceneId: 'amyloid-beta', moduleId: 'guided-teaching', completed: true },
    { sceneId: 'heart-failure', moduleId: 'guided-teaching', completed: false },
    { sceneId: 'retired-scene', moduleId: 'guided-teaching', completed: true },
    { sceneId: 'copd-hyperinflation', moduleId: 'legacy-module', completed: true },
  ], SCENES);

  assert.equal(summary.total, 5);
  assert.equal(summary.completed, 1);
  assert.equal(summary.started, 2);
  assert.equal(summary.percent, 20);
  assert.equal(summary.isComplete, false);
});

test('education progress: completion is stable when rows contain snake_case server shapes', () => {
  const rows = SCENES.map((sceneId, index) => ({
    scene_id: sceneId,
    module_id: 'guided-teaching',
    step_index: index,
    completed: true,
  }));
  const summary = educationCompletionSummary(rows, SCENES);
  assert.deepEqual(summary, {
    total: 5,
    completed: 5,
    started: 5,
    percent: 100,
    isComplete: true,
  });
});

test('education progress: empty catalogue never reports complete', () => {
  const summary = educationCompletionSummary([
    { sceneId: 'amyloid-beta', moduleId: 'guided-teaching', completed: true },
  ], []);
  assert.equal(summary.total, 0);
  assert.equal(summary.percent, 0);
  assert.equal(summary.isComplete, false);
});
