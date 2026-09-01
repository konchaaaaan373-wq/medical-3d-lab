import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PUBLIC_SCENES } from '../src/catalog/index.js';

const registry = JSON.parse(
  readFileSync(new URL('../docs/clinical-reviews/registry.json', import.meta.url), 'utf8')
);

test('every public non-prototype scene is visible on the Trust surface', () => {
  const ids = new Set(registry.map((record) => record.sceneId));
  for (const scene of PUBLIC_SCENES) assert.ok(ids.has(scene.id), `${scene.id} is missing from Trust data`);
});

test('Trust data never turns missing or stale sign-off into a current reviewed claim', () => {
  for (const record of registry) {
    if (record.reviewStatus === 'reviewed') {
      assert.match(record.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
      assert.match(record.reviewedCommit, /^[0-9a-f]{40}$/);
      continue;
    }

    if (record.reviewStatus === 'stale') {
      // A stale record preserves the historical attestation for auditability,
      // while its reviewStatus prevents the current code from inheriting it.
      assert.match(record.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
      assert.match(record.reviewedCommit, /^[0-9a-f]{40}$/);
      assert.ok(record.staleReason, `${record.sceneId}: stale review must explain why it is stale`);
      assert.ok(record.stalePaths?.length, `${record.sceneId}: stale review must identify changed paths`);
      continue;
    }

    assert.equal(record.reviewedAt, null);
    assert.equal(record.reviewedCommit, null);
  }
});

test('Clinical Review registry is the only browser Trust source of truth', () => {
  const trustSource = readFileSync(new URL('../src/app/Trust.js', import.meta.url), 'utf8');
  assert.match(trustSource, /docs\/clinical-reviews\/registry\.json/);
  assert.ok(!trustSource.includes('/trust/clinical-reviews.json'), 'Trust must not fetch a duplicated public registry');
});
