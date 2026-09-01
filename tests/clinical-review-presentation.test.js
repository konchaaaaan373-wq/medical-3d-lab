import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_SCENES } from '../src/catalog/index.js';
import {
  CLINICAL_REVIEW_RECORDS,
  clinicalReviewForScene,
  clinicalReviewPresentation,
} from '../src/catalog/clinicalReview.js';

test('every public scene has an explicit clinical-review record', () => {
  const ids = new Set(CLINICAL_REVIEW_RECORDS.map((record) => record.sceneId));
  for (const scene of PUBLIC_SCENES) {
    assert.ok(ids.has(scene.id), `${scene.id} is public but has no clinical-review record`);
    assert.ok(clinicalReviewForScene(scene), `${scene.id} cannot be resolved through the runtime review registry`);
  }
});

test('catalogue Reviewed maturity requires a versioned clinical review', () => {
  for (const scene of PUBLIC_SCENES.filter((entry) => entry.status === 'reviewed')) {
    const record = clinicalReviewForScene(scene);
    assert.equal(record?.reviewStatus, 'reviewed', `${scene.id} says Model reviewed without clinical attestation`);
    assert.match(record.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(record.reviewedCommit, /^[0-9a-f]{40}$/);
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

test('pending and reviewed states have visibly different trust labels', () => {
  const pending = clinicalReviewPresentation('brain-anatomy');
  const reviewed = clinicalReviewPresentation('copd-hyperinflation');
  assert.equal(pending.status, 'pending');
  assert.equal(reviewed.status, 'reviewed');
  assert.notEqual(pending.en, reviewed.en);
  assert.match(pending.ja, /未完了/);
  assert.match(reviewed.ja, /完了/);
});

test('missing review metadata fails visibly rather than pretending to be reviewed', () => {
  const missing = clinicalReviewPresentation('not-a-scene');
  assert.equal(missing.status, 'unrecorded');
  assert.match(missing.en, /Not recorded/);
  assert.match(missing.ja, /記録なし/);
});
