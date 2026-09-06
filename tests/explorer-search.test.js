import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';
import { PUBLIC_SCENES } from '../src/catalog/index.js';
import { organById, systemById } from '../src/catalog/taxonomy.js';
import { clinicalReviewForScene } from '../src/catalog/clinicalReview.js';
import { activeUsesForScene, featuresForScene, patientUseEnabled } from '../src/access/features.js';
import {
  emptyOrganMatchesExplorerFilters,
  plannedMatchesExplorerFilters,
  queryTokens,
  sceneMatchesExplorerFilters,
  tokenMatches,
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
  assert.equal(sceneMatchesExplorerFilters(recordFor('copd-hyperinflation'), { query: 'stale' }), true);
  assert.equal(sceneMatchesExplorerFilters(recordFor('heart-failure'), { query: 'legacy-unversioned' }), true);
});

/* --------------------------------------------------------------------------
   Names. What a card shows is what a reader types.
   -------------------------------------------------------------------------- */

test('explorer search: every public model is found by the exact title its card shows, in both languages', () => {
  for (const scene of PUBLIC_SCENES) {
    const record = recordFor(scene.id);
    assert.equal(sceneMatchesExplorerFilters(record, { query: scene.titleEn }), true, `${scene.id}: "${scene.titleEn}"`);
    assert.equal(sceneMatchesExplorerFilters(record, { query: scene.titleJa }), true, `${scene.id}: "${scene.titleJa}"`);
    if (scene.storyTitleEn) {
      assert.equal(sceneMatchesExplorerFilters(record, { query: scene.storyTitleEn }), true, `${scene.id}: story title`);
      assert.equal(sceneMatchesExplorerFilters(record, { query: scene.storyTitleJa }), true, `${scene.id}: story title (ja)`);
    }
  }
});

test('explorer search: textbook names, common abbreviations and Japanese terms reach the right model', () => {
  const found = (query) =>
    PUBLIC_SCENES.filter((scene) => sceneMatchesExplorerFilters(recordFor(scene.id), { query })).map((scene) => scene.id);
  // Displayed names that the explorer used to override locally and could not find.
  assert.deepEqual(found('肺水腫'), ['pulmonary-edema']);
  assert.deepEqual(found('Pulmonary oedema'), ['pulmonary-edema']);
  assert.deepEqual(found('ネフローゼ'), ['renal-filtration']);
  assert.deepEqual(found('AKI・CKD・ネフローゼ症候群'), ['renal-filtration']);
  assert.deepEqual(found('Low cardiac output'), ['circulation']);
  assert.deepEqual(found('Alzheimer病'), ['amyloid-beta']);
  // Abbreviations and Japanese synonyms that are not in any title.
  assert.deepEqual(found('PE'), ['pulmonary-embolism']);
  assert.deepEqual(found('肺血栓塞栓症'), ['pulmonary-embolism']);
  assert.deepEqual(found('CAP'), ['pneumonia-consolidation']);
  assert.deepEqual(found('市中肺炎'), ['pneumonia-consolidation']);
  assert.deepEqual(found('HF'), ['heart-failure']);
  assert.deepEqual(found('CKD'), ['renal-filtration']);
  assert.ok(found('AKI').includes('renal-filtration') && found('AKI').includes('hepatorenal-syndrome'));
  assert.deepEqual(found('慢性閉塞性肺疾患'), ['copd-hyperinflation']);
  assert.deepEqual(found('気管支喘息'), ['asthma-heterogeneity']);
});

test('explorer search: a short Latin token is a whole word, not a substring', () => {
  assert.equal(tokenMatches('pulmonary embolism PE', 'pe'), true);
  assert.equal(tokenMatches('peristalsis and perfusion under pressure', 'pe'), false);
  assert.equal(tokenMatches('HRS-AKI', 'aki'), true, 'a hyphen bounds a word');
  assert.equal(tokenMatches('capillary', 'cap'), false);
  assert.equal(tokenMatches('CAP (community-acquired)', 'cap'), true);
  // Longer tokens and non-Latin script keep substring matching.
  assert.equal(tokenMatches('copd-hyperinflation', 'copd'), true);
  assert.equal(tokenMatches('肺水腫', '肺'), true);
  const hits = PUBLIC_SCENES.filter((scene) => sceneMatchesExplorerFilters(recordFor(scene.id), { query: 'pe' }));
  assert.deepEqual(hits.map((scene) => scene.id), ['pulmonary-embolism']);
});

/* --------------------------------------------------------------------------
   Uses. A filter shows what a card shows, and patient explanation fails closed.
   -------------------------------------------------------------------------- */

test('explorer use filters: patient explanation fails closed while no current versioned clinical review exists', () => {
  // Same rule as the paid Patient mode in features.js. Today every authored
  // patient use is either legacy-unversioned, stale or pending, so the filter
  // must be empty rather than list an unreviewed alpha as a patient tool.
  const patient = SCENE_MANIFEST.filter((scene) => sceneMatchesExplorerFilters(recordFor(scene.id), { mode: 'patient' }));
  assert.deepEqual(patient.map((scene) => scene.id).sort(), []);
  for (const scene of SCENE_MANIFEST) {
    if (!(scene.uses ?? []).includes('patient')) continue;
    assert.equal(patientUseEnabled(scene), false, `${scene.id}: declared patient use must stay gated`);
    assert.ok(!activeUsesForScene(scene).includes('patient'), `${scene.id}: no patient badge before review`);
    assert.notEqual(clinicalReviewForScene(scene)?.reviewStatus, 'reviewed', scene.id);
  }
});

test('explorer use filters: a reviewed model with a current clinical review re-enables patient explanation from its declaration alone', () => {
  const base = recordFor('copd-hyperinflation');
  const reviewedScene = { ...base.scene, id: 'reviewed-copy', status: 'reviewed' };
  // No registry entry exists for the copy, so it is still gated …
  assert.equal(patientUseEnabled(reviewedScene), false);
  // … and an unreviewed alpha stays gated whatever it declares.
  const alpha = { ...base.scene, id: 'alpha-copy', status: 'alpha', uses: ['patient', 'education'] };
  assert.equal(patientUseEnabled(alpha), false);
  assert.deepEqual(activeUsesForScene(alpha), ['education']);
  // The rule is the paid rule: whatever `featuresForScene` would unlock for
  // patient content, the use badge unlocks, never more.
  for (const scene of SCENE_MANIFEST) {
    if (featuresForScene(scene).patient) assert.equal(patientUseEnabled(scene), true, scene.id);
    if (!(scene.uses ?? []).includes('patient')) assert.equal(patientUseEnabled(scene), false, scene.id);
  }
});

test('explorer use filters: education and clinical case learning follow the declaration', () => {
  const education = SCENE_MANIFEST.filter((scene) => sceneMatchesExplorerFilters(recordFor(scene.id), { mode: 'education' }));
  assert.ok(education.some((scene) => scene.id === 'brain-anatomy'));
  assert.ok(education.some((scene) => scene.id === 'pneumonia-consolidation'));
  assert.equal(sceneMatchesExplorerFilters(recordFor('heart-failure'), { mode: 'clinical-learning' }), true);
  assert.equal(sceneMatchesExplorerFilters(recordFor('circulation'), { mode: 'clinical-learning' }), true);
  assert.equal(sceneMatchesExplorerFilters(recordFor('brain-anatomy'), { mode: 'clinical-learning' }), false);
  // A use is a catalogue context, not a search term: "patient" must not find
  // every scene declared for patients.
  const byWord = PUBLIC_SCENES.filter((scene) => sceneMatchesExplorerFilters(recordFor(scene.id), { query: 'patient' }));
  assert.ok(byWord.length < PUBLIC_SCENES.length);
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
  assert.equal(sceneMatchesExplorerFilters(recordFor('copd-hyperinflation'), { review: 'stale' }), true);
  assert.equal(sceneMatchesExplorerFilters(recordFor('copd-hyperinflation'), { review: 'reviewed' }), false);
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
      review: 'stale',
    }),
    true
  );
  assert.equal(
    sceneMatchesExplorerFilters(recordFor('copd-hyperinflation'), {
      status: 'reviewed',
      review: 'reviewed',
    }),
    false
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
