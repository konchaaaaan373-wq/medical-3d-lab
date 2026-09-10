import test from 'node:test';
import assert from 'node:assert/strict';

import { PATIENT_GUIDES } from '../src/data/patientGuides.js';
import { guideProblems, guideStepProblems } from '../src/data/guideContract.js';
import { STAGES as HEART_FAILURE_STAGES } from '../src/data/heartFailure.js';
import { STAGES as ISCHEMIA_STAGES } from '../src/data/myocardialIschemia.js';
import { HeartFailureScene } from '../src/scenes/cardiovascular/scenes/heartFailure/HeartFailureScene.js';
import { MyocardialIschemiaScene } from '../src/scenes/cardiovascular/scenes/myocardialIschemia/MyocardialIschemiaScene.js';

/**
 * The same promises, held for both diseases by one set of rules.
 *
 * The heart-failure guide worked the shape out; `src/data/guideContract.js` is
 * that shape written down, and this is where each guide is measured against it.
 * A third disease adds a row here rather than a file.
 */

const GUIDES = [
  {
    id: 'heart-failure',
    stages: HEART_FAILURE_STAGES,
    framings: Object.keys(new HeartFailureScene({}).getGuideFramings()),
  },
  {
    id: 'myocardial-ischemia',
    stages: ISCHEMIA_STAGES,
    framings: Object.keys(new MyocardialIschemiaScene({}).getGuideFramings()),
  },
];

for (const { id, stages, framings } of GUIDES) {
  test(`guide contract: ${id} keeps every promise the shape makes`, () => {
    const problems = guideProblems(PATIENT_GUIDES[id], { stages, framings });
    assert.deepEqual(problems, []);
  });

  test(`guide contract: ${id} marks what the model does not produce`, () => {
    // Every guide ends somewhere the model does not go — what a person feels.
    // A reader cannot tell that from looking, so it is marked, and only there.
    const steps = PATIENT_GUIDES[id].steps;
    const marked = steps.filter((step) => step.educationalOnly);
    assert.equal(marked.length, 1, `${id}: exactly one general-explanation step`);
    assert.equal(marked[0], steps[steps.length - 1], `${id}: and it is the last one`);
    assert.match(marked[0].lookJa, /新しく描かれるものはありません/);
  });
}

test('guide contract: the rules actually reject a step that breaks them', () => {
  // A contract nothing can fail is not a contract. Each of these is a defect
  // the two guides above would otherwise be free to acquire.
  const stages = [{ id: 'baseline', at: 0 }, { id: 'later', at: 0.5 }];
  const good = {
    stage: 'baseline', progress: 0,
    title: 'A', titleJa: 'あ', body: 'B', bodyJa: 'い', look: 'C', lookJa: 'う',
  };
  assert.deepEqual(guideStepProblems(good, { stages }), []);

  const rejects = (step, pattern) => {
    const problems = guideStepProblems({ ...good, ...step }, { stages, framings: ['wall'] });
    assert.ok(problems.some((problem) => pattern.test(problem)), `expected ${pattern}, got ${problems.join('; ')}`);
  };
  rejects({ stage: 'nowhere' }, /stage the scene does not have/);
  rejects({ progress: 0.9 }, /sits at 0\.9/);
  rejects({ lookJa: '' }, /carries no lookJa/);
  rejects({ bodyJa: 'あ'.repeat(200) }, /over 110/);
  rejects({ body: 'This can be treated with a drug.' }, /matches/);
  rejects({ bodyJa: '診断がつきます。' }, /matches/);
  rejects({ frame: 'nowhere' }, /does not declare/);
});

test('guide contract: a guide that skips a stage or walks backwards is rejected', () => {
  const stages = [{ id: 'a', at: 0 }, { id: 'b', at: 0.5 }];
  const step = (stage, progress) => ({
    stage, progress,
    title: 'A', titleJa: 'あ', body: 'B', bodyJa: 'い', look: 'C', lookJa: 'う',
  });

  assert.deepEqual(guideProblems({ steps: [step('a', 0), step('b', 0.5)] }, { stages }), []);
  assert.ok(
    guideProblems({ steps: [step('a', 0)] }, { stages }).some((problem) => /no step covers stage "b"/.test(problem))
  );
  assert.ok(
    guideProblems({ steps: [step('b', 0.5), step('a', 0)] }, { stages })
      .some((problem) => /goes backwards/.test(problem))
  );
  // Two steps at one position is allowed: the chain turns from one organ to the
  // next without the model moving.
  assert.deepEqual(
    guideProblems({ steps: [step('a', 0), step('b', 0.5), step('b', 0.5)] }, { stages }),
    []
  );
});
