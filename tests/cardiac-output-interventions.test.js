import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INTERVENTION_IDS,
  INTERVENTION_LIST,
  INTERVENTION_PROFILES,
  applyIntervention,
  interventionPreset,
  unchangedInputs,
} from '../src/models/cardiacInterventions.js';
import {
  CONTROL_DOMAIN,
  CONTROL_IDS,
  PRESET_IDS,
  RESULT_STATUS,
  presetInput,
  solveCardiacOutput,
} from '../src/models/cardiacOutput.js';
import { ExperimentSession } from '../src/scenes/cardiovascular/scenes/cardiacOutput/experimentSession.js';
import { INTERVENTION_OPTIONS } from '../src/data/cardiacOutputInterventions.js';

/**
 * The interventions, and the two properties that make them interventions rather
 * than result multipliers: they change inputs, and what follows is whatever the
 * solver makes of that.
 *
 * The directional claims are re-derived here from the solver. That is the point
 * of testing an input change at all — a multiplier on an output cannot be wrong,
 * because it produces the number it was told to produce.
 */

const solve = (input) => solveCardiacOutput(input);
const reduced = () => presetInput(PRESET_IDS.REDUCED_CONTRACTILITY);

test('an intervention changes inputs, and nothing else in the pipeline', () => {
  // The rule the module exists for. Every field of the result has to be a
  // model input; a key that was not one would be an output being written.
  for (const id of [INTERVENTION_IDS.VOLUME_LOADING, INTERVENTION_IDS.DOBUTAMINE]) {
    const profile = INTERVENTION_PROFILES[id];
    for (const key of Object.keys(profile.effects)) {
      assert.ok(CONTROL_IDS.includes(key), `${id} changes "${key}", which is not a model input`);
    }
    for (const key of profile.unchanged) {
      assert.ok(CONTROL_IDS.includes(key), `${id} declares "${key}" unchanged, which is not an input`);
    }
    // Every input is accounted for: changed, or explicitly left alone. An input
    // in neither list is one nobody decided about.
    const named = new Set([...Object.keys(profile.effects), ...profile.unchanged]);
    assert.deepEqual([...named].sort(), [...CONTROL_IDS].sort(), `${id} leaves an input unaccounted for`);
  }
});

test('applying one twice is applying it once', () => {
  // A drug effect must not pile up because a button was pressed again. There is
  // no state in the module, so this is structural — and checked anyway, because
  // "there is no state" is the kind of thing that stops being true.
  const base = reduced();
  const once = applyIntervention(base, INTERVENTION_IDS.DOBUTAMINE);
  const twice = applyIntervention(once.input, INTERVENTION_IDS.DOBUTAMINE);
  assert.notDeepEqual(twice.input, once.input, 'applying it to its own output would compound it');

  // Which is why the session always applies it to the preset's baseline.
  const session = new ExperimentSession({ presetId: PRESET_IDS.REDUCED_CONTRACTILITY });
  session.selectIntervention(INTERVENTION_IDS.DOBUTAMINE);
  const first = { ...session.input };
  session.selectIntervention(INTERVENTION_IDS.DOBUTAMINE);
  assert.deepEqual({ ...session.input }, first, 'choosing it again changes nothing further');
  session.selectIntervention(INTERVENTION_IDS.DOBUTAMINE);
  assert.deepEqual({ ...session.input }, first);
});

test('the base condition handed in is never modified', () => {
  const base = reduced();
  const before = JSON.stringify(base);
  applyIntervention(base, INTERVENTION_IDS.DOBUTAMINE);
  applyIntervention(base, INTERVENTION_IDS.VOLUME_LOADING);
  assert.equal(JSON.stringify(base), before);
});

test('an effect that does not fit is refused, not squeezed into range', () => {
  // Dobutamine from the reference heart would put elastance past the verified
  // range. A clamped dobutamine is a different intervention wearing the name of
  // the one that was asked for, and it would look like success.
  const applied = applyIntervention(presetInput(PRESET_IDS.REFERENCE), INTERVENTION_IDS.DOBUTAMINE);
  assert.equal(applied.input, null);
  assert.ok(applied.problems.length > 0);
  assert.match(applied.problems.join(' '), /contractilityEes/);
  assert.ok(
    applied.problems.join(' ').includes(String(CONTROL_DOMAIN.contractilityEesMmHgPerMl.max)),
    'and it says what the limit was'
  );
});

test('an intervention is offered on the condition its evidence comes from', () => {
  // Dobutamine's source is a heart-failure cohort. Offering it on the reference
  // heart would extrapolate that cohort onto a normal circulation, which is
  // exactly what the evidence does not license — and is also where the range
  // refuses it.
  assert.equal(interventionPreset(INTERVENTION_IDS.DOBUTAMINE), PRESET_IDS.REDUCED_CONTRACTILITY);
  assert.equal(interventionPreset(INTERVENTION_IDS.VOLUME_LOADING), null);

  const session = new ExperimentSession({ presetId: PRESET_IDS.REFERENCE });
  session.selectIntervention(INTERVENTION_IDS.DOBUTAMINE);
  assert.equal(session.presetId, PRESET_IDS.REDUCED_CONTRACTILITY, 'it moved to that condition first');
  assert.equal(session.applied, true, 'and the result is a real one');
});

test('volume loading buys output, and the filling pressure is what it charges', () => {
  // The contrast the two interventions exist to make. Both raise cardiac
  // output; they charge very different amounts of end-diastolic pressure for it.
  const base = solve(reduced());
  const volume = solve(applyIntervention(reduced(), INTERVENTION_IDS.VOLUME_LOADING).input);
  const drug = solve(applyIntervention(reduced(), INTERVENTION_IDS.DOBUTAMINE).input);

  assert.ok(volume.metrics.cardiacOutputLMin > base.metrics.cardiacOutputLMin, 'filling raises output');
  assert.ok(
    volume.metrics.endDiastolicPressureMmHg > base.metrics.endDiastolicPressureMmHg,
    'and raises the filling pressure'
  );
  assert.ok(
    drug.metrics.endDiastolicPressureMmHg < base.metrics.endDiastolicPressureMmHg,
    'while the other raises output with the filling pressure falling'
  );

  const perMmHg = (r) =>
    (r.metrics.cardiacOutputLMin - base.metrics.cardiacOutputLMin) /
    Math.abs(r.metrics.endDiastolicPressureMmHg - base.metrics.endDiastolicPressureMmHg);
  assert.ok(perMmHg(drug) > perMmHg(volume), 'the contrast the scene is built to show survives');

  // And it changes only the input it says it changes.
  const applied = applyIntervention(reduced(), INTERVENTION_IDS.VOLUME_LOADING);
  assert.deepEqual(applied.changed, ['fillingVolumeMl']);
  for (const id of unchangedInputs(INTERVENTION_IDS.VOLUME_LOADING)) {
    assert.equal(applied.input[id], reduced()[id], `${id} is untouched`);
  }
});

test('the two modes keep their own state, and neither leaks into the other', () => {
  // The failure this is written against: a reader sets a condition by hand,
  // picks an intervention, clears it, and finds their condition gone — or
  // worse, finds the drug's effect still in the numbers with nothing on screen
  // saying so.
  const session = new ExperimentSession({ presetId: PRESET_IDS.REDUCED_CONTRACTILITY });
  session.setControl('heartRatePerMin', 92);
  session.setControl('fillingVolumeMl', 780);
  const byHand = { ...session.input };

  session.selectIntervention(INTERVENTION_IDS.DOBUTAMINE);
  assert.equal(session.interventionId, INTERVENTION_IDS.DOBUTAMINE);
  assert.notDeepEqual({ ...session.input }, byHand);
  // The intervention is computed from the preset's starting condition, not from
  // the hand-set one — so the hand-set rate is not carried into it.
  assert.equal(session.input.heartRatePerMin, session.baseline.input.heartRatePerMin);

  session.selectIntervention(INTERVENTION_IDS.NONE);
  assert.deepEqual({ ...session.input }, byHand, 'the reader is back on their own condition');
  assert.equal(session.interventionId, INTERVENTION_IDS.NONE);

  // Moving a slider while an intervention is selected takes manual control
  // back: the intervention is cleared and the reader's own condition returns
  // with that one control moved. Nothing of the drug survives into it.
  session.selectIntervention(INTERVENTION_IDS.VOLUME_LOADING);
  session.setControl('heartRatePerMin', 64);
  assert.equal(session.interventionId, INTERVENTION_IDS.NONE);
  assert.deepEqual({ ...session.input }, { ...byHand, heartRatePerMin: 64 });
  assert.equal(
    session.input.fillingVolumeMl,
    byHand.fillingVolumeMl,
    'and the filling the intervention had raised is not left behind in it'
  );
});

test('reset clears the intervention as well as the sliders', () => {
  const session = new ExperimentSession({ presetId: PRESET_IDS.REDUCED_CONTRACTILITY });
  session.setControl('fillingVolumeMl', 900);
  session.selectIntervention(INTERVENTION_IDS.DOBUTAMINE);
  session.reset();
  assert.equal(session.interventionId, INTERVENTION_IDS.NONE);
  assert.deepEqual({ ...session.input }, { ...session.baseline.input });
  assert.equal(session.moved, false);
});

test('switching preset clears the intervention too', () => {
  const session = new ExperimentSession({ presetId: PRESET_IDS.REDUCED_CONTRACTILITY });
  session.selectIntervention(INTERVENTION_IDS.VOLUME_LOADING);
  session.selectPreset(PRESET_IDS.REFERENCE);
  assert.equal(session.interventionId, INTERVENTION_IDS.NONE);
  assert.deepEqual({ ...session.input }, presetInput(PRESET_IDS.REFERENCE));
});

test('the copy offers exactly the interventions the model has', () => {
  assert.deepEqual(
    INTERVENTION_OPTIONS.map((option) => option.value),
    [...INTERVENTION_LIST]
  );
  for (const option of INTERVENTION_OPTIONS) {
    assert.ok(option.label && option.labelJa, `${option.value} is bilingual`);
    assert.ok(option.effect && option.effectJa, `${option.value} says what it does`);
  }
  // No label may carry a quantity with a dose unit on it. Written as "a number
  // next to a unit" rather than as the words: the copy is allowed to *deny* a
  // dose — "not a fluid dose" is exactly what it should say — and a check that
  // banned the word would ban the denial along with the claim.
  for (const option of [...INTERVENTION_OPTIONS]) {
    const words = `${option.label} ${option.labelJa} ${option.effect} ${option.effectJa}`;
    assert.ok(
      !/\d\s*(mL|ml|µg|mcg|mg|L\/min)\b/.test(words),
      `${option.value} carries a quantity with a dose unit: ${words}`
    );
  }
});
