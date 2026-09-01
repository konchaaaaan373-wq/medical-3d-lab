import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';

const REVIEW_STATUSES = new Set(['reviewed', 'pending', 'legacy-unversioned']);
const registry = JSON.parse(
  readFileSync(new URL('../docs/clinical-reviews/registry.json', import.meta.url), 'utf8')
);
const byScene = new Map(registry.map((record) => [record.sceneId, record]));

const isNonEmptyStrings = (value) =>
  Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string' && item.trim().length > 0);

test('clinical review registry has one well-formed row per recorded scene', () => {
  assert.equal(byScene.size, registry.length, 'scene ids in the review registry are unique');

  for (const record of registry) {
    assert.ok(SCENE_MANIFEST.some((scene) => scene.id === record.sceneId), `${record.sceneId} exists in the scene manifest`);
    assert.ok(REVIEW_STATUSES.has(record.reviewStatus), `${record.sceneId} has a recognised review status`);
    assert.ok(typeof record.reviewerRole === 'string' && record.reviewerRole.trim(), `${record.sceneId} records reviewer role`);
    assert.ok(isNonEmptyStrings(record.scope), `${record.sceneId} records the scope that was actually reviewed`);
    assert.ok(isNonEmptyStrings(record.sources), `${record.sceneId} names its evidence boundary`);
    assert.ok(isNonEmptyStrings(record.unresolvedLimitations), `${record.sceneId} keeps unresolved limitations visible`);

    if (record.reviewStatus === 'reviewed') {
      assert.match(record.reviewedAt, /^\d{4}-\d{2}-\d{2}$/, `${record.sceneId} has a versioned review date`);
      assert.match(record.reviewedCommit, /^[0-9a-f]{40}$/, `${record.sceneId} pins the exact reviewed commit`);
      assert.ok(
        !/not recorded|no completed/i.test(record.reviewerRole),
        `${record.sceneId} cannot call itself reviewed while saying no review role was recorded`
      );
    } else {
      assert.equal(record.reviewedAt, null, `${record.sceneId} does not invent a review date`);
      assert.equal(record.reviewedCommit, null, `${record.sceneId} does not invent a reviewed commit`);
    }
  }
});

test('every public non-prototype scene has an explicit medical review state', () => {
  for (const scene of SCENE_MANIFEST.filter((entry) => entry.status !== 'prototype')) {
    assert.ok(byScene.has(scene.id), `${scene.id} must be present in the clinical review registry`);
  }
});

test('a catalogue reviewed claim must have a versioned reviewed attestation', () => {
  for (const scene of SCENE_MANIFEST.filter((entry) => entry.status === 'reviewed')) {
    assert.equal(
      byScene.get(scene.id)?.reviewStatus,
      'reviewed',
      `${scene.id} cannot use the Reviewed catalogue tier without a versioned attestation`
    );
  }
});

test('alpha scenes cannot silently acquire a reviewed medical claim', () => {
  for (const scene of SCENE_MANIFEST.filter((entry) => entry.status === 'alpha')) {
    assert.notEqual(byScene.get(scene.id)?.reviewStatus, 'reviewed', `${scene.id} is alpha and still awaits sign-off`);
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
