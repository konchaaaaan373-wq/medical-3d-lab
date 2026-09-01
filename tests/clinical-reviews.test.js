import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';

const REVIEW_STATUSES = new Set(['reviewed', 'stale', 'pending', 'legacy-unversioned']);
const registry = JSON.parse(
  readFileSync(new URL('../docs/clinical-reviews/registry.json', import.meta.url), 'utf8')
);
const byScene = new Map(registry.map((record) => [record.sceneId, record]));

const isNonEmptyStrings = (value) =>
  Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && item.trim().length > 0);

function hasHistoricalAttestation(record) {
  return record.reviewStatus === 'reviewed' || record.reviewStatus === 'stale';
}

test('clinical review registry has one well-formed row per recorded scene', () => {
  assert.equal(byScene.size, registry.length, 'scene ids in the review registry are unique');

  for (const record of registry) {
    assert.ok(SCENE_MANIFEST.some((scene) => scene.id === record.sceneId), `${record.sceneId} exists in the scene manifest`);
    assert.ok(REVIEW_STATUSES.has(record.reviewStatus), `${record.sceneId} has a recognised review status`);
    assert.ok(typeof record.reviewerRole === 'string' && record.reviewerRole.trim(), `${record.sceneId} records reviewer role`);
    assert.ok(isNonEmptyStrings(record.scope), `${record.sceneId} records the scope that was actually reviewed/prepared`);
    assert.ok(isNonEmptyStrings(record.sources), `${record.sceneId} names its evidence boundary`);
    assert.ok(isNonEmptyStrings(record.unresolvedLimitations), `${record.sceneId} keeps unresolved limitations visible`);

    if (hasHistoricalAttestation(record)) {
      assert.match(record.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, `${record.sceneId} has a historical review date`);
      assert.match(record.reviewedCommit, /^[0-9a-f]{40}$/, `${record.sceneId} pins the historically reviewed commit`);
      assert.match(record.reviewerRole, /clinical reviewer/i, `${record.sceneId} names an actual clinical review role`);
      assert.ok(
        !/no completed clinical sign-off|historical review role not recorded under the current registry standard/i.test(
          record.reviewerRole
        ),
        `${record.sceneId} cannot claim a historical attestation without a completed clinical review`
      );
    } else {
      assert.equal(record.reviewedAt, null, `${record.sceneId} does not invent a review date`);
      assert.equal(record.reviewedCommit, null, `${record.sceneId} does not invent a reviewed commit`);
    }

    if (record.reviewStatus === 'stale') {
      assert.ok(typeof record.staleReason === 'string' && record.staleReason.trim(), `${record.sceneId} explains why review is stale`);
      assert.ok(isNonEmptyStrings(record.stalePaths), `${record.sceneId} records changed in-scope paths that invalidated currency`);
    }
  }
});

test('every public non-prototype scene has an explicit medical review state', () => {
  for (const scene of SCENE_MANIFEST.filter((entry) => entry.status !== 'prototype')) {
    assert.ok(byScene.has(scene.id), `${scene.id} must be present in the clinical review registry`);
  }
});

test('model-reviewed catalogue maturity may retain a stale historical clinical review, but cannot invent one', () => {
  for (const scene of SCENE_MANIFEST.filter((entry) => entry.status === 'reviewed')) {
    const state = byScene.get(scene.id)?.reviewStatus;
    assert.ok(
      state === 'reviewed' || state === 'stale',
      `${scene.id} uses Model reviewed maturity but has neither current nor historical clinical attestation`
    );
  }
});

test('alpha scenes cannot silently acquire a current reviewed medical claim', () => {
  for (const scene of SCENE_MANIFEST.filter((entry) => entry.status === 'alpha')) {
    assert.notEqual(byScene.get(scene.id)?.reviewStatus, 'reviewed', `${scene.id} is alpha and still awaits current sign-off`);
  }
});

test('stale reviews preserve history while explicitly refusing current reviewed status', () => {
  for (const sceneId of ['copd-hyperinflation', 'asthma-heterogeneity', 'portal-hypertension']) {
    const record = byScene.get(sceneId);
    assert.equal(record?.reviewStatus, 'stale', sceneId);
    assert.equal(record?.reviewedCommit, 'b77cb83a7f41056a1eda9ad0d4c7492e85bd2376', sceneId);
    assert.ok(record?.stalePaths?.length, sceneId);
  }
});

test('legacy production scenes are not backfilled with a guessed review attestation', () => {
  const legacy = ['heart-failure', 'amyloid-beta'];
  for (const sceneId of legacy) {
    const scene = SCENE_MANIFEST.find((entry) => entry.id === sceneId);
    assert.equal(scene?.status, 'production');
    assert.equal(byScene.get(sceneId)?.reviewStatus, 'legacy-unversioned');
    assert.equal(byScene.get(sceneId)?.reviewedCommit, null);
  }
});
