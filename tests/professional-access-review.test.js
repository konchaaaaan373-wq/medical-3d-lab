import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';
import { clinicalReviewForScene } from '../src/catalog/clinicalReview.js';
import { featuresForScene, SCENE_PRODUCT_FEATURES } from '../src/access/features.js';
import { patientGuideFor } from '../src/data/patientGuides.js';
import { educationGuideFor } from '../src/data/educationGuides.js';

const scene = (id) => {
  const found = SCENE_MANIFEST.find((entry) => entry.id === id);
  assert.ok(found, `missing scene ${id}`);
  return found;
};

test('professional access: free core never depends on clinical-review completion', () => {
  for (const entry of SCENE_MANIFEST) {
    assert.equal(featuresForScene(entry).core, 'free', entry.id);
  }
});

test('professional access: Patient/Education require a versioned reviewed attestation', () => {
  for (const entry of SCENE_MANIFEST) {
    const features = featuresForScene(entry);
    if (!features.patient && !features.education) continue;
    assert.equal(
      clinicalReviewForScene(entry)?.reviewStatus,
      'reviewed',
      `${entry.id} exposed a professional mode without versioned clinical review`
    );
  }
});

test('professional access: legacy production scenes retain authored guides but fail closed', () => {
  for (const id of ['heart-failure', 'amyloid-beta']) {
    const entry = scene(id);
    assert.equal(entry.status, 'production');
    assert.equal(clinicalReviewForScene(entry)?.reviewStatus, 'legacy-unversioned');
    assert.ok(patientGuideFor(id), `${id}: authored Patient guide should remain for re-review`);
    assert.ok(educationGuideFor(id), `${id}: authored Education guide should remain for re-review`);
    assert.equal(featuresForScene(entry).patient, false, `${id}: Patient must fail closed`);
    assert.equal(featuresForScene(entry).education, false, `${id}: Education must fail closed`);
  }
});

test('professional access: versioned reviewed scenes expose their authored professional modes', () => {
  for (const id of ['copd-hyperinflation', 'asthma-heterogeneity', 'portal-hypertension']) {
    const entry = scene(id);
    assert.equal(clinicalReviewForScene(entry)?.reviewStatus, 'reviewed', id);
    assert.equal(featuresForScene(entry).patient, true, `${id}: Patient`);
    assert.equal(featuresForScene(entry).education, true, `${id}: Education`);
  }
});

test('professional access: authored declarations remain discoverable even when trust-gated', () => {
  for (const id of ['heart-failure', 'amyloid-beta']) {
    assert.ok(id in SCENE_PRODUCT_FEATURES, `${id}: authored product declaration disappeared`);
    assert.equal(SCENE_PRODUCT_FEATURES[id].patient, false);
    assert.equal(SCENE_PRODUCT_FEATURES[id].education, false);
  }
});
