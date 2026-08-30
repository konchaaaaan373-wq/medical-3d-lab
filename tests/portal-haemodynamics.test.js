import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HAEMODYNAMIC_PATTERNS,
  HEPATIC_VEIN_PRESSURE,
  HVPG_THRESHOLDS,
  VARICEAL_CONTEXT,
  clinicalThresholdReading,
  establishedCollateralFraction,
  progressionCurve,
  solvePortalCirculation,
  vascularResistances,
} from '../src/models/portalHypertension.js';

/**
 * **Layer 2: what the hepatology literature requires of this model.**
 *
 * The companion file to `tests/respiratory-physiology.test.js`, and it exists
 * for the same reason: the rest of the suite checks that the scene agrees with
 * its own model, which is necessary and is not evidence that either is right.
 * Nothing here reads a caption, a stored answer or a chart. Each test states a
 * proposition that would still be true if this repository did not exist, and
 * asserts that the model obeys it.
 *
 * Sources are named claim by claim in
 * `docs/model-evidence/cirrhosis-portal-hypertension.md`.
 */

const settled = (controls) => solvePortalCirculation(controls);

// --- 1. Where the pressure comes from -------------------------------------

test('haemodynamics: flow is conserved at the portal vein in every configuration', () => {
  // Not a physiological claim so much as the precondition for making any: if
  // what arrives does not equal what leaves, no pressure the model reports
  // means anything.
  const configurations = [
    {},
    { structuralResistance: 8 },
    { structuralResistance: 8, splanchnicVasodilation: 1 },
    { structuralResistance: 8, splanchnicVasodilation: 1, tips: 1 },
    { structuralResistance: 8, haemodynamicPattern: 2 },
    { structuralResistance: 12, collateralPropensity: 0, dynamicTone: 1 },
  ];
  for (const controls of configurations) {
    const state = settled(controls);
    const out =
      state.portalLiverFlowMlPerMin + state.collateralFlowMlPerMin + state.tipsFlowMlPerMin;
    assert.ok(
      Math.abs(out - state.splanchnicInflowMlPerMin) < 1e-6,
      `${JSON.stringify(controls)}: ${state.splanchnicInflowMlPerMin} in, ${out} out`
    );
  }
});

test('haemodynamics: raising intrahepatic resistance raises the portal pressure gradient', () => {
  // The initiating mechanism, stated on its own — no splanchnic vasodilation,
  // no collaterals, nothing else moving.
  let previous = null;
  for (const structuralResistance of [1, 2, 4, 6, 8, 10, 12]) {
    const state = settled({ structuralResistance, splanchnicVasodilation: 0, collateralPropensity: 0 });
    if (previous) {
      assert.ok(
        state.portalPressureGradientMmHg > previous.portalPressureGradientMmHg,
        `the gradient fell between ${previous.controls.structuralResistance} and ${structuralResistance}`
      );
    }
    previous = state;
  }
});

test('haemodynamics: increased inflow at a fixed hepatic resistance raises the gradient too', () => {
  // The perpetuating mechanism, isolated: the liver does not change at all,
  // only how much blood arrives at it. Both halves of ΔP = Q·R have to be able
  // to raise ΔP, or the model cannot separate cause from perpetuation.
  const base = settled({ structuralResistance: 6, splanchnicVasodilation: 0 });
  let previous = base;
  for (const splanchnicVasodilation of [0.25, 0.5, 0.75, 1]) {
    const state = settled({ structuralResistance: 6, splanchnicVasodilation });
    assert.equal(
      state.resistances.intrahepatic,
      base.resistances.intrahepatic,
      'the liver must not change when only the splanchnic bed does'
    );
    assert.ok(
      state.splanchnicInflowMlPerMin > previous.splanchnicInflowMlPerMin,
      'inflow has to rise as the splanchnic bed dilates'
    );
    assert.ok(
      state.portalPressureGradientMmHg > previous.portalPressureGradientMmHg,
      'and the gradient has to rise with it'
    );
    previous = state;
  }
});

test('haemodynamics: the two mechanisms act by different routes', () => {
  // What makes them two mechanisms rather than one applied twice. More
  // resistance impedes inflow; more vasodilation increases it. A model where
  // both moved the flow the same way would be describing one thing.
  const base = settled({ structuralResistance: 6, splanchnicVasodilation: 0 });
  const moreResistance = settled({ structuralResistance: 10, splanchnicVasodilation: 0 });
  const moreInflow = settled({ structuralResistance: 6, splanchnicVasodilation: 1 });

  assert.ok(moreResistance.portalPressureGradientMmHg > base.portalPressureGradientMmHg);
  assert.ok(moreInflow.portalPressureGradientMmHg > base.portalPressureGradientMmHg);
  assert.ok(moreResistance.splanchnicInflowMlPerMin < base.splanchnicInflowMlPerMin, 'resistance impedes inflow');
  assert.ok(moreInflow.splanchnicInflowMlPerMin > base.splanchnicInflowMlPerMin, 'vasodilation increases it');
});

test('haemodynamics: hepatic portal perfusion falls as the liver scars', () => {
  // The clinical direction, and the one the scene's main axis has to produce,
  // because it is a headline read-out. A known-wrong direction must never be
  // the number a reader is looking at while dragging the main slider.
  const curve = progressionCurve({ splanchnicVasodilation: 0 });
  for (let i = 1; i < curve.length; i++) {
    assert.ok(
      curve[i].portalLiverFlowMlPerMin < curve[i - 1].portalLiverFlowMlPerMin,
      `portal flow through the liver rose between ${curve[i - 1].structuralResistance} and ${curve[i].structuralResistance}`
    );
  }
  assert.ok(
    curve[curve.length - 1].portalLiverFlowMlPerMin < curve[0].portalLiverFlowMlPerMin * 0.5,
    'and it has to fall substantially over the progression'
  );
});

test('haemodynamics: isolated splanchnic vasodilation raises hepatic portal flow, and that is arithmetic', () => {
  // Documented rather than asserted away. At a *fixed* hepatic resistance a
  // larger gradient drives more flow through it, and there is no version of
  // ΔP = Q·R in which it does not. This is not the same question as the one
  // above, and the two must not be conflated: what makes perfusion fall in a
  // real cirrhotic liver despite the hyperdynamic circulation is progressive
  // obliteration of the intrahepatic bed and collaterals outgrowing the
  // inflow, and neither is in this model.
  const base = settled({ structuralResistance: 5, splanchnicVasodilation: 0 });
  const dilated = settled({ structuralResistance: 5, splanchnicVasodilation: 1 });
  assert.equal(dilated.resistances.intrahepatic, base.resistances.intrahepatic);
  assert.ok(dilated.portalLiverFlowMlPerMin > base.portalLiverFlowMlPerMin);
});

// --- 2. Collaterals -------------------------------------------------------

test('haemodynamics: collaterals redistribute a great deal of flow and leave the gradient abnormal', () => {
  const closed = settled({ structuralResistance: 10, splanchnicVasodilation: 1, collateralPropensity: 0 });
  const open = settled({ structuralResistance: 10, splanchnicVasodilation: 1, collateralPropensity: 1 });

  assert.ok(open.shuntFraction > 0.4, 'a large share of the portal flow has to be diverted');
  assert.ok(open.portalPressureGradientMmHg < closed.portalPressureGradientMmHg, 'the pressure does come down');
  assert.ok(
    open.portalPressureGradientMmHg > HVPG_THRESHOLDS.clinicallySignificantMmHg,
    'and it has to stay clearly abnormal'
  );
});

test('haemodynamics: the reason the pressure stays up is that nothing generating it has moved', () => {
  // The correct explanation, made checkable. It is not that collaterals are
  // narrow — some spontaneous shunts are very wide. It is that a bypass leaves
  // the intrahepatic resistance and the splanchnic inflow exactly as they were.
  const closed = settled({ structuralResistance: 10, splanchnicVasodilation: 1, collateralPropensity: 0 });
  const open = settled({ structuralResistance: 10, splanchnicVasodilation: 1, collateralPropensity: 1 });
  assert.equal(open.resistances.intrahepatic, closed.resistances.intrahepatic);
  assert.ok(open.splanchnicInflowMlPerMin > closed.splanchnicInflowMlPerMin, 'and the inflow is if anything higher');

  // And the demonstration: give the collateral bed far more conductance than a
  // real network has, and the gradient still does not come back to normal,
  // because the two mechanisms behind it are untouched.
  const healthy = settled({});
  assert.ok(
    open.portalPressureGradientMmHg > healthy.portalPressureGradientMmHg * 3,
    'even fully established collaterals leave the system far from normal'
  );
});

test('haemodynamics: ten mmHg is not coded as a law that opens collaterals', () => {
  // The mapping from gradient to established collateral conductance is smooth
  // and monotonic with no step anywhere. A real collateral network is the
  // result of dilatation, remodelling and angiogenesis over months to years,
  // and 10 mmHg is a clinical threshold for significance rather than a
  // pressure at which something opens.
  let previous = 0;
  for (let gradient = 0; gradient <= 40; gradient += 0.25) {
    const value = establishedCollateralFraction(gradient, 1);
    assert.ok(value >= previous - 1e-12, 'the mapping has to be monotonic');
    assert.ok(value - previous < 0.1, `a jump of ${value - previous} at ${gradient} mmHg is a switch, not a process`);
    previous = value;
  }
  // Non-zero below the threshold and short of complete above it: a threshold
  // law would be zero on one side and one on the other.
  assert.ok(establishedCollateralFraction(9.5, 1) > 0.4, 'not zero just below ten');
  assert.ok(establishedCollateralFraction(10.5, 1) < 0.7, 'and not complete just above it');
});

// --- 3. What HVPG measures ------------------------------------------------

test('haemodynamics: HVPG tracks the sinusoidal component and not the presinusoidal one', () => {
  // WHVP approximates sinusoidal pressure in sinusoidal portal hypertension,
  // and HVPG = WHVP − FHVP. So HVPG reflects the part of the gradient lying
  // across the sinusoids, and misses whatever lies upstream of them. Same total
  // resistance in both configurations; only its position differs.
  const sinusoidal = settled({ structuralResistance: 10, splanchnicVasodilation: 1, haemodynamicPattern: 0 });
  const presinusoidal = settled({ structuralResistance: 10, splanchnicVasodilation: 1, haemodynamicPattern: 2 });

  assert.ok(
    Math.abs(sinusoidal.resistances.intrahepatic - presinusoidal.resistances.intrahepatic) < 1e-12,
    'the liver is equally obstructed in both'
  );
  assert.ok(
    Math.abs(sinusoidal.portalPressureGradientMmHg - presinusoidal.portalPressureGradientMmHg) < 1e-6,
    'so the portal pressure gradient must be the same'
  );
  assert.ok(
    sinusoidal.gradientMissedByHvpgMmHg < 0.5,
    'HVPG has to track the gradient closely when the resistance is sinusoidal'
  );
  assert.ok(
    presinusoidal.hepaticVenousPressureGradientMmHg < sinusoidal.hepaticVenousPressureGradientMmHg * 0.2,
    'and has to under-read badly when it is not'
  );
});

test('haemodynamics: the presinusoidal drop sits upstream of the sinusoid in the pressure profile', () => {
  // Stated on the pressure profile rather than on the summary numbers, because
  // the profile is what the chart draws and a reader will read the mechanism
  // off it. Portal → sinusoid → hepatic vein, with the loss where the
  // resistance is.
  const dropAcross = (state) => {
    const [portal, sinusoid, hepatic] = state.pressureProfile;
    return {
      presinusoidal: portal.pressureMmHg - sinusoid.pressureMmHg,
      sinusoidal: sinusoid.pressureMmHg - hepatic.pressureMmHg,
    };
  };
  const sinusoidal = dropAcross(settled({ structuralResistance: 10, haemodynamicPattern: 0 }));
  const presinusoidal = dropAcross(settled({ structuralResistance: 10, haemodynamicPattern: 2 }));
  assert.ok(sinusoidal.sinusoidal > sinusoidal.presinusoidal * 10, 'sinusoidal disease loses it at the sinusoid');
  assert.ok(presinusoidal.presinusoidal > presinusoidal.sinusoidal * 5, 'presinusoidal disease loses it before');
});

test('haemodynamics: the thresholds are Baveno VII’s, read on HVPG, and 12 mmHg is not among them', () => {
  // >5 mmHg is portal hypertension; ≥10 mmHg is clinically significant portal
  // hypertension. 12 mmHg belongs to the classic association with variceal
  // bleeding and to the post-TIPS haemodynamic target, and to nothing else —
  // so it must not appear as a band boundary.
  assert.equal(HVPG_THRESHOLDS.portalHypertensionMmHg, 5);
  assert.equal(HVPG_THRESHOLDS.clinicallySignificantMmHg, 10);
  assert.equal(VARICEAL_CONTEXT.gradientMmHg, 12);
  assert.match(VARICEAL_CONTEXT.note, /variceal bleeding/i);
  assert.match(VARICEAL_CONTEXT.note, /not a general/i);

  // The thresholds are read on HVPG, never on the model's own gradient, and
  // the two are different numbers in the case that matters.
  const state = settled({ structuralResistance: 10, splanchnicVasodilation: 1, haemodynamicPattern: 2 });
  const reading = clinicalThresholdReading(state);
  assert.equal(reading.hvpgMmHg, state.hepaticVenousPressureGradientMmHg);
  assert.notEqual(reading.hvpgMmHg, state.portalPressureGradientMmHg);
});

test('haemodynamics: the thresholds are withheld outside sinusoidal portal hypertension', () => {
  // Baveno VII's own caution. Applicability is a property of the declared
  // haemodynamic pattern, which is a named state — not of a numerical
  // comparison against a share, which would put an invented cut-off on screen
  // dressed as a medical criterion.
  for (const pattern of HAEMODYNAMIC_PATTERNS) {
    const index = HAEMODYNAMIC_PATTERNS.indexOf(pattern);
    const reading = clinicalThresholdReading(
      settled({ structuralResistance: 10, splanchnicVasodilation: 1, haemodynamicPattern: index })
    );
    assert.equal(reading.applicable, pattern.thresholdsApply, `${pattern.id} applicability`);
    if (!pattern.thresholdsApply) assert.equal(reading.band, null, `${pattern.id} must produce no band`);
  }
});

test('haemodynamics: presinusoidal intrahepatic and prehepatic are named as different things', () => {
  // They share the measurement consequence and not the anatomy. Portal vein
  // thrombosis is prehepatic — outside the liver — and is not this model's
  // subject; listing it as an example of presinusoidal intrahepatic disease
  // would teach a wrong equivalence.
  const presinusoidal = HAEMODYNAMIC_PATTERNS.find((entry) => entry.id === 'presinusoidal');
  assert.match(presinusoidal.description, /schistosomiasis/i);
  assert.match(presinusoidal.description, /porto-sinusoidal vascular disease/i);
  assert.match(presinusoidal.description, /portal vein thrombosis is prehepatic/i);
  assert.match(presinusoidal.description, /not modelled/i);
});

// --- 4. TIPS --------------------------------------------------------------

test('haemodynamics: more shunt conductance lowers the gradient, monotonically', () => {
  let previous = Infinity;
  for (const tips of [0, 0.25, 0.5, 0.75, 1]) {
    const state = settled({ structuralResistance: 10, splanchnicVasodilation: 1, tips });
    assert.ok(state.portalPressureGradientMmHg < previous, `the gradient rose at tips = ${tips}`);
    previous = state.portalPressureGradientMmHg;
  }
});

test('haemodynamics: a fully dilated shunt reaches the post-TIPS target, and costs hepatic perfusion', () => {
  // The target belongs to shunts placed for variceal bleeding, which is the
  // context the scene puts it in. The price is the flow that no longer reaches
  // hepatocytes, and it is reported as a flow rather than as a consequence.
  const before = settled({ structuralResistance: 10, splanchnicVasodilation: 1, tips: 0 });
  const after = settled({ structuralResistance: 10, splanchnicVasodilation: 1, tips: 1 });
  assert.ok(
    after.portalPressureGradientMmHg < VARICEAL_CONTEXT.gradientMmHg,
    `the shunt reached ${after.portalPressureGradientMmHg} mmHg`
  );
  assert.ok(after.portalLiverFlowMlPerMin < before.portalLiverFlowMlPerMin * 0.5, 'and halves hepatic portal flow');
  assert.ok(after.shuntFraction > before.shuntFraction);
});

// --- 5. The healthy anchor ------------------------------------------------

test('haemodynamics: a healthy liver sits where the literature puts it', () => {
  // Normal HVPG is 1–5 mmHg and portal venous flow is of the order of a litre
  // a minute. Both are calibration targets rather than model outputs, and the
  // test exists so that a change made for another reason cannot move them
  // quietly.
  const healthy = settled({});
  assert.ok(
    healthy.hepaticVenousPressureGradientMmHg >= 1 && healthy.hepaticVenousPressureGradientMmHg <= 5,
    `HVPG was ${healthy.hepaticVenousPressureGradientMmHg}`
  );
  assert.ok(
    healthy.portalLiverFlowMlPerMin > 800 && healthy.portalLiverFlowMlPerMin < 1300,
    `portal flow was ${healthy.portalLiverFlowMlPerMin}`
  );
  assert.ok(healthy.shuntFraction < 0.03, 'and almost nothing bypasses the liver');
  assert.equal(clinicalThresholdReading(healthy).band, 'normal');
  assert.equal(healthy.hepaticVeinPressureMmHg, HEPATIC_VEIN_PRESSURE);
});

test('haemodynamics: every pressure drop in the model is a flow times a resistance', () => {
  // The law the whole scene rests on, checked against the numbers it reports
  // rather than against the code that produced them.
  const state = settled({ structuralResistance: 8, splanchnicVasodilation: 0.6, haemodynamicPattern: 1 });
  const perSecond = (mlPerMin) => mlPerMin / 60;
  const resistances = vascularResistances(state.controls);
  const liverFlow = perSecond(state.portalLiverFlowMlPerMin);

  const [portal, sinusoid, hepatic] = state.pressureProfile;
  assert.ok(
    Math.abs(portal.pressureMmHg - sinusoid.pressureMmHg - liverFlow * resistances.presinusoidal) < 1e-9
  );
  assert.ok(
    Math.abs(sinusoid.pressureMmHg - hepatic.pressureMmHg - liverFlow * resistances.sinusoidal) < 1e-9
  );
});
