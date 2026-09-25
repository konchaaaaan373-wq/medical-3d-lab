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

test('clearing an intervention always lands on this preset’s starting condition', () => {
  // One rule, and the same one before and after a round trip.
  //
  // It used to land on whatever the reader had set by hand before choosing the
  // intervention. That is nicer, and it was a piece of state nothing on screen
  // showed and nothing could restore: `captureSessionState` carries the control
  // values and nothing else, so after a sequence that condition was gone and
  // "clear" quietly meant something different from what it had meant a minute
  // earlier. A reviewer found it. State that cannot survive a round trip and
  // that a reader cannot see is worse than a simpler rule.
  const session = new ExperimentSession({ presetId: PRESET_IDS.REDUCED_CONTRACTILITY });
  const start = { ...session.baseline.input };
  session.setControl('heartRatePerMin', 92);
  session.setControl('fillingVolumeMl', 780);

  session.selectIntervention(INTERVENTION_IDS.DOBUTAMINE);
  assert.equal(session.interventionId, INTERVENTION_IDS.DOBUTAMINE);
  // Computed from the baseline, never from the hand-set condition — which is
  // what makes a drug effect impossible to stack on top of a manual change.
  assert.equal(session.input.heartRatePerMin, start.heartRatePerMin);
  assert.equal(session.input.fillingVolumeMl, start.fillingVolumeMl);

  session.selectIntervention(INTERVENTION_IDS.NONE);
  assert.deepEqual({ ...session.input }, start, 'clearing goes to the starting condition');
  assert.equal(session.interventionId, INTERVENTION_IDS.NONE);

  // Moving a control while one is applied keeps what the intervention did and
  // changes that one input — "this, with a slower rate". It used to land on the
  // starting condition with the one control moved, which silently took the
  // intervention's other changes away (owner's phone recordings, 2026-09-25).
  session.selectIntervention(INTERVENTION_IDS.VOLUME_LOADING);
  const loaded = { ...session.input };
  session.setControl('heartRatePerMin', 64);
  assert.equal(session.interventionId, INTERVENTION_IDS.NONE, 'the condition is now the reader\'s');
  assert.equal(session.adjustedAfter, INTERVENTION_IDS.VOLUME_LOADING, 'and it says where it came from');
  assert.deepEqual({ ...session.input }, { ...loaded, heartRatePerMin: 64 });
  // Clearing still goes to the starting condition, from here too.
  session.selectIntervention(INTERVENTION_IDS.NONE);
  assert.deepEqual({ ...session.input }, start);
  assert.equal(session.adjustedAfter, INTERVENTION_IDS.NONE);
});

test('after dobutamine, moving one input leaves every other input where the drug put it', () => {
  const session = new ExperimentSession({ presetId: PRESET_IDS.REDUCED_CONTRACTILITY });
  session.selectIntervention(INTERVENTION_IDS.DOBUTAMINE);
  const onDrug = { ...session.input };
  assert.notEqual(onDrug.contractilityEesMmHgPerMl, session.baseline.input.contractilityEesMmHgPerMl);

  session.setControl('fillingVolumeMl', onDrug.fillingVolumeMl + 40);
  assert.deepEqual({ ...session.input }, { ...onDrug, fillingVolumeMl: onDrug.fillingVolumeMl + 40 });
  assert.equal(session.adjustedAfter, INTERVENTION_IDS.DOBUTAMINE);
  assert.equal(session.origin, INTERVENTION_IDS.DOBUTAMINE);
  // The comparison is still against where the experiment started.
  assert.equal(session.baseline.input.contractilityEesMmHgPerMl, presetInput(PRESET_IDS.REDUCED_CONTRACTILITY).contractilityEesMmHgPerMl);

  // Putting one input back moves that one only.
  session.resetControl('fillingVolumeMl');
  assert.deepEqual({ ...session.input }, onDrug);
});

test('putting one input back leaves the others as they are', () => {
  const session = new ExperimentSession({ presetId: PRESET_IDS.REFERENCE });
  const start = { ...session.baseline.input };
  session.setControl('fillingVolumeMl', 800);
  session.setControl('heartRatePerMin', 90);
  session.resetControl('fillingVolumeMl');
  assert.deepEqual({ ...session.input }, { ...start, heartRatePerMin: 90 });
  session.reset();
  assert.deepEqual({ ...session.input }, start);
});

test('there is no state an intervention leaves behind that nothing can restore', () => {
  // The general form of the defect: every field the session keeps has to be
  // either derivable from the controls the snapshot carries, or the same for
  // every reader. A private condition that is neither is one a round trip
  // silently changes the meaning of.
  const session = new ExperimentSession({ presetId: PRESET_IDS.REDUCED_CONTRACTILITY });
  session.setControl('fillingVolumeMl', 780);
  session.selectIntervention(INTERVENTION_IDS.DOBUTAMINE);

  // `_adjustedAfter` is recoverable: the intervention row reports it as the
  // origin, and replaying that intervention and then the four values lands on
  // the same condition with the same label (held in cardiac-output-scene.test.js).
  const recoverable = new Set(['_presetId', '_intervention', '_adjustedAfter', '_input', '_baseline', '_view',
    '_applied', '_problems', '_cache', '_warmStart', '_revision', 'solverOptions']);
  const held = Object.keys(session).filter((key) => key.startsWith('_') || key === 'solverOptions');
  for (const key of held) {
    assert.ok(
      recoverable.has(key),
      `the session holds "${key}", which the control snapshot cannot carry — see the review that removed _directInput`
    );
  }

  // And the behaviour a reader depends on is identical whichever way they got
  // here: hand-set then drug, or straight to drug.
  const direct = new ExperimentSession({ presetId: PRESET_IDS.REDUCED_CONTRACTILITY });
  direct.selectIntervention(INTERVENTION_IDS.DOBUTAMINE);
  assert.deepEqual({ ...session.input }, { ...direct.input });
  session.selectIntervention(INTERVENTION_IDS.NONE);
  direct.selectIntervention(INTERVENTION_IDS.NONE);
  assert.deepEqual({ ...session.input }, { ...direct.input });
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

test('the “no intervention” label says where the button actually goes', () => {
  // The label is a claim about behaviour, and behaviour moved under it: it read
  // "the condition as you left it" after clearing stopped returning there. A
  // stale label on a control is worse than no label, because a reader believes it.
  const none = INTERVENTION_OPTIONS.find((option) => option.value === INTERVENTION_IDS.NONE);
  const session = new ExperimentSession({ presetId: PRESET_IDS.REDUCED_CONTRACTILITY });
  session.setControl('fillingVolumeMl', 820);
  session.selectIntervention(INTERVENTION_IDS.DOBUTAMINE);
  session.selectIntervention(INTERVENTION_IDS.NONE);
  assert.deepEqual({ ...session.input }, { ...session.baseline.input });
  assert.match(none.effect, /starting condition/i, `"${none.effect}" does not say where it goes`);
  assert.match(none.effectJa, /操作前の条件/, `"${none.effectJa}" does not say where it goes`);
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
