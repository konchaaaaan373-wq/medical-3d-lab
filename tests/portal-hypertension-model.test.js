import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CONTROLS,
  DYNAMIC_SHARE_AT_FULL_TONE,
  HVPG_THRESHOLDS,
  VARICEAL_CONTEXT,
  HEPATIC_VEIN_PRESSURE,
  MEAN_ARTERIAL_PRESSURE,
  clinicalThresholdReading,
  HAEMODYNAMIC_PATTERNS,
  establishedCollateralFraction,
  progressionCurve,
  solvePortalCirculation,
  vascularResistances,
} from '../src/models/portalHypertension.js';

/**
 * What the portal hypertension model is required to get right.
 *
 * Two of these matter more than the rest. **Flow is conserved** — if it is
 * not, every pressure the model produces is meaningless. And **HVPG is not the
 * portal pressure gradient** — the distinction the whole scene exists to make,
 * written so that it fails if the model ever stops being able to tell them
 * apart.
 */

const HEALTHY = {};
const ADVANCED = { structuralResistance: 10, splanchnicVasodilation: 1 };

// --- the network -----------------------------------------------------------

test('flow is conserved at the portal vein, in every configuration', () => {
  for (const controls of [
    HEALTHY,
    { structuralResistance: 5 },
    ADVANCED,
    { ...ADVANCED, tips: 1 },
    { ...ADVANCED, collateralPropensity: 0 },
    { ...ADVANCED, haemodynamicPattern: 2 },
    { ...ADVANCED, dynamicTone: 1, tips: 0.5, haemodynamicPattern: 2 },
  ]) {
    const state = solvePortalCirculation(controls);
    const out =
      state.portalLiverFlowMlPerMin + state.collateralFlowMlPerMin + state.tipsFlowMlPerMin;
    assert.ok(
      Math.abs(out - state.splanchnicInflowMlPerMin) < 1e-6,
      `${JSON.stringify(controls)}: ${state.splanchnicInflowMlPerMin} in, ${out} out`
    );
    assert.ok(state.converged, 'and the solve settled');
  }
});

test('every pressure drop is a flow times a resistance', () => {
  const state = solvePortalCirculation({ ...ADVANCED, haemodynamicPattern: 2 });
  const flowPerSecond = state.portalLiverFlowMlPerMin / 60;
  const acrossPresinusoidal = state.portalPressureMmHg - state.sinusoidalPressureMmHg;
  const acrossSinusoids = state.sinusoidalPressureMmHg - HEPATIC_VEIN_PRESSURE;
  assert.ok(
    Math.abs(acrossPresinusoidal - flowPerSecond * state.resistances.presinusoidal) < 1e-9,
    'the presinusoidal drop must be Q·R'
  );
  assert.ok(
    Math.abs(acrossSinusoids - flowPerSecond * state.resistances.sinusoidal) < 1e-9,
    'and so must the sinusoidal one'
  );
});

test('pressure falls monotonically from the arteries to the hepatic vein', () => {
  for (const controls of [HEALTHY, ADVANCED, { ...ADVANCED, haemodynamicPattern: 2 }]) {
    const state = solvePortalCirculation(controls);
    assert.ok(MEAN_ARTERIAL_PRESSURE > state.portalPressureMmHg);
    assert.ok(state.portalPressureMmHg >= state.sinusoidalPressureMmHg - 1e-9);
    assert.ok(state.sinusoidalPressureMmHg >= HEPATIC_VEIN_PRESSURE - 1e-9);
    const profile = state.pressureProfile.map((point) => point.pressureMmHg);
    assert.deepEqual(profile, [...profile].sort((a, b) => b - a), 'the drawn profile falls too');
  }
});

// --- the healthy liver -----------------------------------------------------

test('a healthy liver sits where the textbooks put it', () => {
  const state = solvePortalCirculation(HEALTHY);
  // Normal portal pressure gradient is 1–5 mmHg.
  assert.ok(
    state.portalPressureGradientMmHg > 1 && state.portalPressureGradientMmHg < 5,
    `gradient was ${state.portalPressureGradientMmHg}`
  );
  // Portal venous flow is of the order of a litre a minute.
  assert.ok(
    state.portalLiverFlowMlPerMin > 800 && state.portalLiverFlowMlPerMin < 1300,
    `portal flow was ${state.portalLiverFlowMlPerMin} mL/min`
  );
  // And essentially nothing is bypassing the liver.
  assert.ok(state.shuntFraction < 0.03, `${state.shuntFraction} of the flow was already shunting`);
});

// --- HVPG versus the portal pressure gradient ------------------------------

test('in a sinusoidal liver, HVPG is a good measure of the gradient', () => {
  const state = solvePortalCirculation(ADVANCED);
  assert.equal(state.controls.haemodynamicPattern, 0);
  assert.ok(
    state.gradientMissedByHvpgMmHg < 0.5,
    `HVPG missed ${state.gradientMissedByHvpgMmHg} mmHg of a ${state.portalPressureGradientMmHg} mmHg gradient`
  );
});

test('in a presinusoidal liver, HVPG under-reads the gradient badly — and the gradient is unchanged', () => {
  // The single most important thing this model has to be able to show. Moving
  // the resistance upstream does not change how obstructed the liver is, only
  // where; so the portal pressure gradient must be the same and the *measured*
  // one must collapse.
  const sinusoidal = solvePortalCirculation(ADVANCED);
  const presinusoidal = solvePortalCirculation({ ...ADVANCED, haemodynamicPattern: 2 });

  assert.ok(
    Math.abs(presinusoidal.portalPressureGradientMmHg - sinusoidal.portalPressureGradientMmHg) < 0.01,
    'the true gradient must not move when only the site of the resistance does'
  );
  assert.ok(
    presinusoidal.hepaticVenousPressureGradientMmHg < sinusoidal.hepaticVenousPressureGradientMmHg * 0.2,
    `HVPG went ${sinusoidal.hepaticVenousPressureGradientMmHg} → ${presinusoidal.hepaticVenousPressureGradientMmHg}`
  );
  assert.ok(presinusoidal.gradientMissedByHvpgMmHg > 10, 'and the model has to say how much it missed');
});

test('the clinical thresholds are refused outside what they were established in', () => {
  const sinusoidal = clinicalThresholdReading(solvePortalCirculation(ADVANCED));
  assert.equal(sinusoidal.applicable, true);
  assert.equal(sinusoidal.band, 'clinically-significant', 'an HVPG at or above 10 is CSPH');

  // Applicability is decided by the declared haemodynamic pattern — a named
  // state — and not by comparing a continuous parameter against a cut-off.
  assert.equal(sinusoidal.pattern.id, 'sinusoidal');

  for (const index of [1, 2]) {
    const outside = clinicalThresholdReading(
      solvePortalCirculation({ ...ADVANCED, haemodynamicPattern: index })
    );
    assert.equal(outside.applicable, false, `${outside.pattern.id} must not read the thresholds`);
    assert.equal(outside.band, null, 'and a band must not be produced where it would be wrong');
  }
});

test('there is no band boundary at 12 mmHg, because there is no such general threshold', () => {
  // 12 mmHg belongs to the classic HVPG association with variceal bleeding and
  // to the post-TIPS haemodynamic target — not to a staging ladder. A fourth
  // band there would turn it into one.
  const bands = new Set();
  for (let structuralResistance = 1; structuralResistance <= 12; structuralResistance += 0.25) {
    for (const splanchnicVasodilation of [0, 0.5, 1]) {
      const reading = clinicalThresholdReading(
        solvePortalCirculation({ structuralResistance, splanchnicVasodilation })
      );
      if (reading.band) bands.add(reading.band);
    }
  }
  assert.deepEqual(
    [...bands].sort(),
    ['clinically-significant', 'normal', 'portal-hypertension'],
    'three bands, and none of them starts at 12'
  );
  // And the two thresholds the bands are actually built on.
  assert.equal(HVPG_THRESHOLDS.portalHypertensionMmHg, 5);
  assert.equal(HVPG_THRESHOLDS.clinicallySignificantMmHg, 10);
  // 12 exists in the model, and only in its own context.
  assert.equal(VARICEAL_CONTEXT.gradientMmHg, 12);
  assert.match(VARICEAL_CONTEXT.note, /variceal/i);
});

test('the haemodynamic pattern is a named state, and each one says for itself whether the thresholds apply', () => {
  // The point of replacing the old numeric cut-off. Whether the thresholds may
  // be quoted is a question about which disease is being modelled, and each
  // pattern answers it rather than a comparison doing so.
  const ids = HAEMODYNAMIC_PATTERNS.map((pattern) => pattern.id);
  assert.deepEqual(ids, ['sinusoidal', 'mixed', 'presinusoidal']);
  assert.equal(HAEMODYNAMIC_PATTERNS[0].thresholdsApply, true);
  assert.equal(HAEMODYNAMIC_PATTERNS[1].thresholdsApply, false);
  assert.equal(HAEMODYNAMIC_PATTERNS[2].thresholdsApply, false);
  // Portal vein thrombosis is prehepatic, and the presinusoidal pattern has to
  // say so rather than listing it as an example of itself.
  assert.match(HAEMODYNAMIC_PATTERNS[2].description, /prehepatic/i);
  assert.match(HAEMODYNAMIC_PATTERNS[2].description, /schistosomiasis/i);
});

test('the thresholds are read on HVPG, never on the model’s own gradient', () => {
  const state = solvePortalCirculation({ structuralResistance: 6, splanchnicVasodilation: 0.4 });
  const reading = clinicalThresholdReading(state);
  assert.equal(reading.hvpgMmHg, state.hepaticVenousPressureGradientMmHg);
  assert.notEqual(reading.hvpgMmHg, state.portalPressureGradientMmHg);
});

test('a healthy liver reads as normal and a moderately scarred one as clinically significant', () => {
  assert.equal(clinicalThresholdReading(solvePortalCirculation(HEALTHY)).band, 'normal');
  const csph = clinicalThresholdReading(
    solvePortalCirculation({ structuralResistance: 5, splanchnicVasodilation: 0.5 })
  );
  assert.ok(csph.hvpgMmHg >= 10, `HVPG was ${csph.hvpgMmHg}`);
  assert.equal(csph.band, 'clinically-significant');
});

// --- what raises the pressure ----------------------------------------------

test('both halves raise the pressure: more resistance, and more flow arriving', () => {
  const base = solvePortalCirculation({ structuralResistance: 6 });
  const moreResistance = solvePortalCirculation({ structuralResistance: 9 });
  const moreFlow = solvePortalCirculation({ structuralResistance: 6, splanchnicVasodilation: 1 });

  assert.ok(moreResistance.portalPressureGradientMmHg > base.portalPressureGradientMmHg);
  assert.ok(moreFlow.portalPressureGradientMmHg > base.portalPressureGradientMmHg);
  // And the second one is a rise in *inflow*, which is what makes it a
  // different mechanism rather than the same one twice.
  assert.ok(moreFlow.splanchnicInflowMlPerMin > base.splanchnicInflowMlPerMin * 1.2);
  assert.ok(moreResistance.splanchnicInflowMlPerMin < base.splanchnicInflowMlPerMin);
});

test('the dynamic component is a share of what the structure already costs', () => {
  const structural = vascularResistances({ structuralResistance: 8, dynamicTone: 0 });
  const withTone = vascularResistances({ structuralResistance: 8, dynamicTone: 1 });
  assert.ok(
    Math.abs(withTone.intrahepatic / structural.intrahepatic - (1 + DYNAMIC_SHARE_AT_FULL_TONE)) < 1e-9
  );
  // Which is why it is worth more in a badly scarred liver than in a good one.
  const healthyGain =
    vascularResistances({ structuralResistance: 1, dynamicTone: 1 }).intrahepatic -
    vascularResistances({ structuralResistance: 1, dynamicTone: 0 }).intrahepatic;
  const scarredGain = withTone.intrahepatic - structural.intrahepatic;
  assert.ok(scarredGain > healthyGain * 5);
});

test('moving the resistance upstream does not change how much of it there is', () => {
  const sinusoidal = vascularResistances({ structuralResistance: 8, haemodynamicPattern: 0 });
  const presinusoidal = vascularResistances({ structuralResistance: 8, haemodynamicPattern: 2 });
  assert.ok(Math.abs(sinusoidal.intrahepatic - presinusoidal.intrahepatic) < 1e-12);
  assert.ok(presinusoidal.presinusoidal > sinusoidal.presinusoidal);
  assert.ok(presinusoidal.sinusoidal < sinusoidal.sinusoidal);
});

// --- collaterals -----------------------------------------------------------

test('collateral conductance is established around the clinically significant gradient, not below it', () => {
  // An equilibrium mapping, not a valve: it says how much collateral
  // conductance a liver that has sat at this gradient has typically ended up
  // with. Nothing here opens instantaneously and nothing is triggered by a
  // pressure crossing a line — see the function's own note.
  assert.ok(establishedCollateralFraction(3, 1) < 0.05, 'a healthy gradient establishes nothing');
  assert.ok(
    establishedCollateralFraction(10, 1) > 0.4 && establishedCollateralFraction(10, 1) < 0.6,
    'half established around the clinically significant gradient'
  );
  assert.ok(establishedCollateralFraction(18, 1) > 0.9, 'and fully established well above it');
  assert.equal(establishedCollateralFraction(18, 0), 0, 'propensity zero means no collaterals at any pressure');
  // Smooth rather than switched, at every scale. A step would be a valve.
  for (let gradient = 0; gradient < 30; gradient += 0.5) {
    const step = establishedCollateralFraction(gradient + 0.5, 1) - establishedCollateralFraction(gradient, 1);
    assert.ok(step >= 0 && step < 0.25, `a jump of ${step} at ${gradient} mmHg would read as a valve opening`);
  }
});

test('collaterals carry a great deal of flow and still do not decompress the portal vein', () => {
  // The result worth having: they roughly halve the pressure and leave it far
  // above normal. A model in which they normalised it would be teaching the
  // opposite of what happens.
  const without = solvePortalCirculation({ ...ADVANCED, collateralPropensity: 0 });
  const with_ = solvePortalCirculation(ADVANCED);

  assert.ok(with_.shuntFraction > 0.4, `only ${with_.shuntFraction} of the flow was diverted`);
  assert.ok(
    with_.portalPressureGradientMmHg < without.portalPressureGradientMmHg * 0.7,
    'they have to take a real bite out of the pressure'
  );
  assert.ok(
    with_.portalPressureGradientMmHg > 12,
    `and leave it clearly abnormal: it was ${with_.portalPressureGradientMmHg}`
  );
});

test('a shunt does what collaterals cannot, and the price is in the flows', () => {
  const before = solvePortalCirculation(ADVANCED);
  const after = solvePortalCirculation({ ...ADVANCED, tips: 1 });
  assert.ok(after.portalPressureGradientMmHg < 12, `TIPS has to get below 12: ${after.portalPressureGradientMmHg}`);
  assert.ok(after.portalPressureGradientMmHg < before.portalPressureGradientMmHg * 0.5);
  // And most of the portal blood now reaches the systemic circulation without
  // passing through liver tissue.
  assert.ok(after.shuntFraction > before.shuntFraction);
  assert.ok(
    after.portalLiverFlowMlPerMin < before.portalLiverFlowMlPerMin * 0.5,
    `hepatic perfusion went ${before.portalLiverFlowMlPerMin} → ${after.portalLiverFlowMlPerMin} mL/min`
  );
});

// --- the progression -------------------------------------------------------

test('the gradient rises monotonically with the structural resistance', () => {
  const curve = progressionCurve({});
  for (let i = 1; i < curve.length; i++) {
    assert.ok(
      curve[i].portalPressureGradientMmHg > curve[i - 1].portalPressureGradientMmHg,
      `the gradient fell between ${curve[i - 1].structuralResistance} and ${curve[i].structuralResistance}`
    );
  }
  assert.ok(curve[0].portalPressureGradientMmHg < 5, 'it starts in the normal range');
  assert.ok(curve[curve.length - 1].portalPressureGradientMmHg > 12, 'and ends well past the thresholds');
});

test('hepatic perfusion falls as the shunt fraction rises, all along the progression', () => {
  const curve = progressionCurve({ splanchnicVasodilation: 0.5 });
  for (let i = 1; i < curve.length; i++) {
    assert.ok(curve[i].shuntFraction >= curve[i - 1].shuntFraction - 1e-9, 'shunting only ever grows');
  }
  assert.ok(
    curve[curve.length - 1].portalLiverFlowMlPerMin < curve[0].portalLiverFlowMlPerMin * 0.8,
    'and the liver ends up seeing less portal blood than it started with'
  );
});

test('the two gradients diverge along the progression only when the disease is presinusoidal', () => {
  const sinusoidal = progressionCurve({ haemodynamicPattern: 0 });
  const presinusoidal = progressionCurve({ haemodynamicPattern: 2 });
  const gap = (point) => point.portalPressureGradientMmHg - point.hepaticVenousPressureGradientMmHg;
  assert.ok(Math.max(...sinusoidal.map(gap)) < 0.5, 'they stay together in sinusoidal disease');
  assert.ok(Math.max(...presinusoidal.map(gap)) > 8, 'and separate in presinusoidal disease');
});

// --- hygiene ---------------------------------------------------------------

test('the model produces nothing about ascites, bleeding, encephalopathy or a score', () => {
  // Every one of these is something the model would be inventing: none of them
  // follows from a pressure and a flow alone.
  const state = solvePortalCirculation(ADVANCED);
  const forbidden = /(ascites|varice|bleed|encephalopath|child|meld|albumin|sodium|survival|mortality)/i;
  for (const key of Object.keys(state)) {
    assert.ok(!forbidden.test(key), `the portal model must not report "${key}"`);
  }
});

test('the model is deterministic', () => {
  assert.deepEqual(
    solvePortalCirculation({ ...ADVANCED, tips: 0.4 }),
    solvePortalCirculation({ ...ADVANCED, tips: 0.4 })
  );
});

test('the defaults are a healthy liver', () => {
  assert.equal(DEFAULT_CONTROLS.structuralResistance, 1);
  assert.equal(DEFAULT_CONTROLS.tips, 0);
  assert.equal(DEFAULT_CONTROLS.haemodynamicPattern, 0, 'and a sinusoidal one, where HVPG means what it usually means');
});
