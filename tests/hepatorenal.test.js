import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CENTRAL_VENOUS_PRESSURE,
  DEFAULT_CONTROLS,
  kidneyWithoutTheSignal,
  solveHepatorenal,
  solveKidney,
} from '../src/models/hepatorenal.js';
import {
  MEAN_ARTERIAL_PRESSURE,
  solvePortalCirculation,
} from '../src/models/portalHypertension.js';

/**
 * Layer 2 — model integrity for the hepatorenal model.
 *
 * Nothing here is a claim about physiology. These check that the thing solves,
 * that it conserves what it says it conserves, that it gives the same answer
 * twice, and that composing it with the portal model did not change what that
 * model does on its own. A failure here means the implementation is broken, not
 * that the medicine is wrong.
 */

const GRID = [];
for (const structuralResistance of [1, 4, 8, 12]) {
  for (const splanchnicVasodilation of [0, 0.5, 1]) {
    for (const terlipressin of [0, 0.6]) {
      for (const cardiacReserve of [1, 0.4]) {
        GRID.push({ structuralResistance, splanchnicVasodilation, terlipressin, cardiacReserve });
      }
    }
  }
}

test('integrity: every reported flow equals the drop across its own path', () => {
  // ΔP = Q·R, on each of the three paths the model names: the glomerular
  // arterioles either side of the capillary, and the systemic circulation as a
  // whole. If a flow and a resistance in the read-out do not multiply back to
  // the pressure beside them, the panel is showing three unrelated numbers.
  for (const controls of GRID) {
    const state = solveHepatorenal(controls);
    const { kidney, systemic } = state;
    const label = JSON.stringify(controls);

    const renalFlow = kidney.renalBloodFlowMlPerMin / 60;
    assert.ok(
      Math.abs(
        systemic.meanArterialPressureMmHg -
          kidney.glomerularPressureMmHg -
          renalFlow * kidney.afferentResistance
      ) < 1e-9,
      `${label}: the afferent drop does not match the flow through it`
    );
    assert.ok(
      Math.abs(
        kidney.glomerularPressureMmHg -
          CENTRAL_VENOUS_PRESSURE -
          renalFlow * kidney.efferentResistance
      ) < 1e-9,
      `${label}: the efferent drop does not match the flow through it`
    );

    const output = systemic.cardiacOutputMlPerMin / 60;
    assert.ok(
      Math.abs(
        systemic.meanArterialPressureMmHg -
          CENTRAL_VENOUS_PRESSURE -
          output * systemic.systemicVascularResistance
      ) < 1e-6,
      `${label}: cardiac output times systemic resistance is not the arterial pressure`
    );

    // The splanchnic circulation is a share of that output and cannot be more
    // than all of it.
    assert.ok(systemic.splanchnicShareOfOutput > 0 && systemic.splanchnicShareOfOutput < 1, label);
  }
});

test('the coupled solve converges everywhere it is offered', () => {
  for (const controls of GRID) {
    const state = solveHepatorenal(controls);
    assert.ok(state.converged, `did not converge: ${JSON.stringify(controls)}`);
  }
});

test('every reported quantity is finite and non-negative where it has to be', () => {
  const walk = (value, path) => {
    if (typeof value === 'number') {
      assert.ok(Number.isFinite(value), `${path} is ${value}`);
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, inner] of Object.entries(value)) walk(inner, `${path}.${key}`);
    }
  };
  for (const controls of GRID) {
    const state = solveHepatorenal(controls);
    walk(state, 'state');
    assert.ok(state.kidney.glomerularFiltrationRateMlPerMin >= 0);
    assert.ok(state.kidney.renalBloodFlowMlPerMin > 0);
    assert.ok(state.systemic.meanArterialPressureMmHg > CENTRAL_VENOUS_PRESSURE);
  }
});

test('the same controls give the same answer twice', () => {
  // Deterministic, and with no state carried between calls: a scene that
  // rebuilds its read-out on every frame must not drift.
  for (const controls of GRID) {
    assert.deepEqual(solveHepatorenal(controls), solveHepatorenal({ ...controls }));
  }
});

test('the kidney depends on nothing but its two arguments', () => {
  // The structural claim, checked as a property of the function rather than of
  // any particular solved state: identical inputs, identical kidney, whatever
  // was happening in the liver that produced them.
  const a = solveKidney({ meanArterialPressureMmHg: 80, activation: 0.6 });
  const b = solveKidney({ meanArterialPressureMmHg: 80, activation: 0.6, prostaglandinInhibition: 0 });
  assert.deepEqual(a, b);
});

test('composing the portal model did not change what it does on its own', () => {
  // The arterial pressure became a control of the portal model so that this
  // one could hand it a solved value. Left alone it has to behave exactly as
  // it did before.
  for (const structuralResistance of [1, 4, 8, 12]) {
    for (const splanchnicVasodilation of [0, 0.5, 1]) {
      const controls = { structuralResistance, splanchnicVasodilation };
      assert.deepEqual(
        solvePortalCirculation(controls),
        solvePortalCirculation({ ...controls, meanArterialPressureMmHg: MEAN_ARTERIAL_PRESSURE })
      );
    }
  }
});

test('the default controls are a healthy person', () => {
  assert.equal(DEFAULT_CONTROLS.structuralResistance, 1);
  assert.equal(DEFAULT_CONTROLS.splanchnicVasodilation, 0);
  const healthy = solveHepatorenal();
  assert.equal(healthy.neurohumoral.activation, 0);
  assert.ok(healthy.kidney.autoregulating);
});

// ---------------------------------------------------------------------------
// Counterfactual and control semantics
//
// Everything below used to sit in the external layer, where a failure would
// have licensed the sentence "the model has broken a constraint the physiology
// imposes". None of it is physiology: it is what this repository's own
// constructions are wired to do. A failure here means a control has started
// reaching somewhere it should not.
// ---------------------------------------------------------------------------

test('integrity: the counterfactual changes the activation and nothing else', () => {
  // `kidneyWithoutTheSignal` is this repository's construction, not an
  // experiment anybody ran. What it is *for* is measuring the circulation's
  // share, and that only means anything if it holds the arterial pressure
  // fixed and varies the signal alone.
  for (const controls of GRID) {
    const state = solveHepatorenal(controls);
    const released = kidneyWithoutTheSignal(state);
    assert.deepEqual(
      released,
      solveKidney({
        meanArterialPressureMmHg: state.systemic.meanArterialPressureMmHg,
        activation: 0,
        prostaglandinInhibition: state.controls.prostaglandinInhibition,
      }),
      `${JSON.stringify(controls)}: the counterfactual changed something other than the activation`
    );
  }

  // And the kidney solver takes no argument that identifies the liver: two
  // very different livers that happen to produce the same pressure and signal
  // have to produce the same kidney.
  const a = solveKidney({ meanArterialPressureMmHg: 80, activation: 0.6 });
  const b = solveKidney({ meanArterialPressureMmHg: 80, activation: 0.6, prostaglandinInhibition: 0 });
  assert.deepEqual(a, b);
});

test('integrity: prostaglandin inhibition acts only on the kidney', () => {
  // A deliberate isolation, so that the kidney's local protective mechanism
  // can be examined on its own — and **not** a claim that real non-steroidal
  // anti-inflammatory drugs have no systemic effects. They do.
  const advanced = { structuralResistance: 10, splanchnicVasodilation: 0.9 };
  const before = solveHepatorenal(advanced);
  const after = solveHepatorenal({ ...advanced, prostaglandinInhibition: 1 });

  assert.deepEqual(after.systemic, before.systemic);
  assert.deepEqual(after.neurohumoral, before.neurohumoral);
  assert.deepEqual(after.portal, before.portal);
  assert.notDeepEqual(after.kidney, before.kidney);
});

test('integrity: the treatment control acts through the circulation rather than editing the kidney', () => {
  // Neither treatment writes a renal resistance, a filtration coefficient or a
  // filtration rate. They reach the kidney only through the arterial pressure
  // and the activation index, and the solved kidney has to be reproducible
  // from those two alone.
  const advanced = { structuralResistance: 10, splanchnicVasodilation: 0.9 };
  for (const treatment of [
    {},
    { terlipressin: 0.4 },
    { terlipressin: 0.8 },
    { albumin: 0.6 },
    { terlipressin: 0.5, albumin: 0.5 },
  ]) {
    const state = solveHepatorenal({ ...advanced, ...treatment });
    assert.deepEqual(
      state.kidney,
      solveKidney({
        meanArterialPressureMmHg: state.systemic.meanArterialPressureMmHg,
        activation: state.neurohumoral.activation,
        prostaglandinInhibition: 0,
      }),
      `${JSON.stringify(treatment)}: something reached the kidney other than the pressure and the signal`
    );
  }
});

test('integrity: no reported quantity names an injury, and none can be given one', () => {
  // There is no structural injury variable, and there is no control that
  // introduces one. The medical statement — that real HRS-AKI may coexist with
  // tubular injury, proteinuria or pre-existing CKD — rests on the 2024
  // consensus and needs no test; what needs one is that this model's silence
  // is a boundary rather than something a reader could mistake for a finding.
  const reported = JSON.stringify(solveHepatorenal({ structuralResistance: 12, splanchnicVasodilation: 1 }));
  for (const absent of ['injury', 'necrosis', 'proteinuria', 'damage', 'creatinine']) {
    assert.ok(!reported.toLowerCase().includes(absent), `the model reports "${absent}"`);
  }
  for (const control of Object.keys(DEFAULT_CONTROLS)) {
    assert.ok(
      !/injur|necros|damage|nephrotox/i.test(control),
      `${control} sounds like a structural injury term`
    );
  }
});
