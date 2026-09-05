import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { STAGES } from '../src/data/heartFailure.js';
import {
  sampleHemodynamics,
  circulationParameters,
  resetCirculationCache,
} from '../src/scenes/cardiovascular/scenes/heartFailure/hemodynamics.js';
import {
  advanceCardiacPhase,
  beatPhaseAt,
  cavityVolumeAt,
  myocardialVolumeFor,
  radiusForVolume,
  solveSteadyState,
  ventricleShape,
  volumeAtPhase,
  COMPARTMENTS,
  LV,
} from '../src/models/cardiacMechanics.js';

/**
 * The cardiac solver, pinned where it was extracted.
 *
 * The time-varying elastance model and the seven-compartment circulation it
 * drives used to live inside the heart-failure scene. The ischemia scene needs
 * the same cardiac cycle and the same loading state — that is the whole point
 * of building it on this model rather than beside it — so the solver moved to
 * `src/models/cardiacMechanics.js` and the heart-failure scene became one of
 * two readers rather than the owner.
 *
 * A move like that is only safe if it is provably a move. The fixture below was
 * generated from the code *before* it was touched, and re-running the same
 * cases afterwards reproduced the whole 3 MB comparison byte for byte — not
 * within a tolerance, identically. This file keeps that pinned, so a future
 * edit to the solver has to change the fixture deliberately rather than drift
 * the heart-failure scene's numbers by accident.
 *
 * ## What is covered, and why those points
 *
 * Every authored stage of the progression, because a stage is a thing somebody
 * wrote down and a reader will quote. The ends and the middle as well, because
 * the keyframes are interpolated with a smoothstep and the interesting
 * arithmetic is between the knots, not on them. Each public input at its
 * minimum, default and maximum, one factor at a time, because a two-factor
 * sweep would hide which one moved. Five cardiac phases, because the cycle is
 * where a solved beat can differ from a stored curve.
 */

const FIXTURE = JSON.parse(
  readFileSync(new URL('./fixtures/cardiac-mechanics.json', import.meta.url), 'utf8')
);

const LOADINGS = {
  default: { preload: 1, afterload: 1 },
  preloadMin: { preload: 0.85, afterload: 1 },
  preloadMax: { preload: 1.15, afterload: 1 },
  afterloadMin: { preload: 1, afterload: 0.7 },
  afterloadMax: { preload: 1, afterload: 1.4 },
};
const PHASES = [0, 0.25, 0.5, 0.75, 0.999];

/**
 * The tolerance the extraction was held to.
 *
 * Stated as the spec states it — absolute 1e-9 or relative 1e-8, whichever the
 * magnitude makes appropriate — rather than as exact equality, even though the
 * move in fact produced exact equality. A tolerance is what the *next* change
 * gets to work within; pinning bit-equality would fail on a reordered sum that
 * changed nothing anyone can observe.
 */
const closeEnough = (actual, expected) =>
  Math.abs(actual - expected) <= 1e-9 || Math.abs(actual - expected) <= 1e-8 * Math.abs(expected);

test('the extracted solver reproduces every authored stage under every loading', () => {
  assert.ok(FIXTURE.length > 0, 'the fixture has cases');
  for (const row of FIXTURE) {
    resetCirculationCache();
    const state = sampleHemodynamics(row.progress, LOADINGS[row.loading]);
    const where = `${row.loading} @ ${row.progress}`;

    // Every finite number the solved state exposes, not a chosen subset. The
    // first draft of this listed eight fields by hand and one of the names was
    // wrong: the fixture stored `undefined` for it, the comparison received
    // `undefined` on both sides, and it passed. A pinning test that can pin
    // nothing is the worst kind, so the keys come from the fixture and each one
    // has to be a real number on both sides before it is compared.
    const pinned = Object.entries(row.state);
    assert.ok(pinned.length >= 20, `${where}: the fixture pinned ${pinned.length} numbers`);
    for (const [key, expected] of pinned) {
      assert.equal(typeof expected, 'number', `${where}: ${key} was pinned as a number`);
      assert.equal(typeof state[key], 'number', `${where}: ${key} is still a number`);
      assert.ok(
        closeEnough(state[key], expected),
        `${where}: ${key} is ${state[key]}, pinned at ${expected}`
      );
    }

    // Beat count is discrete — how many cycles the solver needed to settle —
    // so it is held exactly. A float tolerance on an integer would let the
    // convergence criterion drift without anything noticing.
    const solution = solveSteadyState(circulationParameters(row.progress, LOADINGS[row.loading]));
    assert.equal(solution.beats, row.beats, `${where}: beats to steady state`);

    PHASES.forEach((phase, i) => {
      assert.ok(
        closeEnough(cavityVolumeAt(phase, state), row.cavityVolume[i]),
        `${where}: cavity volume at phase ${phase}`
      );
    });
  }
});

test('the fixture covers what the extraction promised to cover', () => {
  // A pinning test is only as good as its sample, and a fixture that quietly
  // lost half its rows would still pass the test above. So the coverage is
  // asserted against the authored stages themselves rather than against a
  // count somebody typed.
  const covered = new Set(FIXTURE.map((row) => row.progress));
  for (const stage of STAGES) {
    assert.ok(covered.has(stage.at), `stage at ${stage.at} is in the fixture`);
  }
  assert.ok(covered.has(0) && covered.has(1), 'both ends of the progression are covered');

  const loadings = new Set(FIXTURE.map((row) => row.loading));
  assert.deepEqual(
    [...loadings].sort(),
    ['afterloadMax', 'afterloadMin', 'default', 'preloadMax', 'preloadMin'],
    'each public input is covered at its minimum, default and maximum'
  );

  for (const row of FIXTURE) {
    assert.equal(row.cavityVolume.length, PHASES.length, 'every case carries every phase');
  }
});

test('the model layer is pure: no three, no DOM, no scene', () => {
  // The rule the directory exists for, checked on the file rather than trusted.
  // The solver was inside a scene until this extraction, and the thing that
  // made it worth moving is precisely that it never needed any of this.
  const source = readFileSync(new URL('../src/models/cardiacMechanics.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from 'three'/, 'the model does not import three');
  assert.doesNotMatch(source, /\bdocument\.|\bwindow\./, 'the model does not touch the DOM');
  assert.doesNotMatch(source, /scenes\//, 'the model does not import a scene');
  assert.doesNotMatch(source, /Math\.random/, 'the model is deterministic');
});

test('the heart-failure scene reads the shared model rather than owning it', () => {
  // The structural claim this extraction is making. If the scene ever grows its
  // own copy of the solver again, ischemia and heart failure stop sharing a
  // cardiac cycle and the two will drift — which is the failure this is here to
  // prevent, and it would not show up as a wrong number in either scene alone.
  const hemodynamics = readFileSync(
    new URL('../src/scenes/cardiovascular/scenes/heartFailure/hemodynamics.js', import.meta.url),
    'utf8'
  );
  assert.match(
    hemodynamics,
    /from '\.\.\/\.\.\/\.\.\/\.\.\/models\/cardiacMechanics\.js'/,
    'the scene imports the shared solver'
  );
  assert.doesNotMatch(hemodynamics, /function solveSteadyState/, 'and does not carry one of its own');
});

test('the shared pieces are the ones two scenes both need', () => {
  // Geometry from a solved beat, and the named parts of the cycle. An ischemia
  // scene draws a ventricle whose wall moves with contractility, so it needs
  // the same volume-to-shape derivation the heart-failure scene uses; a second
  // implementation of it is how the same beat starts looking like two.
  const shape = ventricleShape({
    cavityVolumeMl: 120,
    myocardialVolumeMl: 140,
    longToShortAxisRatio: 1.7,
  });
  assert.ok(shape.outerRadius > shape.cavityRadius, 'the wall has thickness');
  assert.ok(
    Math.abs(shape.wallThickness - (shape.outerRadius - shape.cavityRadius)) < 1e-12,
    'and reports it consistently'
  );

  const myocardium = myocardialVolumeFor({ edvMl: 120, wallMm: 9, longToShortAxisRatio: 1.7 });
  assert.ok(myocardium > 0, 'a wall of real thickness encloses real muscle');
  assert.ok(
    radiusForVolume(120, 1.7) < radiusForVolume(120 + myocardium, 1.7),
    'and the outer radius is the larger'
  );

  // Phase advance and phase naming, which every beating scene needs and which
  // produced NaN geometry once when a scene read the wrong field.
  assert.ok(Math.abs(advanceCardiacPhase(0.9, 0.2, 60) - 0.1) < 1e-12, 'the phase wraps');
  assert.throws(() => advanceCardiacPhase(0.5, 0.1, 0), RangeError, 'and refuses a stopped heart');

  const state = sampleHemodynamics(0.4);
  const named = beatPhaseAt(state.ejectionStartPhase + 1e-6, state);
  assert.equal(named.id, 'ejection', 'the valve times partition the beat, not fixed fractions');
});

test('the compartment model is intact after the move', () => {
  // Seven compartments, conserved volume. The indices are exported and read by
  // name elsewhere, so a renumbering would silently swap two chambers.
  assert.equal(COMPARTMENTS, 7);
  assert.equal(LV, 0);

  const parameters = circulationParameters(0.4);
  const solution = solveSteadyState(parameters);
  const total = [...solution.volumes].reduce((sum, v) => sum + v, 0);
  assert.ok(
    Math.abs(total - parameters.circulatingVolume) < 1e-6,
    `blood is conserved: ${total} against ${parameters.circulatingVolume}`
  );
  assert.ok(
    volumeAtPhase(solution.cycle, solution.cycle.edvPhase) >=
      volumeAtPhase(solution.cycle, solution.cycle.esvPhase),
    'end-diastolic volume is the larger'
  );
});
