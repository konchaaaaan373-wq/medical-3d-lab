/**
 * The patient-guide index and the patient guides must name the same scenes.
 *
 * `src/data/patientGuideIndex.js` exists so the release gate can ask whether a
 * patient explanation is authored without importing the explanations: the gate
 * is reachable from the browser's eager entry, and pulling the payload put
 * 220 kB of prose in front of every first paint (F-99).
 *
 * The cost of that is a second copy of a list, which this repository otherwise
 * refuses — so it is bound here, in both directions. A guide authored without
 * being listed makes the release gate quietly refuse to publish a scene that is
 * in fact ready; an id listed without a guide makes it quietly publish one that
 * is not. Both are silent in the product and loud here.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { PATIENT_GUIDES } from '../src/data/patientGuides.js';
import {
  PATIENT_GUIDE_SCENE_IDS,
  hasAuthoredPatientGuide,
} from '../src/data/patientGuideIndex.js';

test('patient guide index: names exactly the scenes that have a guide', () => {
  const authored = Object.keys(PATIENT_GUIDES).sort();
  const listed = [...PATIENT_GUIDE_SCENE_IDS].sort();

  const missing = authored.filter((id) => !PATIENT_GUIDE_SCENE_IDS.includes(id));
  const stale = listed.filter((id) => !PATIENT_GUIDES[id]);

  assert.deepEqual(
    missing,
    [],
    `authored but not listed in patientGuideIndex.js — the release gate will refuse these:\n${missing.join('\n')}`
  );
  assert.deepEqual(
    stale,
    [],
    `listed in patientGuideIndex.js with no guide behind it — the release gate will pass these wrongly:\n${stale.join('\n')}`
  );
  assert.deepEqual(listed, authored);
});

test('patient guide index: the index is ids only, and carries no guide content', () => {
  // The whole point is that this module stays small. If it ever exports a
  // guide, or an object keyed by scene, the import edge is back.
  for (const id of PATIENT_GUIDE_SCENE_IDS) {
    assert.equal(typeof id, 'string', 'the index holds scene ids, not guides');
  }
  assert.ok(Object.isFrozen(PATIENT_GUIDE_SCENE_IDS));
});

test('patient guide index: hasAuthoredPatientGuide answers for real and unreal scenes', () => {
  assert.equal(hasAuthoredPatientGuide('heart-failure'), true);
  assert.equal(hasAuthoredPatientGuide('brain-anatomy'), false);
  assert.equal(hasAuthoredPatientGuide('not-a-scene'), false);
});
