import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAggregationLayout, SPACE } from '../src/scenes/nervous/scenes/amyloidBeta/aggregationLayout.js';

const COUNT = 2800;
const layout = buildAggregationLayout(COUNT);

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

test('physiology: soluble amyloid beta is present before aggregated species appear', () => {
  const counts = census(0);
  assert.ok(counts.monomer > 0, 'normal physiology should not be represented as zero Aβ');
  assert.equal(counts.oligomer + counts.fibril + counts.plaque, 0, 'the low-aggregation reference should remain soluble');
});

test('physiology: multiple amyloid beta assembly states coexist rather than replacing one another', () => {
  const counts = census(1);
  for (const species of ['monomer', 'oligomer', 'fibril', 'plaque']) {
    assert.ok(counts[species] > 0, `${species} should coexist in the high-aggregation state`);
  }
});

test('physiology: plaque deposits are represented outside the neuronal soma', () => {
  const plaque = layout.attributes.plaque;
  for (let i = 0; i < layout.count; i++) {
    const dx = plaque[i * 3] - SPACE.somaCenter.x;
    const dy = plaque[i * 3 + 1] - SPACE.somaCenter.y;
    const dz = plaque[i * 3 + 2] - SPACE.somaCenter.z;
    assert.ok(Math.hypot(dx, dy, dz) >= SPACE.somaRadius, `particle ${i} entered the soma`);
  }
});
