import test from 'node:test';
import assert from 'node:assert/strict';

import { patientGuideFor } from '../src/data/patientGuides.js';
import { relatedScenesFor, sceneById } from '../src/catalog/index.js';
import { CAUSAL_STORY as COPD_STORY } from '../src/data/copdTeaching.js';
import { CopdScene } from '../src/scenes/respiratory/scenes/copd/CopdScene.js';
import { PortalHypertensionScene } from '../src/scenes/hepatobiliary/scenes/portalHypertension/PortalHypertensionScene.js';
import { RenalFiltrationScene } from '../src/scenes/renal/scenes/renalFiltration/RenalFiltrationScene.js';

/**
 * The three representative diseases, and the two explanations of each.
 *
 * A reader arrives at one of these from the anatomy scene of the same organ,
 * moves the model off its baseline, and is told what they are looking at —
 * either as a patient or as a clinician. Two things have to hold for that to
 * work, and neither is visible to the scene's own tests:
 *
 * 1. **The pair describes one model.** The patient guide and the specialist
 *    walk-through move the same scene through the same span. A patient step at
 *    a progress the scene never reaches is a caption for a state that does not
 *    exist.
 * 2. **The patient register stays inside what the model shows.** No treatment,
 *    no prognosis, no number about the person in front of it. This is checked
 *    as a word list rather than by reading, because the failure is a sentence
 *    somebody adds later in good faith.
 */

const REPRESENTATIVE = [
  { organ: 'lung-anatomy', disease: 'copd-hyperinflation', Scene: CopdScene },
  { organ: 'liver-anatomy', disease: 'portal-hypertension', Scene: PortalHypertensionScene },
  { organ: 'kidney-anatomy', disease: 'renal-filtration', Scene: RenalFiltrationScene },
];

test('each first-wave organ is paired with the disease scene it is explained through', () => {
  for (const entry of REPRESENTATIVE) {
    assert.deepEqual(
      relatedScenesFor(entry.organ).map((scene) => scene.id),
      [entry.disease],
      `${entry.organ} opens onto ${entry.disease}`
    );
    assert.deepEqual(
      relatedScenesFor(entry.disease).map((scene) => scene.id),
      [entry.organ],
      `${entry.disease} leads back to ${entry.organ}`
    );
    assert.ok(sceneById(entry.disease).disease, `${entry.disease} is a disease scene`);
    assert.equal(sceneById(entry.organ).disease, null, `${entry.organ} is an anatomy scene`);
  }
});

test('every representative disease has a patient explanation in three parts', () => {
  for (const { disease } of REPRESENTATIVE) {
    const guide = patientGuideFor(disease);
    assert.ok(guide, `${disease}: a patient guide`);
    assert.ok(guide.title && guide.titleJa, `${disease}: titled in both languages`);
    assert.ok(guide.steps.length >= 3, `${disease}: enough steps to be a sequence`);

    for (const step of guide.steps) {
      // What changes, what happens, and where to look — the third is the one a
      // person sitting in front of the model actually needs.
      for (const field of ['title', 'titleJa', 'body', 'bodyJa', 'look', 'lookJa']) {
        assert.ok(
          typeof step[field] === 'string' && step[field].trim().length > 0,
          `${disease} @${step.progress}: ${field} is missing`
        );
      }
      assert.ok(step.progress >= 0 && step.progress <= 1, `${disease}: ${step.progress} is on the axis`);
    }

    const values = guide.steps.map((step) => step.progress);
    assert.deepEqual(values, [...values].sort((a, b) => a - b), `${disease}: steps run forwards`);
    assert.equal(values[0], 0, `${disease}: it starts at the baseline`);
    assert.equal(values.at(-1), 1, `${disease}: and ends at the established state`);
  }
});

test('the patient copy names something the product actually renders', () => {
  // "Where to look" is only useful if it points at a label the screen carries.
  // Each of these appears in the scene's own read-out list or in its 3D.
  const named = {
    'copd-hyperinflation': ['Expiratory time', 'Inspiratory capacity'],
    'portal-hypertension': ['Portal pressure', 'Intrahepatic resistance', 'Bypassing liver tissue'],
    'renal-filtration': ['GFR', 'Single-nephron GFR', 'Plasma creatinine'],
  };
  for (const [disease, labels] of Object.entries(named)) {
    const copy = patientGuideFor(disease).steps.map((step) => step.look).join(' ');
    for (const label of labels) {
      assert.ok(copy.includes(label), `${disease}: the guide never sends the reader to "${label}"`);
    }
  }
});

test('the patient register does not stray into treatment, prognosis or the person', () => {
  const forbidden = [
    /\bdose\b/i,
    /\bprescrib/i,
    /\btreatment\b/i,
    /\bcure[sd]?\b/i,
    /\byour (kidney|liver|lung)/i,
    /\blife expectancy\b/i,
    /\bprognosis\b/i,
    /投与|処方|治療法|余命|あなたの(腎|肝|肺)/,
  ];
  for (const { disease } of REPRESENTATIVE) {
    const copy = patientGuideFor(disease)
      .steps.map((step) => `${step.title} ${step.body} ${step.look} ${step.titleJa} ${step.bodyJa} ${step.lookJa}`)
      .join(' ');
    for (const pattern of forbidden) {
      assert.ok(!pattern.test(copy), `${disease}: patient copy matches ${pattern}`);
    }
  }
});

test('the two registers walk the same model over the same span', () => {
  // COPD is the one with both an authored causal story and a patient guide in
  // this repository's own data, so the pairing is checked where it is fully
  // expressible; the other two are checked through the scene below.
  const patient = patientGuideFor('copd-hyperinflation').steps.map((step) => step.progress);
  const specialist = COPD_STORY.steps.map((step) => step.progress);
  assert.equal(Math.min(...patient), Math.min(...specialist), 'both start at the same state');
  assert.equal(Math.max(...patient), Math.max(...specialist), 'and end at the same one');
});

test('every state a patient step names is a state the scene reaches', () => {
  for (const { disease, Scene } of REPRESENTATIVE) {
    const scene = new Scene({});
    scene.build();
    assert.ok(typeof scene.getCausalStory === 'function', `${disease}: has a specialist walk-through`);

    const readings = new Set();
    for (const step of patientGuideFor(disease).steps) {
      scene.setProgress(step.progress);
      // Long enough for a scene with a clock to arrive; the ones without a
      // clock settle on the first call.
      for (let tick = 0; tick < 240; tick += 1) scene.update(1 / 60);
      const metrics = scene.getMetrics?.() ?? [];
      readings.add(JSON.stringify(metrics.map((metric) => metric.value ?? metric.text ?? '')));
    }
    // Different steps are different states. A guide whose four captions all
    // describe one unchanging screen is a guide that is not about the model.
    assert.ok(
      readings.size >= Math.min(3, patientGuideFor(disease).steps.length),
      `${disease}: the steps do not move the model`
    );
    scene.dispose?.();
  }
});
