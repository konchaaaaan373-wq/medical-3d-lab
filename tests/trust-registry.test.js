import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PUBLIC_SCENES } from '../src/catalog/index.js';

const readJson = (path) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const internal = readJson('docs/clinical-reviews/registry.json');
const publicCopy = readJson('public/trust/clinical-reviews.json');

test('public Trust data is an exact read-only projection of the clinical review registry', () => {
  assert.deepEqual(publicCopy, internal);
});

test('every public non-prototype scene is visible on the Trust surface', () => {
  const ids = new Set(publicCopy.map((record) => record.sceneId));
  for (const scene of PUBLIC_SCENES) assert.ok(ids.has(scene.id), `${scene.id} is missing from public Trust data`);
});

test('Trust data never turns missing sign-off into a reviewed claim', () => {
  for (const record of publicCopy) {
    if (record.reviewStatus === 'reviewed') {
      assert.match(record.reviewedAt, /^\d{4}-\d{2}-\d{2}$/);
      assert.match(record.reviewedCommit, /^[0-9a-f]{40}$/);
    } else {
      assert.equal(record.reviewedAt, null);
      assert.equal(record.reviewedCommit, null);
    }
  }
});
