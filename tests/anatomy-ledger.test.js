import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { ORGANS } from '../src/catalog/taxonomy.js';
import {
  ANATOMY_LEVELS,
  ANATOMY_REFERENCE_ORGAN,
  ANATOMY_TARGET_LEVEL,
  ORGAN_ANATOMY,
  anatomyForOrgan,
  anatomyGap,
  anatomyRank,
  meetsAnatomyTarget,
  validateAnatomyLedger,
} from '../src/catalog/anatomy.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('anatomy: every organ has an anatomy model on the ledger', () => {
  assert.deepEqual(validateAnatomyLedger(), []);

  // The requirement, stated as the assertion it is: an organ cannot be added to
  // the body without somebody deciding what its anatomy model is.
  for (const organ of ORGANS) {
    assert.ok(
      anatomyForOrgan(organ.id),
      `${organ.id}: every organ needs an anatomy model, and this one is not on the ledger`
    );
  }
  assert.equal(ORGAN_ANATOMY.length, ORGANS.length, 'the ledger is the organs, no more and no fewer');
});

test('anatomy: the brain is the standard, and the standard is the target for everything', () => {
  const brain = anatomyForOrgan(ANATOMY_REFERENCE_ORGAN);
  assert.ok(brain);
  assert.equal(meetsAnatomyTarget(brain), true, 'the organ the others are held to must meet the bar itself');
  assert.equal(
    anatomyRank(brain.level) >= anatomyRank(ANATOMY_TARGET_LEVEL),
    true,
    `${ANATOMY_TARGET_LEVEL} is the bar because that is what the brain reached`
  );
  assert.ok(ANATOMY_LEVELS.includes(ANATOMY_TARGET_LEVEL));
});

test('anatomy: a level above a silhouette names the test that holds it up', () => {
  for (const entry of ORGAN_ANATOMY) {
    if (anatomyRank(entry.level) <= anatomyRank('A0')) continue;
    assert.ok(entry.evidence?.trim(), `${entry.organ}: ${entry.level} claimed with no evidence`);
  }
});

test('anatomy: the gap is data, and every organ in it says what would close it', () => {
  const gap = anatomyGap();
  for (const entry of gap) {
    assert.equal(meetsAnatomyTarget(entry), false);
    assert.ok(entry.next?.trim(), `${entry.organ}: in the gap and does not say what would close it`);
  }
  // Weakest first: the ledger is read as a work queue, so the order has to be
  // the order, not registration order.
  const ranks = gap.map((entry) => anatomyRank(entry.level));
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));

  // Not an assertion about a number — an assertion that the number is honest.
  // Every organ at the target and this test still passes; that is the point.
  const done = ORGAN_ANATOMY.filter((entry) => !entry.bench && meetsAnatomyTarget(entry));
  assert.equal(done.length + gap.length + ORGAN_ANATOMY.filter((e) => e.bench).length, ORGANS.length);
});

test('anatomy: the requirement is written where the next person will look', () => {
  const grandDesign = read('docs/grand-design.md');
  const specs = read('docs/anatomy-specs.md');
  const claude = read('CLAUDE.md');

  // The design documents must carry the requirement, not just this module.
  for (const [name, source] of [['grand-design.md', grandDesign], ['anatomy-specs.md', specs], ['CLAUDE.md', claude]]) {
    assert.match(source, /全臓器|すべての臓器/, `${name}: the every-organ requirement is not stated`);
    assert.match(source, /catalog\/anatomy\.js/, `${name}: does not point at the ledger`);
  }
  // And the old pull-gated policy must not still be sitting beside the new one
  // saying the opposite.
  assert.doesNotMatch(grandDesign, /pull が来るまで区画を増やさない/);
  assert.doesNotMatch(specs, /A0–A1 のまま凍結/);
});
