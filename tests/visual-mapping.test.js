import test from 'node:test';
import assert from 'node:assert/strict';

import { visualMappingProblems } from '../src/data/visualMapping.js';

/**
 * The layer between what the model solved and what is drawn.
 *
 * `visualMappingProblems` was written, exported, and **called by nothing** —
 * so the rule it states, that a drawing whose size is a drawing decision must
 * say what it is not, was enforced nowhere. Every scene that declares a mapping
 * is measured against it here.
 *
 * This is the layer a screenshot is most likely to be misread from: a lung
 * drawn larger is a real model output, and how much larger is a coefficient.
 */

/** Scenes whose data module exports a declaration, and where it lives. */
const DECLARED = [
  ['copd', '../src/data/copd.js'],
  ['asthma', '../src/data/asthma.js'],
  ['achalasia', '../src/data/achalasia.js'],
  ['biliary-obstruction', '../src/data/biliaryObstruction.js'],
];

test('visual mapping: every declared row keeps the contract', async () => {
  const problems = [];
  let rows = 0;
  for (const [scene, path] of DECLARED) {
    const module = await import(path);
    const mapping = module.VISUAL_MAPPING ?? [];
    assert.ok(mapping.length, `${scene} declares a visual mapping`);
    for (const row of mapping) {
      rows += 1;
      for (const problem of visualMappingProblems(row)) problems.push(`${scene}/${row.id}: ${problem}`);
    }
  }
  assert.ok(rows >= 10, `the declarations are actually being read (${rows} rows)`);
  assert.deepEqual(problems, []);
});

test('visual mapping: the contract rejects a row that hides a drawing decision', () => {
  // A contract nothing can fail is not a contract. An `illustrative` row whose
  // size is a coefficient must say so, and this is the sentence that never gets
  // written down unless something asks for it.
  const hiding = {
    id: 'x', target: 'lungs', channel: 'geometry', from: 'volumeL',
    reading: 'illustrative', claim: 'bigger when fuller', claimJa: '多いほど大きい',
  };
  const problems = visualMappingProblems(hiding);
  assert.ok(problems.some((problem) => /must not be read as/.test(problem)), JSON.stringify(problems));

  // And a proportional row is allowed to omit it, because the size is the value.
  assert.deepEqual(
    visualMappingProblems({ ...hiding, reading: 'proportional' }).filter((p) => /must not be read as/.test(p)),
    []
  );
});
