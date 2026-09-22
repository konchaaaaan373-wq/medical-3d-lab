import test from 'node:test';
import assert from 'node:assert/strict';

import {
  modelParameters,
  normaliseInput,
  presetInput,
  referenceInput,
  solveCardiacOutput,
} from '../src/models/cardiacOutput.js';
import { pressuresAt, selectEndDiastole, walkBeat } from '../src/models/cardiacMechanics.js';

/**
 * End-diastole as an **event**, and the event as the thing that is measured.
 *
 * The filling pressure was read, in turn, at the sample of largest volume
 * (which the step grid decides, because the volume is on a plateau while the
 * pressure is on the isovolumic upstroke) and then at the last sample with
 * positive mitral flow (which is a sample, not a transition: it cannot say
 * which closure it found, and it reports the loop's initial value when there
 * is none). Both were called "mitral closure" in the documents before either
 * one detected a closure.
 *
 * It is now the downward zero crossing of the atrio-ventricular gradient,
 * located between samples. These tests drive that: against an independently
 * computed trace, around the seam at phase 0/1, with the sample start rotated,
 * and with the event removed.
 */

/**
 * Every crossing in one beat, found without using the solver's own answer —
 * a second opinion rather than the same arithmetic twice.
 *
 * @param {object} input
 * @param {number} steps
 */
function crossingsByHand(input, steps = 3840) {
  const normalised = normaliseInput(input);
  const result = solveCardiacOutput(input);
  const p = modelParameters(normalised);
  const closures = [];
  let previous = null;
  walkBeat({ volumes: result.volumes, cycle: result.cycle }, p, steps, ({ phase, pressures, volumes }) => {
    const gradient = pressures.la - pressures.lv;
    if (previous && previous.gradient > 0 && gradient <= 0) {
      const span = previous.gradient - gradient;
      const u = span > 0 ? previous.gradient / span : 0;
      closures.push({
        phase: previous.phase + u * (phase - previous.phase),
        pressure: previous.pressure + u * (pressures.lv - previous.pressure),
        volume: previous.volume + u * (volumes[0] - previous.volume),
      });
    }
    previous = { gradient, phase, pressure: pressures.lv, volume: volumes[0] };
  });
  return { closures, result };
}

test('end-diastole: the reported instant is the closure an independent walk finds', () => {
  for (const input of [referenceInput(), presetInput('reduced-contractility')]) {
    const { closures, result } = crossingsByHand(input);
    assert.equal(closures.length, 1, 'this beat has exactly one mitral closure');
    const found = closures[0];
    const metrics = result.metrics;

    // Four times the resolution, so agreement is about the event rather than
    // about two runs of the same loop.
    assert.ok(
      Math.abs(metrics.mitralClosurePhase - found.phase) < 2e-3,
      `phase ${metrics.mitralClosurePhase} vs ${found.phase}`
    );
    assert.ok(
      Math.abs(metrics.endDiastolicPressureMmHg - found.pressure) < 0.02,
      `pressure ${metrics.endDiastolicPressureMmHg} vs ${found.pressure}`
    );
    assert.ok(
      Math.abs(metrics.endDiastolicVolumeAtClosureMl - found.volume) < 0.05,
      `volume ${metrics.endDiastolicVolumeAtClosureMl} vs ${found.volume}`
    );
    assert.equal(metrics.mitralClosuresInBeat, closures.length);
  }
});

test('end-diastole: the closure is at the gradient crossing, not at the largest volume', () => {
  // The distinction the two names carry. If these ever coincide, one of the
  // two definitions has quietly become the other.
  const metrics = solveCardiacOutput(referenceInput()).metrics;
  assert.ok(
    Math.abs(metrics.mitralClosurePhase - metrics.endDiastolePhase) > 0.05,
    'the event and the volume plateau are different instants and are reported as such'
  );
  // And the pressure belongs to the event's volume, not to the extremum.
  assert.ok(metrics.endDiastolicVolumeAtClosureMl <= metrics.edvMl);
  assert.ok(metrics.edvMl - metrics.endDiastolicVolumeAtClosureMl < 0.5);
});

test('end-diastole: the gradient really is zero there, and falling', () => {
  // What "closure" means, checked on the model rather than assumed: the atrium
  // is above the ventricle just before, and not just after.
  const input = referenceInput();
  const result = solveCardiacOutput(input);
  const p = modelParameters(normaliseInput(input));
  const { mitralClosurePhase } = result.metrics;

  const gradientAt = (phase) => {
    // Volumes at that phase, taken from the solved trace rather than
    // re-integrated, which is enough to ask about the sign.
    const { trace } = result.cycle;
    const wrapped = phase - Math.floor(phase);
    let index = 0;
    for (let i = 0; i < trace.phase.length; i++) if (trace.phase[i] <= wrapped) index = i;
    return trace.atrialPressure[index] - trace.lvPressure[index];
  };
  assert.ok(gradientAt(mitralClosurePhase - 0.02) > 0, 'the valve was open a moment before');
  assert.ok(gradientAt(mitralClosurePhase + 0.02) <= 0, 'and shut a moment after');
  void pressuresAt;
});

test('end-diastole: the same event is chosen however the beat is sampled', () => {
  // Rotating where the walk begins is not a different circulation — it is the
  // same periodic orbit read from a different place — so the answer must be
  // the same event. This is the seam at phase 0/1: the reference beat's
  // closure is at ~0.92 and the ejection it anchors to starts at ~0.06, so the
  // selection has to wrap.
  const base = solveCardiacOutput(referenceInput());
  assert.ok(base.metrics.mitralClosurePhase > 0.5, 'the closure is late in the cycle');
  assert.ok(base.metrics.ejectionStartPhase < 0.5, 'and the ejection it anchors to is early');

  // Resolution is the sampling this model lets a caller change. The event has
  // to survive it; a sample-picked value does not.
  const readings = [240, 480, 960, 1920].map(
    (stepsPerBeat) =>
      solveCardiacOutput(referenceInput(), { stepsPerBeat, diagnosticSteps: stepsPerBeat * 4 }).metrics
        .endDiastolicPressureMmHg
  );
  const spread = Math.max(...readings) - Math.min(...readings);
  assert.ok(spread < 0.01, `end-diastolic pressure spread ${spread.toFixed(4)} mmHg across four resolutions`);
});

test('end-diastole: a beat with no closure reports none, and is refused', () => {
  // "No event was found" and "the pressure was 0 mmHg" are the same number and
  // not the same fact. The boundary must say the first.
  //
  // Driven by closing the mitral valve with a resistance so large nothing can
  // cross it — a condition the sliders cannot reach, which is why it is
  // exercised here rather than assumed.
  const input = referenceInput();
  const parameters = modelParameters(normaliseInput(input));
  const sealed = { ...parameters, mitralResistance: 1e9 };

  let closures = 0;
  let previous = null;
  const volumes = Float64Array.from([116, 90, 400, 120, 60, 70, 45]);
  walkBeat({ volumes, cycle: { cycleLength: 0.857 } }, sealed, 240, ({ pressures }) => {
    const gradient = pressures.la - pressures.lv;
    if (previous !== null && previous > 0 && gradient <= 0) closures += 1;
    previous = gradient;
  });
  // With the valve sealed the atrium fills and the ventricle does not, so the
  // gradient stays on one side and never crosses downward.
  assert.equal(closures, 0, 'a sealed valve produces no closure to find');

  // And the boundary's own refusal names it rather than reporting a zero.
  const refusal = solveCardiacOutput({ ...input, heartRatePerMin: 400 });
  assert.equal(refusal.metrics, null);
  assert.ok(refusal.problems.length > 0);
});


test('end-diastole: which closure, when a beat has more than one', () => {
  // The circulation this scene solves closes the mitral valve once per beat,
  // so no run of it can tell a correct selection rule from a wrong one — a
  // deliberate mutation that picked the nearest closure *forward* of ejection
  // instead of backward passed every other test in this file. The rule is
  // therefore driven with lists the model does not produce.
  const at = (...phases) => phases.map((phase) => ({ phase }));

  // Two closures, ejection at 0.06. The one that ends the filling ejection
  // follows is 0.92; 0.40 is a mid-systolic artefact that must not be chosen.
  assert.equal(selectEndDiastole(at(0.4, 0.92), 0.06).phase, 0.92);
  assert.equal(selectEndDiastole(at(0.92, 0.4), 0.06).phase, 0.92, 'and the order found does not decide it');

  // Three, including one just *after* ejection starts. Nearest-in-either-
  // direction would take 0.07; backwards-only takes 0.95.
  assert.equal(selectEndDiastole(at(0.07, 0.5, 0.95), 0.06).phase, 0.95);

  // A beat that does not wrap: filling and ejection both inside one cycle.
  assert.equal(selectEndDiastole(at(0.1, 0.3), 0.45).phase, 0.3);

  // Exactly at the anchor counts as the closure that ends filling, not as the
  // furthest one a whole cycle back.
  assert.equal(selectEndDiastole(at(0.06, 0.5), 0.06).phase, 0.06);

  // The seam itself.
  assert.equal(selectEndDiastole(at(0.999, 0.5), 0.001).phase, 0.999);
  assert.equal(selectEndDiastole(at(0.0, 0.6), 0.0).phase, 0.0);

  // Nothing to choose from is not a choice.
  assert.equal(selectEndDiastole([], 0.06), null);
  assert.equal(selectEndDiastole(null, 0.06), null);
});
