import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOWMAN_PRESSURE,
  PLASMA_ONCOTIC_PRESSURE,
  kidneyWithoutTheSignal,
  solveHepatorenal,
  solveKidney,
} from '../src/models/hepatorenal.js';

/**
 * Layer 1 — external physiology invariants for the hepatorenal model.
 *
 * Every test here asserts something the literature requires **independently of
 * this repository**: a direction, an ordering, a mechanism, or a relation that
 * follows from physics. Not one of them may contain a constant this repository
 * chose. If a test in this file fails, the medical model has broken a
 * constraint the physiology imposes, and that is the only kind of failure that
 * licenses saying so.
 *
 * The magnitudes — every gain, every reference, every effect size — are checked
 * in `calibration.test.js`, and a failure there means the parameterisation has
 * moved, not that the physiology is wrong.
 */

/** Cirrhosis along one axis: scarring and the vasodilation it induces, together. */
const severity = (t) => ({ structuralResistance: 1 + 11 * t, splanchnicVasodilation: t });
const STEPS = [0, 0.2, 0.4, 0.6, 0.8, 1];

const strictlyRising = (values) => values.every((v, i) => i === 0 || v > values[i - 1]);
const strictlyFalling = (values) => values.every((v, i) => i === 0 || v < values[i - 1]);

test('physiology: glomerular filtration follows the net filtration pressure', () => {
  // Ultrafiltration, not secretion: what is filtered is the net Starling
  // pressure times a coefficient, and when the net pressure reaches zero
  // filtration stops however much blood is arriving.
  for (const t of STEPS) {
    const { kidney } = solveHepatorenal(severity(t));
    assert.equal(
      kidney.netFiltrationPressureMmHg,
      kidney.glomerularPressureMmHg - BOWMAN_PRESSURE - PLASMA_ONCOTIC_PRESSURE,
      'the net pressure has to be the Starling balance and nothing else'
    );
    assert.ok(
      Math.abs(
        kidney.glomerularFiltrationRateMlPerMin -
          kidney.filtrationCoefficient * kidney.netFiltrationPressureMmHg
      ) < 1e-9,
      'filtration has to be the coefficient times the net pressure'
    );
  }

  // Drive the glomerular pressure below the opposing pressures and filtration
  // stops, with blood still flowing through the glomerulus.
  const stopped = solveKidney({ meanArterialPressureMmHg: 45, activation: 1 });
  assert.ok(stopped.netFiltrationPressureMmHg <= 0);
  assert.equal(stopped.glomerularFiltrationRateMlPerMin, 0);
  assert.ok(stopped.renalBloodFlowMlPerMin > 0, 'flow without filtration is the point of the test');
});

test('physiology: dilating one bed lowers the resistance of the whole circulation', () => {
  // The systemic beds are in parallel. Opening one of them lowers the total
  // however the others respond, and here the others are responding by
  // constricting — which limits the fall without reversing it.
  const resistances = STEPS.map(
    (t) => solveHepatorenal({ structuralResistance: 6, splanchnicVasodilation: t }).systemic.systemicVascularResistance
  );
  assert.ok(strictlyFalling(resistances), `resistance did not fall monotonically: ${resistances}`);
});

test('physiology: worsening cirrhosis raises cardiac output and still lowers arterial pressure', () => {
  // The hyperdynamic circulation. The heart does compensate — output rises at
  // every step — and the compensation is incomplete, so pressure falls anyway.
  // A model in which output rose and pressure held would be a model with no
  // hepatorenal syndrome in it.
  const states = STEPS.map((t) => solveHepatorenal(severity(t)));
  assert.ok(
    strictlyRising(states.map((s) => s.systemic.cardiacOutputMlPerMin)),
    'cardiac output has to rise'
  );
  assert.ok(
    strictlyFalling(states.map((s) => s.systemic.meanArterialPressureMmHg)),
    'and arterial pressure has to fall anyway'
  );
});

test('physiology: arterial underfilling activates the vasoconstrictor systems', () => {
  // Cause and response, in that order: the arterial bed dilates, and the
  // vasoconstrictor systems answer it.
  const states = STEPS.map((t) => solveHepatorenal(severity(t)));
  assert.ok(strictlyRising(states.map((s) => s.neurohumoral.arterialUnderfilling)));
  assert.ok(strictlyRising(states.map((s) => s.neurohumoral.activation)));
  assert.equal(states[0].neurohumoral.activation, 0, 'a normal circulation activates nothing');
});

test('physiology: removing the vasoconstrictor signal restores renal perfusion at any severity', () => {
  // The claim the whole scene exists for. The kidney is not damaged, so at any
  // severity of liver disease, removing the signal and changing nothing else
  // restores its perfusion — and the kidney the model solves is a function of
  // the arterial pressure and the signal alone, with nothing about the liver
  // in it.
  //
  // Perfusion, not filtration, is what is restored *always*. Early in the
  // course the signal is holding filtration up rather than down, by
  // constricting the efferent arteriole while the afferent one is still
  // shielded — so the second assertion below is conditioned on filtration
  // being depressed in the first place, which is the honest form of the claim.
  const healthy = solveHepatorenal(severity(0)).kidney;

  for (const t of STEPS.slice(1)) {
    const state = solveHepatorenal(severity(t));
    const released = kidneyWithoutTheSignal(state);

    assert.ok(
      released.renalBloodFlowMlPerMin > state.kidney.renalBloodFlowMlPerMin,
      `severity ${t}: releasing the signal did not restore renal blood flow`
    );
    assert.deepEqual(
      released,
      solveKidney({
        meanArterialPressureMmHg: state.systemic.meanArterialPressureMmHg,
        activation: 0,
      }),
      'the kidney has to be a function of pressure and signal, and know nothing about the liver'
    );
  }

  // Once the afferent arteriole has run out of room, every further step makes
  // filtration worse — that is the syndrome, and it is where releasing the
  // signal is worth something.
  const failing = STEPS.map((t) => solveHepatorenal(severity(t))).filter(
    (state) => !state.kidney.autoregulating
  );
  assert.ok(failing.length >= 2, 'the severity range has to reach the failing phase at all');
  assert.ok(
    strictlyFalling(failing.map((s) => s.kidney.glomerularFiltrationRateMlPerMin)),
    'past the failure of autoregulation, filtration has to fall with severity'
  );

  const worst = solveHepatorenal(severity(1));
  assert.ok(
    worst.kidney.glomerularFiltrationRateMlPerMin < healthy.glomerularFiltrationRateMlPerMin,
    'the worst severity has to depress filtration, or there is no syndrome here'
  );
  assert.ok(
    kidneyWithoutTheSignal(worst).glomerularFiltrationRateMlPerMin >
      worst.kidney.glomerularFiltrationRateMlPerMin,
    'and releasing the signal there has to improve it, or nothing was functional'
  );
});

test('physiology: efferent-predominant constriction defends filtration and raises the filtration fraction', () => {
  // While the afferent arteriole is still free to autoregulate, the efferent
  // one is already constricting. Renal blood flow falls; filtration does not
  // fall with it, and the fraction of plasma filtered rises. That dissociation
  // is what a single renal resistance cannot produce.
  const early = [0, 0.1, 0.2, 0.3].map((activation) =>
    solveKidney({ meanArterialPressureMmHg: 88, activation })
  );
  assert.ok(early.every((k) => k.autoregulating), 'this test is about the phase before the floor binds');
  assert.ok(strictlyFalling(early.map((k) => k.renalBloodFlowMlPerMin)), 'blood flow has to fall');
  assert.ok(strictlyRising(early.map((k) => k.filtrationFraction)), 'the filtration fraction has to rise');
  assert.ok(
    early.at(-1).glomerularFiltrationRateMlPerMin >= early[0].glomerularFiltrationRateMlPerMin,
    'and filtration must not have fallen while blood flow did'
  );
});

test('physiology: the vasoconstrictor signal lowers the ultrafiltration coefficient', () => {
  // Mesangial contraction. It opposes the rise in glomerular pressure that the
  // same signal causes, which is why early activation does not send filtration
  // far above normal.
  const coefficients = [0, 0.25, 0.5, 0.75, 1].map(
    (activation) => solveKidney({ meanArterialPressureMmHg: 85, activation }).filtrationCoefficient
  );
  assert.ok(strictlyFalling(coefficients), `the coefficient did not fall: ${coefficients}`);
});

test('physiology: renal blood flow is held steady within the autoregulatory range and follows pressure below it', () => {
  // Inside the range the arteriole absorbs the change in driving pressure and
  // flow barely moves. Below it there is nothing left to absorb with, and flow
  // becomes a function of pressure.
  const at = (map) => solveKidney({ meanArterialPressureMmHg: map, activation: 0 });

  const inside = [95, 90, 85, 80].map(at);
  assert.ok(inside.every((k) => k.autoregulating));
  const insideSpread =
    Math.max(...inside.map((k) => k.renalBloodFlowMlPerMin)) /
    Math.min(...inside.map((k) => k.renalBloodFlowMlPerMin));
  const pressureSpread = (95 - 4) / (80 - 4);
  assert.ok(
    insideSpread < pressureSpread,
    'flow inside the range has to vary less than the driving pressure does'
  );

  const below = [60, 50, 40].map(at);
  assert.ok(below.every((k) => !k.autoregulating), 'below the range nothing is being regulated');
  // With the arteriole pinned, flow is the driving pressure over a fixed
  // resistance: halve the one and the other halves with it.
  const ratio =
    below[0].renalBloodFlowMlPerMin / below[2].renalBloodFlowMlPerMin / ((60 - 4) / (40 - 4));
  assert.ok(Math.abs(ratio - 1) < 0.02, `flow did not follow pressure below the range: ${ratio}`);
});

test('physiology: vasoconstrictor tone raises the pressure at which autoregulation fails', () => {
  // The mechanism of the syndrome. The kidney does not stop autoregulating
  // because the pressure fell further than usual; it stops because the tone it
  // is working against left it less room to compensate with.
  const lowerLimit = (activation) => {
    for (let map = 220; map > 20; map -= 0.25) {
      // The *lower* limit specifically: the pressure at which the arteriole
      // runs out of dilating room. Above the range it is also not regulating,
      // for the opposite reason, and that is not what this is measuring.
      if (solveKidney({ meanArterialPressureMmHg: map, activation }).autoregulatoryReserve <= 0) return map;
    }
    return 20;
  };
  const limits = [0, 0.5, 0.75, 1].map(lowerLimit);
  assert.ok(strictlyRising(limits), `the lower limit did not rise with tone: ${limits}`);
});

test('physiology: blocking the afferent shield worsens filtration without touching the circulation', () => {
  // The cleanest statement of the whole model: a drug that does nothing
  // systemic at all makes the kidney worse, because what it removes is the
  // kidney's local defence against a signal that was already there.
  const base = { structuralResistance: 10, splanchnicVasodilation: 0.9 };
  const before = solveHepatorenal(base);
  const after = solveHepatorenal({ ...base, prostaglandinInhibition: 1 });

  assert.equal(after.systemic.meanArterialPressureMmHg, before.systemic.meanArterialPressureMmHg);
  assert.equal(after.systemic.cardiacOutputMlPerMin, before.systemic.cardiacOutputMlPerMin);
  assert.equal(after.neurohumoral.activation, before.neurohumoral.activation);
  assert.ok(
    after.kidney.glomerularFiltrationRateMlPerMin < before.kidney.glomerularFiltrationRateMlPerMin,
    'and yet filtration has to be worse'
  );

  // On a circulation that is not activated there is nothing for it to remove.
  const healthy = solveHepatorenal({ structuralResistance: 1 });
  const healthyOnDrug = solveHepatorenal({ structuralResistance: 1, prostaglandinInhibition: 1 });
  assert.equal(
    healthyOnDrug.kidney.glomerularFiltrationRateMlPerMin,
    healthy.kidney.glomerularFiltrationRateMlPerMin
  );
});

test('physiology: a splanchnic vasoconstrictor improves filtration by way of the circulation', () => {
  // It treats the circulation. The kidney is the same function it always was —
  // the arguments changed.
  const base = { structuralResistance: 10, splanchnicVasodilation: 0.9 };
  const doses = [0, 0.25, 0.5, 0.75].map((terlipressin) =>
    solveHepatorenal({ ...base, terlipressin })
  );
  assert.ok(strictlyRising(doses.map((s) => s.systemic.meanArterialPressureMmHg)));
  assert.ok(strictlyFalling(doses.map((s) => s.neurohumoral.activation)));
  assert.ok(strictlyRising(doses.map((s) => s.kidney.glomerularFiltrationRateMlPerMin)));
  assert.ok(
    strictlyFalling(doses.map((s) => s.systemic.cardiacOutputMlPerMin)),
    'and the hyperdynamic circulation has to settle back, not be driven harder'
  );

  for (const state of doses) {
    assert.deepEqual(
      state.kidney,
      solveKidney({
        meanArterialPressureMmHg: state.systemic.meanArterialPressureMmHg,
        activation: state.neurohumoral.activation,
        prostaglandinInhibition: 0,
      }),
      'nothing may reach the kidney except the pressure and the signal'
    );
  }
});

test('physiology: a weaker cardiac response deepens the underfilling and lowers filtration', () => {
  // Cirrhotic cardiomyopathy. The same liver, the same vasodilation, and a
  // heart that cannot answer it.
  const base = { structuralResistance: 10, splanchnicVasodilation: 0.9 };
  const reserves = [1, 0.75, 0.5, 0.25, 0].map((cardiacReserve) =>
    solveHepatorenal({ ...base, cardiacReserve })
  );
  assert.ok(strictlyFalling(reserves.map((s) => s.systemic.meanArterialPressureMmHg)));
  assert.ok(strictlyRising(reserves.map((s) => s.neurohumoral.activation)));
  assert.ok(strictlyFalling(reserves.map((s) => s.kidney.glomerularFiltrationRateMlPerMin)));
});
