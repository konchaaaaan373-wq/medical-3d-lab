import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';
import { organById, systemById } from '../src/catalog/taxonomy.js';
import {
  emptyOrganMatchesExplorerFilters,
  plannedMatchesExplorerFilters,
  queryTokens,
  sceneMatchesExplorerFilters,
} from '../src/app/explorerSearch.js';

function recordFor(sceneId) {
  const scene = SCENE_MANIFEST.find((entry) => entry.id === sceneId);
  assert.ok(scene, `Missing scene ${sceneId}`);
  const system = systemById(scene.system);
  const organ = organById(scene.organ);
  assert.ok(system, `${sceneId}: missing system ${scene.system}`);
  assert.ok(organ, `${sceneId}: missing organ ${scene.organ}`);
  return { scene, system, organ };
}

test('explorer search: splits a query into case-folded AND tokens', () => {
  assert.deepEqual(queryTokens('  COPD   Lung  '), ['copd', 'lung']);
});

test('explorer search: finds a scene through disease, organ, tags and Japanese copy', () => {
  const copd = recordFor('copd-hyperinflation');
  assert.equal(sceneMatchesExplorerFilters(copd, { query: 'copd' }), true);
  assert.equal(sceneMatchesExplorerFilters(copd, { query: 'lungs flow-limitation' }), true);
  assert.equal(sceneMatchesExplorerFilters(copd, { query: '肺 呼気' }), true);
  assert.equal(sceneMatchesExplorerFilters(copd, { query: 'portal' }), false);
});

test('explorer search: clinical review metadata is searchable without copying it into the scene manifest', () => {
  assert.equal(sceneMatchesExplorerFilters(recordFor('copd-hyperinflation'), { query: 'reviewed' }), true);
  assert.equal(sceneMatchesExplorerFilters(recordFor('heart-failure'), { query: 'legacy-unversioned' }), true);
});

test('explorer filters: Patient and Education expose only versioned clinically reviewed authored scenes', () => {
  const patient = SCENE_MANIFEST.filter((scene) => sceneMatchesExplorerFilters(recordFor(scene.id), { mode: 'patient' }));
  const education = SCENE_MANIFEST.filter((scene) => sceneMatchesExplorerFilters(recordFor(scene.id), { mode: 'education' }));

  const expected = ['copd-hyperinflation', 'asthma-heterogeneity', 'portal-hypertension'].sort();
  assert.deepEqual(patient.map((scene) => scene.id).sort(), expected);
  assert.deepEqual(education.map((scene) => scene.id).sort(), expected);
});

test('explorer filters: authored legacy guides are hidden from paid product filters until re-reviewed', () => {
  for (const sceneId of ['heart-failure', 'amyloid-beta']) {
    assert.equal(sceneMatchesExplorerFilters(recordFor(sceneId), { mode: 'patient' }), false, sceneId);
    assert.equal(sceneMatchesExplorerFilters(recordFor(sceneId), { mode: 'education' }), false, sceneId);
  }
});

test('explorer filters: reviewed-plus means model maturity reviewed or production, not prototype', () => {
  assert.equal(sceneMatchesExplorerFilters(recordFor('heart-failure'), { status: 'reviewed-plus' }), true);
  assert.equal(sceneMatchesExplorerFilters(recordFor('copd-hyperinflation'), { status: 'reviewed-plus' }), true);
  assert.equal(sceneMatchesExplorerFilters(recordFor('breathing-lungs'), { status: 'reviewed-plus' }), false);
});

test('explorer filters: exact maturity filters remain exact', () => {
  assert.equal(sceneMatchesExplorerFilters(recordFor('heart-failure'), { status: 'production' }), true);
  assert.equal(sceneMatchesExplorerFilters(recordFor('copd-hyperinflation'), { status: 'production' }), false);
  assert.equal(sceneMatchesExplorerFilters(recordFor('copd-hyperinflation'), { status: 'reviewed' }), true);
  assert.equal(sceneMatchesExplorerFilters(recordFor('breathing-lungs'), { status: 'prototype' }), true);
});

test('explorer filters: clinical review is independent of maturity', () => {
  assert.equal(sceneMatchesExplorerFilters(recordFor('copd-hyperinflation'), { review: 'reviewed' }), true);
  assert.equal(sceneMatchesExplorerFilters(recordFor('heart-failure'), { review: 'reviewed' }), false);
  assert.equal(sceneMatchesExplorerFilters(recordFor('heart-failure'), { review: 'legacy-unversioned' }), true);
  assert.equal(sceneMatchesExplorerFilters(recordFor('brain-anatomy'), { review: 'pending' }), true);
  assert.equal(sceneMatchesExplorerFilters(recordFor('hepatorenal-syndrome'), { review: 'pending' }), true);
});

test('explorer filters: maturity and clinical review can be combined without conflating them', () => {
  assert.equal(
    sceneMatchesExplorerFilters(recordFor('heart-failure'), {
      status: 'production',
      review: 'legacy-unversioned',
    }),
    true
  );
  assert.equal(
    sceneMatchesExplorerFilters(recordFor('heart-failure'), {
      status: 'production',
      review: 'reviewed',
    }),
    false
  );
  assert.equal(
    sceneMatchesExplorerFilters(recordFor('copd-hyperinflation'), {
      status: 'reviewed',
      review: 'reviewed',
    }),
    true
  );
});

test('explorer filters: planned and empty backlog rows never satisfy paid/status/review filters', () => {
  const system = { id: 'renal', label: 'Renal', labelJa: '腎・泌尿器' };
  const organ = { id: 'kidney', label: 'Kidney', labelJa: '腎臓' };
  const planned = { titleEn: 'CKD', titleJa: '慢性腎臓病', disease: 'ckd' };

  assert.equal(plannedMatchesExplorerFilters({ planned, system, organ }, { query: 'CKD' }), true);
  assert.equal(plannedMatchesExplorerFilters({ planned, system, organ }, { mode: 'patient' }), false);
  assert.equal(plannedMatchesExplorerFilters({ planned, system, organ }, { status: 'reviewed' }), false);
  assert.equal(plannedMatchesExplorerFilters({ planned, system, organ }, { review: 'reviewed' }), false);
  assert.equal(emptyOrganMatchesExplorerFilters({ system, organ }, { query: '腎臓' }), true);
  assert.equal(emptyOrganMatchesExplorerFilters({ system, organ }, { status: 'production' }), false);
  assert.equal(emptyOrganMatchesExplorerFilters({ system, organ }, { review: 'pending' }), false);
});
