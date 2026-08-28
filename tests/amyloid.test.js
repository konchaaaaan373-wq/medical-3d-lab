import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAggregationLayout, SPACE } from '../src/scenes/nervous/scenes/amyloidBeta/aggregationLayout.js';

const COUNT = 2800;
const layout = buildAggregationLayout(COUNT);

/**
 * Final aggregation state of a particle at a given progression, derived exactly
 * the way the shader derives it: a threshold above 1 can never be crossed.
 */
function stateAt(stages, i, progress) {
  const [appear, oligo, fibril, plaque] = [0, 1, 2, 3].map((k) => stages[i * 4 + k]);
  if (progress < appear) return 'absent';
  if (progress >= plaque) return 'plaque';
  if (progress >= fibril) return 'fibril';
  if (progress >= oligo) return 'oligomer';
  return 'monomer';
}

function census(progress) {
  const counts = { absent: 0, monomer: 0, oligomer: 0, fibril: 0, plaque: 0 };
  for (let i = 0; i < layout.count; i++) counts[stateAt(layout.attributes.stages, i, progress)]++;
  return counts;
}

test('the layout builds without error and produces finite positions', () => {
  assert.equal(layout.count, COUNT);
  for (const key of ['free', 'oligo', 'fibril', 'plaque']) {
    const buffer = layout.attributes[key];
    assert.equal(buffer.length, COUNT * 3);
    for (let i = 0; i < buffer.length; i++) {
      assert.ok(Number.isFinite(buffer[i]), `${key}[${i}] is not finite`);
    }
  }
  assert.ok(layout.strands.length > 0 && layout.clusters.length > 0);
});

test('every particle stays inside the modelled extracellular space', () => {
  const { free, oligo, fibril, plaque } = layout.attributes;
  const somaRadius = SPACE.somaRadius;
  for (const buffer of [free, oligo, fibril, plaque]) {
    for (let i = 0; i < COUNT; i++) {
      const x = buffer[i * 3];
      const y = buffer[i * 3 + 1];
      const z = buffer[i * 3 + 2];
      assert.ok(Math.hypot(x, y, z) <= SPACE.bounds + 1e-3, 'particle outside scene bounds');
      // Aβ deposits are extracellular; nothing may sit inside the cell body.
      const dx = x - SPACE.somaCenter.x;
      const dy = y - SPACE.somaCenter.y;
      const dz = z - SPACE.somaCenter.z;
      assert.ok(Math.hypot(dx, dy, dz) >= somaRadius, 'particle inside the soma');
    }
  }
});

test('Aβ is present at the low-aggregation baseline', () => {
  // A healthy brain produces and clears Aβ continuously, so "normal" must not
  // mean "no Aβ at all".
  const counts = census(0);
  const present = COUNT - counts.absent;
  assert.ok(present > COUNT * 0.1, 'baseline should still show soluble monomer');
  assert.equal(counts.oligomer + counts.fibril + counts.plaque, 0, 'nothing should be aggregated at baseline');
});

test('aggregation states coexist at high aggregation', () => {
  // Aβ species interconvert and coexist; the advanced state must not be
  // "everything is a plaque now".
  const counts = census(1);
  assert.equal(counts.absent, 0, 'all particles should be present at full aggregation');
  for (const species of ['monomer', 'oligomer', 'fibril', 'plaque']) {
    assert.ok(
      counts[species] > COUNT * 0.05,
      `${species} should still make up a visible share at full aggregation (got ${counts[species]})`
    );
  }
  assert.ok(counts.plaque < COUNT * 0.7, 'plaque should not dominate the whole population');
});

test('the population only ever moves further along the cascade', () => {
  // Guards the visual promise of the slider: species may coexist, but a given
  // particle must not visibly regress as the slider moves right.
  const order = { absent: 0, monomer: 1, oligomer: 2, fibril: 3, plaque: 4 };
  for (let i = 0; i < COUNT; i += 7) {
    let previous = 0;
    for (let step = 0; step <= 50; step++) {
      const rank = order[stateAt(layout.attributes.stages, i, step / 50)];
      assert.ok(rank >= previous, `particle ${i} regressed at ${step / 50}`);
      previous = rank;
    }
  }
});

test('per-particle thresholds are ordered and never negative in count terms', () => {
  const { stages } = layout.attributes;
  for (let i = 0; i < COUNT; i++) {
    const oligo = stages[i * 4 + 1];
    const fibril = stages[i * 4 + 2];
    const plaque = stages[i * 4 + 3];
    if (fibril <= 1) assert.ok(oligo < fibril, `particle ${i} would fibrillise before aggregating`);
    if (plaque <= 1) assert.ok(fibril < plaque, `particle ${i} would join a plaque before fibrillising`);
  }
  for (let step = 0; step <= 100; step++) {
    const counts = census(step / 100);
    for (const value of Object.values(counts)) assert.ok(value >= 0);
  }
});

test('a smaller particle budget still produces a valid layout', () => {
  const small = buildAggregationLayout(300);
  assert.equal(small.count, 300);
  assert.ok(small.attributes.stages.every((value) => Number.isFinite(value)));
});
