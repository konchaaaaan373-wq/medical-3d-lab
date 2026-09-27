import test from 'node:test';
import assert from 'node:assert/strict';

import { SCENES } from '../src/catalog/index.js';
import { isSceneReleased } from '../src/catalog/release.js';
import { authoredFeaturesForScene, featuresForScene } from '../src/access/features.js';
import { hasAuthoredPatientGuide } from '../src/data/patientGuideIndex.js';
import {
  patientExplanationAvailable,
  patientExplanationReleased,
  patientExplanationScenes,
} from '../src/access/patientPurpose.js';
import {
  DEFAULT_PURPOSE,
  PURPOSE,
  PURPOSES,
  hashWithPurpose,
  requestedPurpose,
  resolvePurpose,
} from '../src/app/purpose.js';

/**
 * The purpose a screen is in, and where patient explanation may be offered.
 *
 * The point of the second half is one sentence from the task that asked for
 * it: *switching the header must never open patient content that is not
 * public, not reviewed, or not written.* The switch, the header, the question
 * list and the landing entrance all ask `patientExplanationAvailable`, so it is
 * the one place that promise can be held.
 */

test('the purposes are named as uses, never as a rank of reader', () => {
  assert.deepEqual(PURPOSES.map((purpose) => purpose.ja), ['医学教育', '患者説明']);
  const words = PURPOSES.flatMap((purpose) => [purpose.ja, purpose.en, purpose.explore.ja, purpose.explore.en]).join(' ');
  for (const banned of ['初心者', '上級者', '医療者', 'Beginner', 'Advanced', 'Professional']) {
    assert.ok(!words.includes(banned), `a purpose label ranks its reader: ${banned}`);
  }
});

test('the address carries the purpose, and education is the address everybody already has', () => {
  assert.equal(requestedPurpose('#/heart-failure'), null);
  assert.equal(requestedPurpose('#/heart-failure?purpose=patient'), PURPOSE.PATIENT);
  assert.equal(requestedPurpose('#/heart-failure?purpose=education'), PURPOSE.EDUCATION);
  assert.equal(requestedPurpose('#/heart-failure?purpose=PATIENT'), PURPOSE.PATIENT);
  assert.equal(requestedPurpose('#/heart-failure?purpose=clinician'), null, 'an unknown purpose is not a purpose');

  assert.equal(hashWithPurpose('#/heart-failure', PURPOSE.PATIENT), '#/heart-failure?purpose=patient');
  assert.equal(hashWithPurpose('#/heart-failure?purpose=patient', DEFAULT_PURPOSE), '#/heart-failure');
  // Another part of the query survives a switch in both directions.
  assert.equal(
    hashWithPurpose('#/brain-anatomy?structure=hippocampus', PURPOSE.PATIENT),
    '#/brain-anatomy?structure=hippocampus&purpose=patient'
  );
  assert.equal(
    hashWithPurpose('#/brain-anatomy?structure=hippocampus&purpose=patient', PURPOSE.EDUCATION),
    '#/brain-anatomy?structure=hippocampus'
  );
});

test('a patient request the model cannot answer opens education, and says it refused', () => {
  assert.deepEqual(resolvePurpose({ requested: 'patient', patientAvailable: true }), { purpose: 'patient', refused: false });
  assert.deepEqual(resolvePurpose({ requested: 'patient', patientAvailable: false }), { purpose: 'education', refused: true });
  assert.deepEqual(resolvePurpose({ requested: null, patientAvailable: true }), { purpose: 'education', refused: false });
  assert.deepEqual(resolvePurpose({ requested: 'education', patientAvailable: false }), { purpose: 'education', refused: false });
});

test('the released product offers patient explanation only where release, review, declaration and content agree', () => {
  for (const scene of SCENES) {
    if (!patientExplanationAvailable(scene, { unlocked: false })) continue;
    assert.ok(isSceneReleased(scene), `${scene.id}: offered to patients but not released`);
    assert.equal(
      featuresForScene(scene).patient,
      true,
      `${scene.id}: offered as a purpose, but the console's own gate (clinical review, maturity) says no`
    );
    assert.ok(hasAuthoredPatientGuide(scene.id), `${scene.id}: offered with no explanation written`);
  }
});

test('in the released product, the patient purpose and the patient button can never disagree', () => {
  // The other direction: a model whose console would open the patient guide,
  // and is released, must be reachable as a purpose — otherwise the header
  // says "no patient explanation" over a button that has one.
  for (const scene of SCENES.filter(isSceneReleased)) {
    const buttonWouldOpen = featuresForScene(scene).patient && hasAuthoredPatientGuide(scene.id);
    assert.equal(
      patientExplanationReleased(scene),
      buttonWouldOpen,
      `${scene.id}: the purpose and the console disagree about patient explanation`
    );
  }
});

test('a preview build offers exactly the explanations it would let a reviewer open, and a released build none of the unreviewed ones', () => {
  for (const scene of SCENES) {
    assert.equal(
      patientExplanationAvailable(scene, { unlocked: true }),
      authoredFeaturesForScene(scene).patient,
      `${scene.id}: the preview purpose and the preview console disagree`
    );
  }
  // Today no released scene has a current clinical review with a patient mode,
  // so the released product offers none. When that changes this number moves
  // — and the assertion above is what makes the new one legitimate.
  const released = patientExplanationScenes({ unlocked: false });
  for (const scene of released) assert.ok(featuresForScene(scene).patient);
});

test('nothing unreviewed becomes a patient purpose by being released', () => {
  // The case the header switch must never open: the release has opened the
  // model, a patient explanation is written and declared, and the versioned
  // clinical review is not current. Asked of every such scene as if the release
  // had opened it.
  const released = () => true;
  const unreviewed = SCENES.filter(
    (scene) => hasAuthoredPatientGuide(scene.id) && scene.access?.patient === true && !featuresForScene(scene).patient
  );
  assert.ok(unreviewed.length > 0, 'fixture: an authored, declared, unreviewed patient explanation');
  for (const scene of unreviewed) {
    assert.equal(
      patientExplanationReleased(scene, { released }),
      false,
      `${scene.id}: released without a current clinical review, and offered to patients anyway`
    );
  }
  // Each condition, alone, closes it — and all four together open it, so the
  // assertion above cannot be passed by a function that always says no.
  const scene = unreviewed[0];
  const yes = () => true;
  const no = () => false;
  assert.equal(patientExplanationReleased(scene, { released: yes, reviewReady: yes }), true, 'all four agree');
  assert.equal(patientExplanationReleased(scene, { released: no, reviewReady: yes }), false, 'not released');
  assert.equal(patientExplanationReleased(scene, { released: yes, reviewReady: no }), false, 'not reviewed');
  assert.equal(
    patientExplanationReleased({ ...scene, access: { ...scene.access, patient: false } }, { released: yes, reviewReady: yes }),
    false,
    'not declared'
  );
  assert.equal(
    patientExplanationReleased({ ...scene, id: 'no-such-guide' }, { released: yes, reviewReady: yes }),
    false,
    'not written'
  );
});
