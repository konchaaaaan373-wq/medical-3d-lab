import test from 'node:test';
import assert from 'node:assert/strict';

import { PATIENT_GUIDES } from '../src/data/patientGuides.js';
import { guideProblems } from '../src/data/guideContract.js';
import { guideModelStateSetProblems } from '../src/data/guideModelState.js';
import { visualMappingSetProblems } from '../src/data/visualMapping.js';
import { STAGES as COPD_STAGES, MODEL_CONTROLS as COPD_CONTROLS } from '../src/data/copd.js';
import { CAUSAL_STORY as COPD_STORY, LUNG_STATES } from '../src/data/copdTeaching.js';
import { CopdScene } from '../src/scenes/respiratory/scenes/copd/CopdScene.js';
import { createRespiratoryModel } from '../src/models/copd.js';
import { STAGES as ASTHMA_STAGES, MODEL_CONTROLS as ASTHMA_CONTROLS } from '../src/data/asthma.js';
import { CAUSAL_STORY as ASTHMA_STORY, AIRWAY_STATES } from '../src/data/asthmaTeaching.js';
import { AsthmaScene } from '../src/scenes/respiratory/scenes/asthma/AsthmaScene.js';
import { solveAsthma } from '../src/models/asthma.js';

/**
 * The respiratory explanations, held to the same promises the cardiac ones are.
 *
 * `src/data/guideContract.js` is the shape a guided explanation has, worked out
 * by the heart-failure guide and reused here rather than reinvented. What this
 * file adds is the part respiratory needed that the heart did not: a step may
 * put the **model** into a different state — an ordinary lung, then the same
 * lung with narrowed airways — and that is a different kind of promise from
 * moving the camera, so it is checked by different rules
 * (`src/data/guideModelState.js`).
 *
 * A second disease adds a row here rather than a file.
 */

const GUIDES = [
  {
    id: 'copd-hyperinflation',
    stages: COPD_STAGES,
    controls: COPD_CONTROLS,
    framings: Object.keys(new CopdScene({}).getGuideFramings()),
    visualMapping: new CopdScene({}).getVisualMapping(),
    stateFields: Object.keys(createRespiratoryModel({}).state),
    /** The clinician's walk-through over the same model, for the pairing test. */
    professional: COPD_STORY,
    /** Every model state either explanation may stand on. */
    states: LUNG_STATES,
  },
  {
    id: 'asthma-heterogeneity',
    stages: ASTHMA_STAGES,
    controls: ASTHMA_CONTROLS,
    framings: Object.keys(new AsthmaScene({}).getGuideFramings()),
    visualMapping: new AsthmaScene({}).getVisualMapping(),
    stateFields: Object.keys(solveAsthma({})),
    professional: ASTHMA_STORY,
    states: AIRWAY_STATES,
  },
];

for (const guide of GUIDES) {
  const { id, stages, controls, framings } = guide;

  test(`${id}: the patient explanation keeps every promise the shape makes`, () => {
    assert.deepEqual(guideProblems(PATIENT_GUIDES[id], { stages, framings }), []);
  });

  test(`${id}: a step that moves the model asks for a state the scene can reach`, () => {
    assert.deepEqual(guideModelStateSetProblems(PATIENT_GUIDES[id], { controls }), []);
  });

  test(`${id}: what the model does not produce is marked, and marked last`, () => {
    const steps = PATIENT_GUIDES[id].steps;
    const marked = steps.filter((step) => step.educationalOnly);
    assert.ok(marked.length >= 1, `${id}: at least one general-explanation step`);
    assert.deepEqual(marked, steps.slice(steps.length - marked.length), `${id}: and they are the last ones`);
    for (const step of marked) {
      // Its "where to look" line has to say what the screen is *not* showing.
      assert.match(step.lookJa, /ありません|描かれて|別の問題/, `${step.stage}: ${step.lookJa}`);
      assert.equal(step.frame, marked[0].frame, `${step.stage}: shows nothing the step before it did not`);
    }
  });

  test(`${id}: the drawing says what it is doing with the model's numbers`, () => {
    assert.deepEqual(
      visualMappingSetProblems(guide.visualMapping, { stateFields: guide.stateFields }),
      []
    );
  });

  test(`${id}: both explanations stand on the same declared states`, () => {
    // The pairing that makes two explanations one explanation.
    //
    // Neither walk may invent a lung. Both draw from the states the scene's
    // teaching data declares by name, so re-tuning one of those states moves
    // the clinician's walk-through and the patient explanation together — or
    // fails here, rather than leaving two sensible-sounding descriptions of
    // lungs that are no longer the same lung.
    const declared = new Set(Object.values(guide.states).map((state) => JSON.stringify(state)));
    for (const [label, walk] of [['patient', PATIENT_GUIDES[id]], ['clinician', guide.professional]]) {
      for (const step of walk.steps) {
        if (!step.controls) continue;
        assert.ok(
          declared.has(JSON.stringify(step.controls)),
          `${label} / ${step.stage ?? step.id}: stands on a state this scene does not declare`
        );
      }
    }
  });
}

test('the model-state rules actually reject a step that breaks them', () => {
  // A contract nothing can fail is not a contract.
  const controls = COPD_CONTROLS;
  assert.deepEqual(
    guideModelStateSetProblems({ steps: [{ stage: 'x', controls: { notAControl: 1 } }] }, { controls }),
    ['x: sets "notAControl", which this scene has no control for']
  );
  assert.deepEqual(
    guideModelStateSetProblems({ steps: [{ stage: 'x', controls: { airwayResistance: 9 } }] }, { controls }),
    ['x: sets "airwayResistance" to 9, above its maximum of 4']
  );
  assert.deepEqual(
    guideModelStateSetProblems(
      { steps: [{ stage: 'a' }, { stage: 'b', educationalOnly: true, controls: { airwayResistance: 2 } }] },
      { controls }
    ),
    ['b: is a general explanation and moves the model as well']
  );
});
