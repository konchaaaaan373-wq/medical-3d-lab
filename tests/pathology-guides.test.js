import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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
import { STAGES as PNEUMONIA_STAGES } from '../src/data/pneumonia.js';
import { STAGES as EMBOLISM_STAGES } from '../src/data/pulmonaryEmbolism.js';
import { STAGES as EDEMA_STAGES } from '../src/data/pulmonaryEdema.js';
import { PneumoniaScene } from '../src/scenes/respiratory/scenes/pneumonia/PneumoniaScene.js';
import { PulmonaryEmbolismScene } from '../src/scenes/respiratory/scenes/pulmonaryEmbolism/PulmonaryEmbolismScene.js';
import { PulmonaryEdemaScene } from '../src/scenes/respiratory/scenes/pulmonaryEdema/PulmonaryEdemaScene.js';
import { STAGES as PORTAL_STAGES } from '../src/data/portalHypertension.js';
import { STAGES as HEPATORENAL_STAGES } from '../src/data/hepatorenal.js';
import { PortalHypertensionScene } from '../src/scenes/hepatobiliary/scenes/portalHypertension/PortalHypertensionScene.js';
import { HepatorenalScene } from '../src/scenes/renal/scenes/hepatorenalSyndrome/HepatorenalScene.js';
import { STAGES as RENAL_STAGES, CONTROLS as RENAL_CONTROLS } from '../src/data/renalFiltration.js';
import { RenalFiltrationScene } from '../src/scenes/renal/scenes/renalFiltration/RenalFiltrationScene.js';
import { STAGES as BILIARY_STAGES, MODEL_CONTROLS as BILIARY_CONTROLS } from '../src/data/biliaryObstruction.js';
import { BiliaryObstructionScene } from '../src/scenes/hepatobiliary/scenes/biliaryObstruction/BiliaryObstructionScene.js';
import { STAGES as ACHALASIA_STAGES, MODEL_CONTROLS as ACHALASIA_CONTROLS } from '../src/data/achalasia.js';
import { AchalasiaScene } from '../src/scenes/gastrointestinal/scenes/achalasia/AchalasiaScene.js';

/**
 * The disease explanations, held to the same promises the cardiac ones are.
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
  /**
   * The three that have no model-state steps.
   *
   * Each is a scene whose whole subject is one axis, so its explanation walks
   * that axis and moves nothing else. They are here for the same per-step rules
   * — the stage pairing, the copy limits, the marks on what the model does not
   * produce — and for the rule that matters most for a progress-only guide: a
   * step may not point at a label the scene is not drawing at that position.
   */
  { id: 'pneumonia-consolidation', stages: PNEUMONIA_STAGES, scene: () => new PneumoniaScene({}) },
  { id: 'pulmonary-embolism', stages: EMBOLISM_STAGES, scene: () => new PulmonaryEmbolismScene({}) },
  { id: 'pulmonary-edema', stages: EDEMA_STAGES, scene: () => new PulmonaryEdemaScene({}) },
  /**
   * The liver and kidney pair.
   *
   * They are here for the same rules and for one of their own: the hepatorenal
   * scene is the only place in this product where a single solve really does
   * span three organs — `solveHepatorenal` imports and calls
   * `solvePortalCirculation` — and the test below holds the two facts apart,
   * because the tempting mistake is to let *navigating* between two scenes read
   * as the same thing.
   */
  { id: 'portal-hypertension', stages: PORTAL_STAGES, scene: () => new PortalHypertensionScene({}) },
  { id: 'hepatorenal-syndrome', stages: HEPATORENAL_STAGES, scene: () => new HepatorenalScene({}) },
  /**
   * The nephron, which is a list of alternatives rather than a sequence.
   *
   * Four of its steps sit at the same position on the axis and differ only in
   * which `situation` is selected, because pre-renal failure, tubular injury,
   * a leaking barrier and an obstruction below are four different problems and
   * not four stages of one. The test below holds that shape directly.
   */
  {
    id: 'renal-filtration',
    stages: RENAL_STAGES,
    controls: RENAL_CONTROLS,
    scene: () => new RenalFiltrationScene({}),
  },
  /**
   * The biliary tree, which has the same shape as the nephron: the site is a
   * choice and the axis is how complete. Three of its steps sit at the same
   * position on the axis and differ only in where the blockage is.
   */
  {
    id: 'biliary-obstruction',
    stages: BILIARY_STAGES,
    controls: BILIARY_CONTROLS,
    scene: () => {
      const scene = new BiliaryObstructionScene({});
      scene.build();
      return scene;
    },
    visualMapping: new BiliaryObstructionScene({}).getVisualMapping(),
    stateFields: null,
  },
  /**
   * The oesophagus, which walks a **balance being found**: nothing, then
   * something accumulating, then the thing that accumulated doing the work.
   * Neither a severity nor a list of alternatives — the third shape.
   */
  {
    id: 'achalasia',
    stages: ACHALASIA_STAGES,
    controls: ACHALASIA_CONTROLS,
    scene: () => {
      const scene = new AchalasiaScene({});
      scene.build();
      return scene;
    },
    visualMapping: new AchalasiaScene({}).getVisualMapping(),
    stateFields: null,
  },
];

for (const guide of GUIDES) {
  const { id, stages, controls = [] } = guide;
  // A scene that declares framings declares them once, and both the test and
  // the app read that same declaration.
  const framings = guide.framings ?? Object.keys(guide.scene?.().getGuideFramings?.() ?? {});

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

  test(`${id}: no step points at a label the scene is not drawing there`, () => {
    // A `focus` list narrows the label layer to the ids it names. An id whose
    // annotation is not in range at that position narrows it to nothing, and
    // the step then says "watch the consolidated region" over a picture with no
    // labels on it at all.
    const scene = guide.scene ? guide.scene() : null;
    if (!scene) return;
    scene.build?.();
    const annotations = new Map((scene.getAnnotations?.() ?? []).map((a) => [a.id, a]));
    // A `compare` a step set stays set until another step changes it, so this
    // walks the guide in order rather than asking each step in isolation.
    let comparing = false;
    for (const step of PATIENT_GUIDES[id].steps) {
      if (step.compare !== undefined) comparing = step.compare;
      for (const focusId of step.focus ?? []) {
        const annotation = annotations.get(focusId);
        assert.ok(annotation, `${step.stage}: points at "${focusId}", which the scene does not draw`);
        const range = annotation.range ?? [0, 1];
        assert.ok(
          step.progress >= range[0] - 1e-9 && step.progress <= range[1] + 1e-9,
          `${step.stage}: points at "${focusId}", which the scene draws only between ${range[0]} and ${range[1]}`
        );
        // Some labels exist only when a second model is on screen beside this
        // one. A step pointing at one of those without asking for the
        // comparison narrows the label layer to nothing, and the reader is told
        // to compare two things while looking at one.
        assert.equal(
          Boolean(annotation.comparisonOnly) && !comparing,
          false,
          `${step.stage}: points at "${focusId}", which the scene only draws while comparing`
        );
      }
    }
  });

  if (guide.visualMapping) {

    test(`${id}: the drawing says what it is doing with the model's numbers`, () => {
      assert.deepEqual(
        visualMappingSetProblems(guide.visualMapping, { stateFields: guide.stateFields }),
        []
      );
    });
  }

  // Scenes whose walk stands on a named list of model states pair against that
  // list. A scene that selects between mechanisms instead has no such list, and
  // `guideModelStateProblems` has already held its choices to the options the
  // scene offers.
  if (!guide.states) continue;

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

/**
 * The one place a chain across organs is a single solve — and the one place it
 * must not be claimed anywhere else.
 *
 * `solveHepatorenal` imports and calls `solvePortalCirculation`: the liver on
 * that screen is solved by the same function the portal-hypertension scene
 * uses, inside one solve, and the kidney's perfusion pressure comes out of it.
 * That is a real coupling and it is worth saying so.
 *
 * Everything else that links a liver scene to a kidney scene is navigation.
 * Two models, two solves, nothing passing between them — and a reader moving
 * between them has no way to tell those apart from the moving unless the
 * product says which it is. So the note that travels with every onward link
 * has to deny the coupling, and this holds it to that.
 */
test('organ chains: the coupling is inside one solve, and the links say they are not', async () => {
  const hepatorenal = await readFile(new URL('../src/models/hepatorenal.js', import.meta.url), 'utf8');
  assert.match(
    hepatorenal,
    /import\s*\{[^}]*solvePortalCirculation[^}]*\}\s*from\s*'\.\/portalHypertension\.js'/,
    'the hepatorenal model is supposed to solve the portal circulation rather than restate it'
  );

  // And every scene that offers an onward link says, in both languages, that
  // the scene it is offering is a separate model.
  for (const scene of [
    PortalHypertensionScene,
    HepatorenalScene,
    CopdScene,
    AsthmaScene,
    PneumoniaScene,
    PulmonaryEmbolismScene,
    PulmonaryEdemaScene,
  ]) {
    const related = scene.meta.related;
    if (!related?.scenes?.length) continue;
    assert.match(related.note ?? '', /separate models/i, scene.meta.id);
    assert.match(related.noteJa ?? '', /別々のモデル/, scene.meta.id);
  }
});

/**
 * A scene that selects between mechanisms may not be walked as a progression.
 *
 * The renal scene's `situation` control picks *which thing has gone wrong*, and
 * its progression axis means "how far into that". Switching the situation while
 * also moving the axis would tell a reader that pre-renal failure becomes
 * tubular injury becomes an obstruction, which is exactly what this scene
 * exists to stop them believing.
 *
 * So: whenever a step changes a `choice` control, the axis stands still.
 */
/**
 * A scene that selects between mechanisms may not be walked as a progression.
 *
 * Two scenes work this way now — the nephron and the biliary tree — and they
 * work this way because their diseases do. `situation` picks *which thing has
 * gone wrong*; `site` picks *where the blockage is*; in both the progression
 * axis means "how far into that". Switching the selection while also moving the
 * axis would tell a reader that pre-renal failure becomes tubular injury, or
 * that a cystic-duct stone becomes a common-bile-duct stone, which is exactly
 * what these scenes exist to stop them believing.
 *
 * So: whenever a step changes a `choice` control from one **mechanism** to
 * another, the axis stands still. Which of the selections are mechanisms is
 * asked of the model rather than of a list of names — a selection the axis does
 * nothing to is the baseline, and leaving a baseline is entering the first
 * mechanism rather than claiming one became another.
 */
const SCENARIO_SCENES = [
  { id: 'renal-filtration', controls: RENAL_CONTROLS, scene: () => new RenalFiltrationScene({}), choice: 'situation' },
  {
    id: 'biliary-obstruction',
    controls: BILIARY_CONTROLS,
    scene: () => {
      const scene = new BiliaryObstructionScene({});
      scene.build();
      return scene;
    },
    choice: 'site',
  },
];

for (const { id, controls, scene: make, choice } of SCENARIO_SCENES) {
  test(`${id}: switching mechanism never moves along the axis as well`, () => {
    const control = controls.find((entry) => entry.id === choice);
    assert.equal(control?.kind, 'choice', `${id} is supposed to select between mechanisms`);

    const scene = make();
    const solvedAt = (value, progress) => {
      scene.setModelControl(choice, value);
      scene.setProgress(progress);
      return JSON.stringify(scene.getMetrics().map((row) => row.value));
    };
    const mechanisms = new Set(
      control.options.map((option) => option.value).filter((value) => solvedAt(value, 0) !== solvedAt(value, 1))
    );
    assert.ok(mechanisms.size >= 3, `${id}: this scene is supposed to offer several mechanisms`);

    const steps = PATIENT_GUIDES[id].steps;
    for (const [index, step] of steps.entries()) {
      const previous = steps[index - 1];
      if (!previous) continue;
      const was = (previous.controls ?? {})[choice];
      const now = (step.controls ?? {})[choice];
      // Only a move between two mechanisms counts. Leaving the baseline does
      // not, because the baseline is not one of the things that went wrong.
      if (was === undefined || now === undefined || was === now || !mechanisms.has(was)) continue;
      assert.equal(
        step.progress,
        previous.progress,
        `${id} / ${step.stage}: switches mechanism and moves along the axis in the same step`
      );
    }

    // And every mechanism the walk shows is one the scene offers by name, so a
    // step cannot describe a state the reader has no way to reach.
    const offered = new Set(control.options.map((option) => option.value));
    const walked = steps.map((step) => step.controls?.[choice]).filter(Boolean);
    assert.ok(walked.every((value) => offered.has(value)), walked.join(', '));
    assert.ok(new Set(walked).size >= 3, `${id}: the point of this walk is that there is more than one mechanism`);
    scene.dispose?.();
  });
}

/**
 * The chain the hepatorenal scene claims, checked as numbers rather than as
 * prose.
 *
 * Saying "one solve spans three organs" is cheap. What makes it true is that
 * moving this scene's one axis moves a liver number, a systemic number and a
 * kidney number **together, out of the same call** — and that the scene puts
 * all three in front of the reader, because a coupling nothing displays is a
 * coupling nobody can check.
 */
test('hepatorenal: one axis moves the liver, the circulation and the kidney at once', () => {
  const scene = new HepatorenalScene({});
  scene.build();
  const read = (progress) => {
    scene.setProgress(progress);
    return Object.fromEntries(scene.getMetrics().map((row) => [row.id, Number(row.value)]));
  };
  const start = read(0);
  const end = read(1);

  // The liver's own number is on screen at all, which it was not before.
  assert.ok(Number.isFinite(start.portalGradient), 'the scene reads out a portal pressure gradient');
  // And the chain runs in the directions the walk describes: the liver gets
  // harder to cross, more blood arrives in the splanchnic bed, the arterial
  // pressure falls, and filtration falls with it.
  assert.ok(end.portalGradient > start.portalGradient + 5, `${start.portalGradient} -> ${end.portalGradient}`);
  assert.ok(end.splanchnicInflow > start.splanchnicInflow, `${start.splanchnicInflow} -> ${end.splanchnicInflow}`);
  assert.ok(end.map < start.map, `${start.map} -> ${end.map}`);
  assert.ok(end.gfr < start.gfr * 0.6, `${start.gfr} -> ${end.gfr}`);

  // The patient walk meets them in that order.
  const walked = PATIENT_GUIDES['hepatorenal-syndrome'].steps.map((step) => step.focus?.[0]);
  const liverAt = walked.indexOf('liver');
  const splanchnicAt = walked.indexOf('splanchnic');
  const kidneyAt = walked.indexOf('afferent');
  assert.ok(liverAt >= 0 && splanchnicAt > liverAt && kidneyAt > splanchnicAt, walked.join(' -> '));
});
