import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PUBLIC_SCENES } from '../src/catalog/index.js';
import {
  CLINICAL_REVIEW_RECORDS,
  clinicalReviewForScene,
  clinicalReviewMatchesFilter,
  clinicalReviewPresentation,
  modelCardForScene,
} from '../src/catalog/clinicalReview.js';

test('every public scene has an explicit clinical-review record', () => {
  const ids = new Set(CLINICAL_REVIEW_RECORDS.map((record) => record.sceneId));
  for (const scene of PUBLIC_SCENES) {
    assert.ok(ids.has(scene.id), `${scene.id} is public but has no clinical-review record`);
    assert.ok(clinicalReviewForScene(scene), `${scene.id} cannot be resolved through the runtime review registry`);
  }
});

test('every public scene has a model card in the same trust registry', () => {
  for (const scene of PUBLIC_SCENES) {
    const path = modelCardForScene(scene);
    assert.ok(path, `${scene.id} is public but its Clinical Review record names no model card`);
    const card = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
    assert.match(
      card,
      new RegExp(`\\b${scene.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`),
      `${path} does not identify ${scene.id}`
    );
  }
});

test('catalogue Reviewed maturity preserves either current or stale versioned clinical review history', () => {
  for (const scene of PUBLIC_SCENES.filter((entry) => entry.status === 'reviewed')) {
    const record = clinicalReviewForScene(scene);
    assert.ok(['reviewed', 'stale'].includes(record?.reviewStatus), `${scene.id} has no versioned clinical review history`);
    assert.match(record.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(record.reviewedCommit, /^[0-9a-f]{40}$/);
    if (record.reviewStatus === 'stale') {
      assert.ok(record.staleReason, `${scene.id}: stale review must say why re-review is required`);
    }
  }
});

test('production maturity does not erase legacy review state', () => {
  for (const sceneId of ['heart-failure', 'amyloid-beta']) {
    const presentation = clinicalReviewPresentation(sceneId);
    assert.equal(presentation.status, 'legacy-unversioned');
    assert.match(presentation.en, /Legacy \/ unversioned/);
    assert.match(presentation.ja, /旧基準・版固定なし/);
  }
});

test('pending, stale and legacy states have visibly different trust labels', () => {
  const pending = clinicalReviewPresentation('brain-anatomy');
  const stale = clinicalReviewPresentation('copd-hyperinflation');
  const legacy = clinicalReviewPresentation('heart-failure');

  assert.equal(pending.status, 'pending');
  assert.equal(stale.status, 'stale');
  assert.equal(legacy.status, 'legacy-unversioned');
  assert.equal(new Set([pending.en, stale.en, legacy.en]).size, 3);
  assert.match(pending.ja, /未完了/);
  assert.match(stale.ja, /再レビュー必要/);
  assert.match(legacy.ja, /旧基準・版固定なし/);
});

test('clinical-review filter distinguishes stale from current reviewed status', () => {
  assert.equal(clinicalReviewMatchesFilter('copd-hyperinflation', 'stale'), true);
  assert.equal(clinicalReviewMatchesFilter('copd-hyperinflation', 'reviewed'), false);
  assert.equal(clinicalReviewMatchesFilter('brain-anatomy', 'pending'), true);
  assert.equal(clinicalReviewMatchesFilter('heart-failure', 'legacy-unversioned'), true);
});

test('missing review metadata fails visibly rather than pretending to be reviewed', () => {
  const missing = clinicalReviewPresentation('not-a-scene');
  assert.equal(missing.status, 'unrecorded');
  assert.match(missing.en, /Not recorded/);
  assert.match(missing.ja, /記録なし/);
});
