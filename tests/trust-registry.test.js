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

test('Trust data never turns missing sign-off into a reviewed claim', () => {
  for (const record of registry) {
    if (record.reviewStatus === 'reviewed') {
      assert.match(record.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
      assert.match(record.reviewedCommit, /^[0-9a-f]{40}$/);
    } else {
      assert.equal(record.reviewedAt, null);
      assert.equal(record.reviewedCommit, null);
    }
  }
});

test('Clinical Review registry is the only browser Trust source of truth', () => {
  const trustSource = readFileSync(new URL('../src/app/Trust.js', import.meta.url), 'utf8');
  assert.match(trustSource, /docs\/clinical-reviews\/registry\.json/);
  assert.ok(!trustSource.includes('/trust/clinical-reviews.json'), 'Trust must not fetch a duplicated public registry');
});


test('trust surface: a review whose model has changed says so on the public page', () => {
  const source = readFileSync(new URL('../src/app/Trust.js', import.meta.url), 'utf8');
  assert.match(source, /modelChangedSinceReview/);
  assert.match(source, /Model changed after this review/);
  assert.match(source, /changedSinceReview\(record\)/);

  // And there is at least one to show, or the code path is untested by use.
  const registry = JSON.parse(
    readFileSync(new URL('../docs/clinical-reviews/registry.json', import.meta.url), 'utf8')
  );
  const drifted = registry.filter((record) => record.modelChangedSinceReview);
  for (const record of drifted) {
    assert.equal(record.reviewStatus, 'reviewed', `${record.sceneId}: only a completed review can drift`);
  }
});
