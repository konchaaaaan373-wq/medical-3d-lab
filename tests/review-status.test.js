import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SCENES } from '../src/catalog/index.js';

const REVIEW_STATUSES = new Set(['alpha', 'reviewed']);
const STATUS_MARKER = /\*\*Catalog status:\*\*\s*`(prototype|alpha|reviewed|production)`/;

test('every alpha or reviewed scene has a model card with the same public status', () => {
  for (const scene of SCENES.filter((entry) => REVIEW_STATUSES.has(entry.status))) {
    assert.ok(scene.modelCard, `${scene.id} must declare a modelCard path`);

    const card = readFileSync(new URL(`../${scene.modelCard}`, import.meta.url), 'utf8');
    const marker = card.match(STATUS_MARKER);

    assert.ok(marker, `${scene.modelCard} must contain an explicit Catalog status marker`);
    assert.equal(
      marker[1],
      scene.status,
      `${scene.id}: model card says ${marker[1]}, but the public catalogue says ${scene.status}`
    );
  }
});
