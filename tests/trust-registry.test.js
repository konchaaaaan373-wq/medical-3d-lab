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
  // Through `src/catalog/clinicalReview.js`, which imports the registry and is
  // also what the Explorer and the scene title cards read. Reading the JSON
  // directly here would be a second reader with its own vocabulary, which is
  // how a scene ends up "Reviewed" on one surface and something else on
  // another — the thing this test exists to prevent.
  assert.match(trustSource, /from '\.\.\/catalog\/clinicalReview\.js'/);
  assert.ok(
    !trustSource.includes('clinical-reviews/registry.json'),
    'Trust must read review state through the catalogue module, not the file'
  );
  assert.ok(!trustSource.includes('/trust/clinical-reviews.json'), 'Trust must not fetch a duplicated public registry');
});

test('trust surface: a stale review says so, and says what changed', () => {
  const source = readFileSync(new URL('../src/app/Trust.js', import.meta.url), 'utf8');
  assert.match(source, /review\.status !== 'stale'/);
  assert.match(source, /stalePaths/);
  assert.match(source, /Changed after this review/);

  // And the labels come from the shared vocabulary rather than a second copy.
  assert.ok(!source.includes('REVIEW_LABELS'), 'Trust must not keep its own review labels');
  assert.match(source, /clinicalReviewPresentation\(scene\)/);
});

test('trust surface: every stale record has something to show for it', () => {
  const registry = JSON.parse(
    readFileSync(new URL('../docs/clinical-reviews/registry.json', import.meta.url), 'utf8')
  );
  const stale = registry.filter((record) => record.reviewStatus === 'stale');
  assert.ok(stale.length > 0, 'the stale rendering path should be exercised by a real record');
  for (const record of stale) {
    assert.ok(
      Array.isArray(record.stalePaths) && record.stalePaths.length > 0,
      `${record.sceneId}: marked stale without naming what changed`
    );
    assert.match(record.reviewedCommit ?? '', /^[0-9a-f]{40}$/, `${record.sceneId}: stale implies a real past review`);
  }
});
