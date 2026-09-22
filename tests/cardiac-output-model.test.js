import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CARDIAC_OUTPUT_UNITS,
  CONTROL_DOMAIN,
  CONTROL_IDS,
  DIAGNOSTIC_TOLERANCES,
  FIXED_CIRCULATION,
  FIXED_LEFT_VENTRICLE,
  PRESET_IDS,
  PRESET_LIST,
  RESULT_STATUS,
  REFERENCE_GEOMETRY,
  inputKey,
  inputProblems,
  modelParameters,
  normaliseInput,
  presetInput,
  pressureVolumeCurves,
  referenceInput,
  solveCardiacOutput,
} from '../src/models/cardiacOutput.js';
import { DYN_S_CM5_PER_MMHG_S_ML, mmHgSPerMlToDynSCm5, dynSCm5ToMmHgSPerMl } from '../src/models/units.js';
import { CIRCULATION_CONSTANTS, CIRCULATION_KEYFRAMES } from '../src/data/heartFailure.js';

/** Five points on each axis, so the corners of the domain are walked, not just its middle. */
const axisPoints = (id) => {
  const { min, max } = CONTROL_DOMAIN[id];
  return [min, min + (max - min) / 4, (min + max) / 2, max - (max - min) / 4, max];
};

/** Every corner and quarter-point of the four-dimensional domain: 625 conditions. */
function* domainGrid() {
  const [a, b, c, d] = CONTROL_IDS;
  for (const av of axisPoints(a))
    for (const bv of axisPoints(b))
      for (const cv of axisPoints(c))
        for (const dv of axisPoints(d)) yield { [a]: av, [b]: bv, [c]: cv, [d]: dv };
}

const describe = (input) => CONTROL_IDS.map((id) => `${id}=${input[id]}`).join(' ');

/**
 * Model integrity for the cardiac-output experiment.
 *
 * Nothing here is a claim about physiology — that is
 * `cardiac-output-physiology.test.js`. These are the properties the scene, the
 * lesson and the sequence are all allowed to assume: that an input is checked
 * however it was produced, that the same condition gives the same answer by
 * every route, that a solution which did not settle carries no numbers, and
 * that the arithmetic joining EDV, ESV, stroke volume and cardiac output is
 * the arithmetic those names mean.
 */

const solve = (overrides = {}) => solveCardiacOutput({ ...referenceInput(), ...overrides });

test('the reference condition settles and reports a full read-out', () => {
  const result = solve();
  assert.equal(result.status, RESULT_STATUS.VALID);
  assert.ok(result.metrics, 'a valid solution carries metrics');
  assert.ok(result.diagnostics.converged);
  assert.ok(result.diagnostics.beats > 0 && result.diagnostics.beats < result.diagnostics.maxBeats);
  for (const value of Object.values(result.metrics)) {
    assert.ok(Number.isFinite(value), `every metric is finite: ${value}`);
  }
});

test('a solution that did not settle hands back no numbers at all', () => {
  // One beat is not a steady state, and the boundary has to say so rather than
  // reporting whatever the ventricle happened to be doing. `metrics: null` is
  // the guard: a panel cannot render a field that does not exist, so there is
  // no route by which an unsettled figure reaches a reader.
  const result = solveCardiacOutput(referenceInput(), { maxBeats: 1 });
  assert.equal(result.status, RESULT_STATUS.NONCONVERGED);
  assert.equal(result.metrics, null);
  assert.equal(result.cycle, null);
  assert.equal(result.volumes, null);
  assert.ok(result.problems.length > 0, 'and it says what went wrong');
  assert.equal(result.diagnostics.converged, false);
});

test('an input outside the verified range is refused, not clamped', () => {
  // Clamping would answer a question nobody asked and look like success.
  for (const id of CONTROL_IDS) {
    const tooHigh = { ...referenceInput(), [id]: CONTROL_DOMAIN[id].max * 4 };
    const result = solveCardiacOutput(tooHigh);
    assert.equal(result.status, RESULT_STATUS.INVALID, `${id} above its range`);
    assert.equal(result.metrics, null);
    assert.match(result.problems.join(' '), new RegExp(id));
  }
  for (const bad of [Number.NaN, Infinity, null, undefined, '70']) {
    const result = solveCardiacOutput({ ...referenceInput(), heartRatePerMin: bad });
    assert.equal(result.status, RESULT_STATUS.INVALID, `heart rate ${String(bad)}`);
  }
  assert.equal(solveCardiacOutput(null).status, RESULT_STATUS.INVALID);
});

test('the domain a caller gets by default is the verified one', () => {
  // `inputProblems` takes a domain so the sweep can reach past the edge. If the
  // default ever became the caller's, every check in the product would be
  // whatever the caller felt like.
  const beyond = { ...referenceInput(), heartRatePerMin: CONTROL_DOMAIN.heartRatePerMin.max + 20 };
  assert.equal(inputProblems(beyond).length, 1, 'refused against the declared domain');
  assert.equal(
    inputProblems(beyond, { heartRatePerMin: { min: 30, max: 200 } }).length,
    0,
    'and accepted only when a wider domain is passed in explicitly'
  );
});

test('solving does not touch the object it was given', () => {
  // The session keeps the condition a reader is on, the snapshot it is compared
  // against and the preset's starting point in objects like this one. If solving
  // wrote to any of them, the baseline would follow the current state around.
  const input = referenceInput();
  const before = JSON.stringify(input);
  const result = solve();
  assert.equal(JSON.stringify(input), before);
  assert.throws(() => {
    result.input.heartRatePerMin = 200;
  }, 'and the result carries a frozen copy');
});

test('the same condition gives the same answer cold, warm and out of order', () => {
  const a = { ...referenceInput(), systemicResistanceMmHgSPerMl: 1.5 };
  const b = { ...referenceInput(), contractilityEesMmHgPerMl: 1.2, heartRatePerMin: 95 };

  const coldA = solveCardiacOutput(a);
  const coldB = solveCardiacOutput(b);
  // A → B → A, warm-started each time from the previous solution: the closing
  // A must be the A that was solved from scratch, or the read-out depends on
  // the route a reader took to get there.
  const warmB = solveCardiacOutput(b, { warmStart: coldA.volumes });
  const warmA = solveCardiacOutput(a, { warmStart: warmB.volumes });

  // The tolerance is the solver's, not a number picked to make this pass. The
  // termination test stops when successive beats agree to 0.02 mL, so two
  // routes to one condition may finish a fraction of a millilitre apart; what
  // has to be true is that the difference is far below the digit a reader is
  // shown. Volumes are displayed to the nearest mL, pressures to the nearest
  // mmHg, cardiac output to 0.1 L/min, so an eighth of the smallest of those is
  // the line — tight enough that a route-dependent answer could not hide under
  // it, loose enough that the integrator is not being asked for exactness it
  // never claimed.
  const close = (x, y, label) => assert.ok(Math.abs(x - y) < 0.125, `${label}: ${x} vs ${y}`);
  const closeOutput = (x, y, label) => assert.ok(Math.abs(x - y) < 0.0125, `${label}: ${x} vs ${y}`);
  closeOutput(warmA.metrics.cardiacOutputLMin, coldA.metrics.cardiacOutputLMin, 'CO back at A');
  close(warmA.metrics.meanArterialPressureMmHg, coldA.metrics.meanArterialPressureMmHg, 'MAP back at A');
  close(warmA.metrics.strokeVolumeMl, coldA.metrics.strokeVolumeMl, 'SV back at A');
  closeOutput(warmB.metrics.cardiacOutputLMin, coldB.metrics.cardiacOutputLMin, 'CO at B by either route');
  close(warmB.metrics.edvMl, coldB.metrics.edvMl, 'EDV at B by either route');
});

test('a cache key separates two conditions exactly when the solver does', () => {
  const base = referenceInput();
  for (const id of CONTROL_IDS) {
    const moved = { ...base, [id]: base[id] + CONTROL_DOMAIN[id].step * 3 };
    assert.notEqual(inputKey(moved), inputKey(base), `${id} must appear in the key`);
    const solvedBase = solveCardiacOutput(base);
    const solvedMoved = solveCardiacOutput(moved);
    assert.notEqual(
      solvedMoved.metrics.cardiacOutputLMin,
      solvedBase.metrics.cardiacOutputLMin,
      `${id} changes the answer, so a key that dropped it would serve the wrong one`
    );
  }
  // Solver settings change the answer too, so they are in the key.
  assert.notEqual(inputKey(base, { stepsPerBeat: 480 }), inputKey(base));
});

test('the key and the solver round a value the same way', () => {
  // Rounding only the key is how two conditions come to share one answer: they
  // collapse in the cache while the solver would have separated them.
  const nudged = { ...referenceInput(), heartRatePerMin: 70.4 };
  assert.equal(inputKey(nudged), inputKey(referenceInput()), 'they share a key');
  const a = solveCardiacOutput(nudged);
  const b = solveCardiacOutput(referenceInput());
  assert.deepEqual(a.input, b.input, 'because the solver was handed the same rounded input');
  assert.equal(a.metrics.cardiacOutputLMin, b.metrics.cardiacOutputLMin);
  assert.equal(normaliseInput({ heartRatePerMin: 70.4 }).heartRatePerMin, 70);
});

test('stroke volume, ejection fraction and cardiac output are what their names mean', () => {
  for (const hr of [50, 70, 110]) {
    for (const ees of [1.2, 2.74, 4.0]) {
      const { metrics } = solve({ heartRatePerMin: hr, contractilityEesMmHgPerMl: ees });
      assert.ok(
        Math.abs(metrics.strokeVolumeMl - (metrics.edvMl - metrics.esvMl)) < 1e-9,
        'SV = EDV − ESV'
      );
      assert.ok(
        Math.abs(metrics.cardiacOutputLMin - (hr * metrics.strokeVolumeMl) / 1000) < 1e-9,
        'CO = HR × SV / 1000'
      );
      assert.ok(
        Math.abs(metrics.ejectionFraction - metrics.strokeVolumeMl / metrics.edvMl) < 1e-9,
        'EF = SV / EDV'
      );
      assert.equal(metrics.heartRatePerMin, hr, 'the rate reported is the rate solved');
    }
  }
});

test('resistance converts between the model unit and the clinical one, checked two ways', () => {
  // Not the same call twice. The independent reference is the bedside formula,
  // SVR[dyn·s·cm⁻⁵] = 80 · (MAP − CVP)[mmHg] / CO[L/min], which reaches the same
  // resistance through a per-minute flow instead of a per-second one.
  const { metrics } = solve();
  const gradientMmHg =
    metrics.meanArterialPressureMmHg - metrics.meanSystemicVenousPressureMmHg;
  const bedside = (80 * gradientMmHg) / metrics.cardiacOutputLMin;
  const converted = mmHgSPerMlToDynSCm5(metrics.systemicResistanceMmHgSPerMl);
  assert.ok(
    Math.abs(bedside - converted) / converted < 0.02,
    `bedside ${bedside.toFixed(1)} vs converted ${converted.toFixed(1)} dyn·s·cm⁻⁵`
  );
  // And the factor itself, from first principles: 1 mmHg = 1333.22 dyn/cm²,
  // 1 mL = 1 cm³.
  assert.ok(Math.abs(DYN_S_CM5_PER_MMHG_S_ML - 1333.22) < 0.01);
  assert.ok(Math.abs((DYN_S_CM5_PER_MMHG_S_ML * 60) / 1000 - 80) < 0.02, 'the clinical ×80 is this factor');
  assert.ok(Math.abs(dynSCm5ToMmHgSPerMl(mmHgSPerMlToDynSCm5(1.1)) - 1.1) < 1e-12);
  assert.equal(CARDIAC_OUTPUT_UNITS.resistance, 'mmHg·s/mL');
});

test('the read-out does not move when the trace is sampled more finely', () => {
  // `samples` is the drawing density of the recorded beat. If a medical figure
  // moved with it, a plot's resolution would be changing the physiology.
  const coarse = solveCardiacOutput(referenceInput(), { samples: 60 });
  const fine = solveCardiacOutput(referenceInput(), { samples: 240 });
  for (const key of ['edvMl', 'esvMl', 'strokeVolumeMl', 'cardiacOutputLMin']) {
    assert.ok(
      Math.abs(coarse.metrics[key] - fine.metrics[key]) < 1e-9,
      `${key} is independent of trace sampling`
    );
  }
  assert.ok(coarse.cycle.trace.phase.length < fine.cycle.trace.phase.length);
});

test('halving the integration step moves nothing the read-out shows', () => {
  const standard = solveCardiacOutput(referenceInput());
  const fine = solveCardiacOutput(referenceInput(), { stepsPerBeat: 960, diagnosticSteps: 1920 });
  const within = (key, limit) =>
    assert.ok(
      Math.abs(standard.metrics[key] - fine.metrics[key]) < limit,
      `${key}: ${standard.metrics[key]} vs ${fine.metrics[key]}`
    );
  within('edvMl', 0.5);
  within('esvMl', 0.5);
  within('strokeVolumeMl', 0.5);
  within('cardiacOutputLMin', 0.05);
  within('meanArterialPressureMmHg', 0.5);
});

test('the fixed circulation is the heart-failure model’s, number for number', () => {
  // The boundary writes these out rather than importing `src/data/heartFailure.js`,
  // which carries stage names and disclaimers a model may not know about. The
  // duplication is deliberate; going unchecked is what would make it a defect.
  assert.deepEqual(
    JSON.parse(JSON.stringify(FIXED_CIRCULATION)),
    JSON.parse(JSON.stringify(CIRCULATION_CONSTANTS))
  );
  const reference = CIRCULATION_KEYFRAMES[0];
  assert.equal(FIXED_LEFT_VENTRICLE.unstressedVolumeMl, reference.v0);
  assert.equal(FIXED_LEFT_VENTRICLE.edpvrB, reference.edpvrB);
  assert.equal(CONTROL_DOMAIN.contractilityEesMmHgPerMl.default, reference.ees);
  assert.equal(CONTROL_DOMAIN.fillingVolumeMl.default, reference.circulatingVolume);
  assert.equal(CONTROL_DOMAIN.systemicResistanceMmHgSPerMl.default, reference.systemicResistance);
  assert.equal(CONTROL_DOMAIN.heartRatePerMin.default, reference.hr);
  assert.equal(REFERENCE_GEOMETRY.wallMm, reference.wallMm);
  assert.equal(REFERENCE_GEOMETRY.longToShortAxisRatio, reference.longToShortAxisRatio);
});

test('the two presets differ in contractility and in nothing else', () => {
  const reference = presetInput(PRESET_IDS.REFERENCE);
  const reduced = presetInput(PRESET_IDS.REDUCED_CONTRACTILITY);
  for (const id of CONTROL_IDS) {
    if (id === 'contractilityEesMmHgPerMl') continue;
    assert.equal(reduced[id], reference[id], `${id} is the same in both presets`);
  }
  assert.ok(reduced.contractilityEesMmHgPerMl < reference.contractilityEesMmHgPerMl);
  assert.deepEqual([...PRESET_LIST].sort(), ['reduced-contractility', 'reference']);
  assert.throws(() => presetInput('hfref'), /unknown preset/);
  // And the parameters really do differ in one field only — the check above is
  // about the inputs, this one is about what reaches the solver.
  const a = modelParameters(reference);
  const b = modelParameters(reduced);
  assert.equal(a.circulatingVolume, b.circulatingVolume);
  assert.equal(a.systemicResistance, b.systemicResistance);
  assert.equal(a.heartRate, b.heartRate);
  assert.equal(a.lv.v0, b.lv.v0);
  assert.equal(a.lv.edpvrB, b.lv.edpvrB);
  assert.notEqual(a.lv.ees, b.lv.ees);
});

test('the pressure-volume plot is the solved beat, not a second curve', () => {
  const result = solve();
  const curves = pressureVolumeCurves(result);
  const { trace } = result.cycle;
  assert.equal(curves.loop.length, trace.phase.length);
  for (let i = 0; i < curves.loop.length; i++) {
    assert.equal(curves.loop[i].volume, trace.lvVolume[i]);
    assert.equal(curves.loop[i].pressure, trace.lvPressure[i]);
  }
  // The end-systolic marker is the pressure that was recorded there, not the
  // elastance line's value at that volume. They are close, and substituting one
  // for the other would draw a loop tangent to a line it only approaches.
  const { ees, v0 } = result.parameters.lv;
  const theoretical = ees * (result.metrics.esvMl - v0);
  assert.ok(Math.abs(curves.markers.endSystole.pressure - theoretical) < 12);
  assert.ok(curves.markers.endSystole.pressure !== theoretical);
  assert.equal(curves.markers.endDiastole.volume, result.metrics.edvMl);
  // The ejection band comes from the solved valve times.
  assert.equal(curves.waveform.ejection.from, result.metrics.ejectionStartPhase);
  assert.equal(curves.waveform.ejection.to, result.metrics.ejectionEndPhase);
  assert.equal(pressureVolumeCurves({ status: RESULT_STATUS.NONCONVERGED }), null);
});

test('the diagnostic tolerances are coarser than nothing and finer than the read-out', () => {
  // A tolerance of zero cannot be met by a numerical solution; one of several
  // millilitres could not notice a beat that was not periodic. Volumes are
  // shown to the nearest millilitre, so half of one is the useful line.
  for (const [key, value] of Object.entries(DIAGNOSTIC_TOLERANCES)) {
    assert.ok(Number.isFinite(value) && value >= 0, `${key} is a number`);
  }
  assert.ok(DIAGNOSTIC_TOLERANCES.periodicResidualMl <= 0.5);
  assert.ok(DIAGNOSTIC_TOLERANCES.conservedVolumeMl <= 0.5);
  assert.equal(DIAGNOSTIC_TOLERANCES.valveBackflowMlPerS, 0, 'an ideal valve never runs backwards');
});

test('every condition in the declared domain settles into a genuinely periodic beat', () => {
  // The domain is a claim, and this is the claim being checked: over all of it,
  // the seven compartments come back to where they started, the conserved
  // volume is the volume that was asked for, no ideal valve carries flow
  // backwards, and what crossed the aortic valve over the beat is the stroke
  // volume. If one corner of the range does not settle, the range is wrong —
  // which is the reason the range was swept rather than chosen.
  let worstPeriodic = 0;
  let worstStroke = 0;
  let count = 0;
  for (const input of domainGrid()) {
    const result = solveCardiacOutput(input);
    count += 1;
    assert.equal(result.status, RESULT_STATUS.VALID, `${describe(input)}: ${result.problems.join('; ')}`);
    const d = result.diagnostics;
    assert.ok(d.finite, `${describe(input)}: a value was not finite`);
    assert.ok(
      d.periodicResidualMl <= DIAGNOSTIC_TOLERANCES.periodicResidualMl,
      `${describe(input)}: ${d.worstCompartment} drifted ${d.periodicResidualMl}`
    );
    assert.ok(
      Math.abs(d.conservedVolumeMl - d.requestedVolumeMl) <= DIAGNOSTIC_TOLERANCES.conservedVolumeMl,
      `${describe(input)}: volume closed at ${d.conservedVolumeMl}`
    );
    assert.ok(d.valveBackflowMlPerS >= 0, `${describe(input)}: a valve ran backwards`);
    assert.ok(
      d.strokeVolumeMismatchMl <= DIAGNOSTIC_TOLERANCES.strokeVolumeMismatchMl,
      `${describe(input)}: SV and aortic throughput differ by ${d.strokeVolumeMismatchMl}`
    );
    worstPeriodic = Math.max(worstPeriodic, d.periodicResidualMl);
    worstStroke = Math.max(worstStroke, d.strokeVolumeMismatchMl);
  }
  assert.equal(count, 625, 'the whole grid was walked');
  // Recorded so a regression that merely eats the headroom is visible as a
  // number rather than only as a pass.
  assert.ok(worstPeriodic < 0.2, `worst periodic residual ${worstPeriodic.toFixed(4)} mL`);
  assert.ok(worstStroke < 0.2, `worst stroke-volume mismatch ${worstStroke.toFixed(4)} mL`);
});

test('what enters the ventricle over a beat is what leaves it', () => {
  // Continuity, at every junction of the loop rather than at the one that is
  // drawn. In a steady beat the mitral and aortic throughputs are equal, the
  // right side carries the same volume as the left, and the systemic and
  // pulmonary beds each carry it too — otherwise blood would be accumulating
  // somewhere, which is what the periodic residual would then show.
  for (const input of [referenceInput(), presetInput(PRESET_IDS.REDUCED_CONTRACTILITY)]) {
    const { diagnostics, metrics } = solveCardiacOutput(input);
    const f = diagnostics.beatFlowsMl;
    const near = (x, y, label) =>
      assert.ok(Math.abs(x - y) < 0.5, `${label}: ${x.toFixed(3)} vs ${y.toFixed(3)}`);
    near(f.mitral, f.aortic, 'mitral and aortic throughput');
    near(f.aortic, f.systemic, 'aortic and systemic bed');
    near(f.systemic, f.tricuspid, 'systemic bed and right filling');
    near(f.tricuspid, f.pulmonic, 'right filling and pulmonic ejection');
    near(f.pulmonic, f.pulmonary, 'pulmonic and pulmonary bed');
    near(f.pulmonary, f.pulmonaryVenous, 'pulmonary bed and return to the atrium');
    near(f.aortic, metrics.strokeVolumeMl, 'aortic throughput and stroke volume');
  }
});
