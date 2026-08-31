import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOWMAN_PRESSURE,
  CENTRAL_VENOUS_PRESSURE,
  PLASMA_ONCOTIC_PRESSURE,
  solveHepatorenal,
  solveKidney,
  vasoconstrictorActivation,
} from '../src/models/hepatorenal.js';

/**
 * Layer 1 — external physiology invariants for the hepatorenal model.
 *
 * Every test here has to survive one question:
 *
 * > **If this assertion failed, could I honestly say the medicine was wrong?**
 *
 * If the answer is no, it does not belong in this file. That is a stricter bar
 * than "contains no repository constant as a literal", and an audit of this
 * file found several tests that cleared the literal bar and failed the real
 * one. What they were really asserting was one of three other things:
 *
 * - **a property of this repository's own construction** — that
 *   `kidneyWithoutTheSignal` changes only the activation, that the
 *   prostaglandin control has no systemic action, that the treatment reaches
 *   the kidney only through the pressure and the signal, that the scope panel
 *   states the model's boundary. Those are contracts, and they are in
 *   `hepatorenal.test.js` and `hepatorenal-scene.test.js`;
 * - **a property of a chosen path through parameter space** — "at every
 *   severity", monotonicity along the progression axis, where the knee falls.
 *   Those are in `calibration.test.js`;
 * - **a statement about what this model *can* do** — "the model can reach
 *   renal failure with a falling cardiac output". A capability of a
 *   parameterisation is not a fact about people. Also calibration.
 *
 * So the assertions below are local, directional and scale-free: physics,
 * definitions, and mechanisms whose *direction* named sources support. Where a
 * mechanism is exercised through the model, it is perturbed one variable at a
 * time rather than walked along the scene's own axis.
 */

const strictlyRising = (values) => values.every((v, i) => i === 0 || v > values[i - 1]);
const strictlyFalling = (values) => values.every((v, i) => i === 0 || v < values[i - 1]);

// --- physics and definitions ----------------------------------------------

test('physiology: glomerular filtration follows the net filtration pressure', () => {
  // Ultrafiltration, not secretion: what is filtered is the net Starling
  // pressure times a coefficient, and when the net pressure reaches zero
  // filtration stops however much blood is arriving.
  for (const [meanArterialPressureMmHg, activation] of [
    [90, 0],
    [80, 0.4],
    [70, 0.8],
  ]) {
    const kidney = solveKidney({ meanArterialPressureMmHg, activation });
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

test('physiology: with the other beds held fixed, opening one of them lowers total resistance', () => {
  // Conductances in parallel add. **Holding the others constant** is the whole
  // of the law, and an earlier version of this test dropped that qualifier and
  // asserted the fall through the full coupled model instead — where the other
  // beds are actively constricting and the outcome depends on a gain this
  // repository chose. That belongs in the calibration layer and is there now.
  const others = 0.775;
  const totals = [0.19, 0.24, 0.3, 0.38].map((splanchnic) => 1 / (splanchnic + others));
  assert.ok(strictlyFalling(totals), `resistance did not fall: ${totals}`);

  // And the converse, which is why the qualifier matters: if the other beds
  // constrict hard enough, total conductance falls and total resistance rises
  // even though one bed has opened.
  const opened = 1 / (0.38 + others / 2.2);
  assert.ok(
    opened > 1 / (0.19 + others),
    'a bed opening cannot be assumed to lower total resistance when the others are free to close'
  );
});

test('physiology: a fall in resistance the heart does not fully offset lowers pressure', () => {
  // Pressure is output times resistance. If resistance falls by a factor and
  // the heart does not raise output by its reciprocal, pressure falls. Pure
  // arithmetic, asserted without the model: whether *this* model's axis
  // exercises it at every step is a chosen path and is checked in the
  // calibration layer.
  const pressure = (output, resistance) => CENTRAL_VENOUS_PRESSURE + output * resistance;
  const baseline = pressure(1, 1);

  for (const [resistance, output] of [
    [0.9, 1.05],
    [0.8, 1.1],
    [0.7, 1.2],
  ]) {
    assert.ok(output < 1 / resistance, 'this row is meant to be an incomplete offset');
    assert.ok(
      pressure(output, resistance) < baseline,
      `incomplete compensation did not lower the pressure at ${resistance}`
    );
  }

  // A complete offset holds it, and an over-compensation raises it — so the
  // test is about incompleteness rather than about falling resistance.
  assert.ok(Math.abs(pressure(1 / 0.8, 0.8) - baseline) < 1e-12);
  assert.ok(pressure(1.4, 0.8) > baseline);
});

// --- the vasoconstrictor response ------------------------------------------

test('physiology: a greater arterial pressure deficit produces greater vasoconstrictor activation', () => {
  // The direction the peripheral arterial vasodilation account requires:
  // baroreceptor unloading activates the vasoconstrictor systems, and more
  // unloading activates them more.
  //
  // Perturbed locally, on the activation function itself. An earlier version
  // walked the scene's own severity axis and asserted strict monotonicity
  // along it, which is a property of a path this repository chose rather than
  // of cirrhosis.
  const pressures = [90, 85, 80, 75, 70, 60];
  const responses = pressures.map((p) => vasoconstrictorActivation(p));

  assert.ok(strictlyRising(responses.map((r) => r.pressureDeficit)), 'the deficit has to rise');
  assert.ok(strictlyRising(responses.map((r) => r.activation)), 'and the activation with it');
  assert.equal(responses[0].activation, 0, 'no deficit, no activation');
  assert.ok(responses.at(-1).activation < 1, 'the index is bounded');
});

test('physiology: raising vasoconstrictor tone lowers renal perfusion', () => {
  // The mechanism the syndrome's reversible component rests on. Asserted
  // directly on the kidney at a fixed arterial pressure, so it is the tone
  // that is being varied and nothing else.
  //
  // An earlier version asserted this through `kidneyWithoutTheSignal` at every
  // step of the scene's severity axis. That counterfactual is this
  // repository's own construction and "at every severity" is a claim about a
  // chosen path — both have moved, to the integrity and calibration layers.
  for (const meanArterialPressureMmHg of [90, 82, 74]) {
    const flows = [0, 0.25, 0.5, 0.75, 1].map(
      (activation) => solveKidney({ meanArterialPressureMmHg, activation }).renalBloodFlowMlPerMin
    );
    assert.ok(strictlyFalling(flows), `perfusion did not fall with tone at ${meanArterialPressureMmHg}: ${flows}`);
  }
});

test('physiology: efferent-predominant constriction defends filtration and raises the filtration fraction', () => {
  // While the afferent arteriole is still free to autoregulate, the efferent
  // one is already constricting. Renal blood flow falls; filtration does not
  // fall with it, and the fraction of plasma filtered rises. That dissociation
  // is what a single renal resistance cannot produce.
  //
  // The sample is chosen by the model's own report of whether the afferent
  // arteriole still has room, rather than by a hard-coded activation range, so
  // the test follows the phase rather than a number.
  const early = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4]
    .map((activation) => solveKidney({ meanArterialPressureMmHg: 88, activation }))
    .filter((kidney) => kidney.autoregulating);

  assert.ok(early.length >= 4, 'no defended phase to test');
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

// --- renal autoregulation ---------------------------------------------------

test('physiology: renal blood flow is held steady within the autoregulatory range and follows pressure below it', () => {
  // Inside the range the arteriole absorbs the change in driving pressure and
  // flow barely moves. Below it there is nothing left to absorb with, and flow
  // becomes a function of pressure.
  //
  // Which pressures are inside and which are below is taken from the model's
  // own report rather than written down here, so the test states the behaviour
  // of autoregulation and not the width of this model's band.
  const at = (map) => solveKidney({ meanArterialPressureMmHg: map, activation: 0 });
  const sampled = [];
  for (let map = 100; map >= 35; map -= 2.5) sampled.push([map, at(map)]);

  const inside = sampled.filter(([, k]) => k.autoregulatoryReserve > 0.02);
  const below = sampled.filter(([, k]) => k.autoregulatoryReserve < -0.05);
  assert.ok(inside.length >= 3 && below.length >= 3, 'the sweep did not cross the lower limit');

  const spread = (rows) =>
    Math.max(...rows.map(([, k]) => k.renalBloodFlowMlPerMin)) /
    Math.min(...rows.map(([, k]) => k.renalBloodFlowMlPerMin));
  const drive = (rows) =>
    (Math.max(...rows.map(([map]) => map)) - CENTRAL_VENOUS_PRESSURE) /
    (Math.min(...rows.map(([map]) => map)) - CENTRAL_VENOUS_PRESSURE);

  assert.ok(
    spread(inside) < drive(inside),
    'flow inside the range has to vary less than the driving pressure does'
  );
  // With the arteriole pinned, flow is the driving pressure over a fixed
  // resistance: the two spreads coincide.
  assert.ok(
    Math.abs(spread(below) / drive(below) - 1) < 0.02,
    `flow did not follow pressure below the range: ${spread(below) / drive(below)}`
  );
});

test('physiology: vasoconstrictor tone raises the pressure at which autoregulation fails', () => {
  // The mechanism of the syndrome. The kidney does not stop autoregulating
  // because the pressure fell further than usual; it stops because the tone it
  // is working against left it less room to compensate with.
  const lowerLimit = (activation) => {
    for (let map = 220; map > 20; map -= 0.25) {
      if (solveKidney({ meanArterialPressureMmHg: map, activation }).autoregulatoryReserve <= 0) {
        return map;
      }
    }
    return 20;
  };
  const limits = [0, 0.5, 0.75, 1].map(lowerLimit);
  assert.ok(strictlyRising(limits), `the lower limit did not rise with tone: ${limits}`);
});

test('physiology: inhibiting the afferent prostaglandin shield lowers renal perfusion and filtration', () => {
  // Renal prostaglandins help preserve afferent arteriolar vasodilation when
  // effective arterial volume is reduced; inhibiting their synthesis can lower
  // renal perfusion and filtration.
  //
  // Asserted on the kidney, which is where the claim is. That the *model's*
  // control has no systemic action is a deliberate isolation and an integrity
  // claim — not, as an earlier version of this test implied, a property of
  // real non-steroidal anti-inflammatory drugs, which have several.
  const activated = { meanArterialPressureMmHg: 80, activation: 0.7 };
  const shielded = solveKidney(activated);
  const unshielded = solveKidney({ ...activated, prostaglandinInhibition: 1 });

  assert.ok(unshielded.renalBloodFlowMlPerMin < shielded.renalBloodFlowMlPerMin);
  assert.ok(
    unshielded.glomerularFiltrationRateMlPerMin < shielded.glomerularFiltrationRateMlPerMin
  );

  // The shield is against vasoconstrictor tone: with none, there is nothing
  // for its loss to expose.
  const quiet = { meanArterialPressureMmHg: 90, activation: 0 };
  assert.deepEqual(solveKidney({ ...quiet, prostaglandinInhibition: 1 }), solveKidney(quiet));
});

// --- the circulation, and what treating it does ----------------------------

test('physiology: a splanchnic vasoconstrictor can raise arterial pressure and improve filtration', () => {
  // Vasoconstrictor therapy raises arterial pressure, reduces the
  // vasoconstrictor drive and can improve renal function in HRS-AKI.
  //
  // Asserted between an untreated state and a treated one — "can", which is
  // what the literature supports. An earlier version required strict
  // monotonicity across the whole slider, including a strictly falling cardiac
  // output, which is not a clinical invariant; that is now a calibration test.
  const advanced = { structuralResistance: 10, splanchnicVasodilation: 0.9 };
  const untreated = solveHepatorenal(advanced);
  const treated = solveHepatorenal({ ...advanced, terlipressin: 0.7 });

  assert.ok(treated.systemic.meanArterialPressureMmHg > untreated.systemic.meanArterialPressureMmHg);
  assert.ok(treated.neurohumoral.activation < untreated.neurohumoral.activation);
  assert.ok(
    treated.kidney.glomerularFiltrationRateMlPerMin >
      untreated.kidney.glomerularFiltrationRateMlPerMin
  );
  assert.ok(treated.kidney.renalBloodFlowMlPerMin > untreated.kidney.renalBloodFlowMlPerMin);
});

test('physiology: an impaired cardiac response deepens the underfilling and lowers filtration', () => {
  // Cirrhotic cardiomyopathy, and the reason cardiac output need not go on
  // rising as HRS-AKI develops: at its onset, output has been observed to fall
  // (Ruiz-del-Arbol, Hepatology 2005). Asserted between an intact response and
  // an impaired one — the direction is the supported part, and how far this
  // model's control carries it is calibration.
  const advanced = { structuralResistance: 10, splanchnicVasodilation: 0.9 };
  const intact = solveHepatorenal({ ...advanced, cardiacReserve: 1 });
  const impaired = solveHepatorenal({ ...advanced, cardiacReserve: 0 });

  assert.ok(impaired.systemic.cardiacOutputMlPerMin < intact.systemic.cardiacOutputMlPerMin);
  assert.ok(
    impaired.systemic.meanArterialPressureMmHg < intact.systemic.meanArterialPressureMmHg
  );
  assert.ok(impaired.neurohumoral.activation > intact.neurohumoral.activation);
  assert.ok(impaired.kidney.renalBloodFlowMlPerMin < intact.kidney.renalBloodFlowMlPerMin);
  assert.ok(
    impaired.kidney.glomerularFiltrationRateMlPerMin <
      intact.kidney.glomerularFiltrationRateMlPerMin
  );
});
