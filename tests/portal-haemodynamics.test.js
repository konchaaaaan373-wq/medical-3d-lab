import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HAEMODYNAMIC_PATTERNS,
  HVPG_THRESHOLDS,
  VARICEAL_CONTEXT,
  clinicalThresholdReading,
  establishedCollateralFraction,
  progressionCurve,
  solvePortalCirculation,
  vascularResistances,
} from '../src/models/portalHypertension.js';

/**
 * **Layer 1 — external physiology. What the hepatology literature requires.**
 *
 * The companion to `respiratory-physiology.test.js`, held to the same rule and
 * for the same reason. See `LAYER` in `src/models/evidence.js` and
 * `tests/README.md` for the three layers and what a failure in each one means.
 *
 * **No assertion here may depend on a constant this repository invented or
 * calibrated.** The three reference resistances, the collateral and shunt
 * resistances, the width of the collateral sigmoid and the size of the dynamic
 * share are all choices; every one of them is checked in
 * `calibration.test.js`, and none of them may be smuggled in here as a
 * threshold. So this file holds directions, orderings and independence
 * conditions, and no magnitudes.
 *
 * The one number that appears here and is not this repository's is 12 mmHg —
 * because it comes from Baveno VII and from the TIPS literature, and the test
 * that mentions it asserts *where the number belongs* rather than that this
 * model reaches it. Whether this model's fully dilated shunt gets below it is
 * a calibration question and is asked in layer 3.
 *
 * A failure here, and only here, licenses the sentence "the model has broken a
 * constraint the physiology imposes".
 *
 * Sources are named claim by claim in
 * `docs/model-evidence/cirrhosis-portal-hypertension.md`, and the confidence
 * behind each is machine-readable in `src/models/evidence.js`.
 */

const settled = (controls) => solvePortalCirculation(controls);

// --- 1. Where the pressure comes from ---------------------------------
//
// Flow conservation and the ΔP = Q·R identity are properties of the
// implementation rather than findings about people, so they live in the
// integrity layer — `tests/portal-hypertension-model.test.js`. What is here is
// what the pathophysiology requires of a network that already conserves flow.

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
    curve[curve.length - 1].portalLiverFlowMlPerMin < curve[0].portalLiverFlowMlPerMin,
    'and it has to end lower than it started'
  );
  // How far it falls over this particular range is a consequence of the
  // reference resistances, and is checked in `calibration.test.js`.
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

test('haemodynamics: collaterals divert flow and leave the driving pathophysiology in place', () => {
  // Collaterals can decompress the portal system and divert portal blood, and
  // do not eliminate what is sustaining the pressure. The claim has four parts
  // and each one is a direction:
  //
  //   - they carry flow away from the liver,
  //   - the gradient does come down,
  //   - it does not return to a healthy liver's,
  //   - and neither the intrahepatic resistance behind them nor the splanchnic
  //     inflow in front of them is reduced.
  //
  // No magnitude anywhere. How much this model's collaterals decompress and
  // what share of the flow they take are consequences of a chosen resistance,
  // and `calibration.test.js` is where those numbers are held. In particular
  // this test must never be read as saying collaterals are high-resistance:
  // some spontaneous portosystemic shunts are wide and carry very large flows,
  // and those patients still have portal hypertension.
  const cirrhotic = { structuralResistance: 10, splanchnicVasodilation: 1 };
  const closed = settled({ ...cirrhotic, collateralPropensity: 0 });
  const open = settled({ ...cirrhotic, collateralPropensity: 1 });
  const healthy = settled({});

  assert.ok(open.collateralFlowMlPerMin > 0, 'the collaterals have to carry blood');
  assert.ok(open.shuntFraction > closed.shuntFraction, 'and divert it past the liver');
  assert.ok(open.portalPressureGradientMmHg < closed.portalPressureGradientMmHg, 'the pressure does come down');
  assert.ok(
    open.portalPressureGradientMmHg > healthy.portalPressureGradientMmHg,
    'and does not come back to a healthy liver’s gradient'
  );

  // The reason, and the part the review corrected: nothing generating the
  // pressure has moved.
  assert.equal(
    open.resistances.intrahepatic,
    closed.resistances.intrahepatic,
    'the intrahepatic resistance behind the collaterals is untouched'
  );
  assert.ok(
    open.splanchnicInflowMlPerMin >= closed.splanchnicInflowMlPerMin,
    'and the inflow in front of them is not reduced either'
  );
});

test('haemodynamics: ten mmHg is not coded as a law that opens collaterals', () => {
  // The mapping from gradient to established collateral conductance is smooth
  // and monotonic with no step anywhere. A real collateral network is the
  // result of dilatation, remodelling and angiogenesis over months to years,
  // and 10 mmHg is a clinical threshold for significance rather than a
  // pressure at which something opens.
  // A threshold law is zero on one side of the line and one on the other. This
  // must not be that, and the assertions are chosen so that they hold for any
  // sigmoid width — the width itself is invented, and `calibration.test.js`
  // holds it.
  let previous = 0;
  for (let gradient = 0; gradient <= 40; gradient += 0.25) {
    const value = establishedCollateralFraction(gradient, 1);
    assert.ok(value >= previous - 1e-12, 'the mapping has to be monotonic');
    previous = value;
  }
  const threshold = HVPG_THRESHOLDS.clinicallySignificantMmHg;
  assert.ok(establishedCollateralFraction(threshold - 0.5, 1) > 0, 'not zero just below the threshold');
  assert.ok(establishedCollateralFraction(threshold + 0.5, 1) < 1, 'and not complete just above it');
  assert.ok(
    establishedCollateralFraction(threshold + 0.5, 1) > establishedCollateralFraction(threshold - 0.5, 1),
    'it does rise across the threshold — it simply does not switch there'
  );
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
    sinusoidal.gradientMissedByHvpgMmHg < presinusoidal.gradientMissedByHvpgMmHg,
    'HVPG has to track the gradient more closely when the resistance is sinusoidal'
  );
  assert.ok(
    presinusoidal.hepaticVenousPressureGradientMmHg < sinusoidal.hepaticVenousPressureGradientMmHg,
    'and has to under-read when it is not'
  );
  assert.ok(
    presinusoidal.gradientMissedByHvpgMmHg > 0,
    'with a part of the gradient the measurement cannot see at all'
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
  assert.ok(sinusoidal.sinusoidal > sinusoidal.presinusoidal, 'sinusoidal disease loses it at the sinusoid');
  assert.ok(presinusoidal.presinusoidal > presinusoidal.sinusoidal, 'presinusoidal disease loses it before');
  // And the same resistance, moved: the drop the catheter cannot see is larger
  // in the presinusoidal configuration than in the sinusoidal one.
  assert.ok(presinusoidal.presinusoidal > sinusoidal.presinusoidal);
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

test('haemodynamics: more shunt conductance lowers the gradient and diverts blood past the liver', () => {
  // A TIPS is a low-resistance path from the portal vein to a hepatic vein, so
  // opening it further lowers the portosystemic gradient — and the blood that
  // takes it does not perfuse hepatocytes, which is conservation of flow
  // rather than a separate claim.
  //
  // Whether *this* model's fully dilated shunt reaches the 12 mmHg target, and
  // by how much hepatic portal flow falls when it does, are consequences of a
  // chosen shunt resistance. Both are asserted in `calibration.test.js`.
  let previousGradient = Infinity;
  let previousLiverFlow = Infinity;
  for (const tips of [0, 0.25, 0.5, 0.75, 1]) {
    const state = settled({ structuralResistance: 10, splanchnicVasodilation: 1, tips });
    assert.ok(state.portalPressureGradientMmHg < previousGradient, `the gradient rose at tips = ${tips}`);
    assert.ok(state.portalLiverFlowMlPerMin < previousLiverFlow, `hepatic portal flow rose at tips = ${tips}`);
    previousGradient = state.portalPressureGradientMmHg;
    previousLiverFlow = state.portalLiverFlowMlPerMin;
  }
});

test('haemodynamics: twelve mmHg exists only in the variceal and post-TIPS context', () => {
  // Where the number belongs, asserted about the model's own vocabulary rather
  // than about any pressure it produces. In variceal bleeding, a post-TIPS
  // portosystemic gradient below 12 mmHg is a Baveno VII haemodynamic target,
  // and an HVPG of 12 mmHg or more is the classic association with variceal
  // bleeding. It is not a general decompensation threshold, so it may not
  // appear as a band boundary — and no band this model can produce starts
  // there.
  assert.equal(VARICEAL_CONTEXT.gradientMmHg, 12);
  assert.match(VARICEAL_CONTEXT.note, /variceal bleeding/i);
  assert.match(VARICEAL_CONTEXT.note, /not a general/i);
  assert.notEqual(HVPG_THRESHOLDS.portalHypertensionMmHg, VARICEAL_CONTEXT.gradientMmHg);
  assert.notEqual(HVPG_THRESHOLDS.clinicallySignificantMmHg, VARICEAL_CONTEXT.gradientMmHg);

  const bands = new Set();
  for (let structuralResistance = 1; structuralResistance <= 12; structuralResistance += 0.25) {
    for (const splanchnicVasodilation of [0, 0.5, 1]) {
      const reading = clinicalThresholdReading(settled({ structuralResistance, splanchnicVasodilation }));
      if (reading.band) bands.add(reading.band);
    }
  }
  assert.deepEqual(
    [...bands].sort(),
    ['clinically-significant', 'normal', 'portal-hypertension'],
    'three bands, and none of them starts at 12'
  );
});

// --- 4b. The reversible component ----------------------------------------

test('haemodynamics: a reversible component of the intrahepatic resistance can be relieved', () => {
  // Cirrhotic intrahepatic vascular resistance has a structural part and a
  // reversible dynamic part — activated stellate cell contraction, reduced
  // intrahepatic nitric oxide, increased endothelin. Its existence is why a
  // drug can lower portal pressure at all, and its being a minority of the
  // total is why a drug cannot normalise it.
  //
  // The literature describes the dynamic part as roughly 20–30% of the
  // increase. That range is a description rather than a law, and how this model
  // applies it — 30% of the structural resistance, multiplicatively — is a
  // modelling choice asserted in `calibration.test.js`. Here: it exists, it is
  // reversible, and it is the minority.
  const structural = vascularResistances({ structuralResistance: 8, dynamicTone: 0 });
  const withTone = vascularResistances({ structuralResistance: 8, dynamicTone: 1 });
  assert.ok(withTone.intrahepatic > structural.intrahepatic, 'tone has to raise the resistance');
  // "Minority" arithmetically: adding it must be less than doubling. The factor
  // of two is what the word means, not a number borrowed from anywhere — the
  // reported 20–30% range is a description, and this model's share of it is
  // `dynamic-tone-parameterisation`, checked in the calibration layer.
  assert.ok(
    withTone.intrahepatic < structural.intrahepatic * 2,
    'and has to be the minority of it, or relieving it would normalise the liver'
  );

  const relieved = settled({ structuralResistance: 8, dynamicTone: 0 });
  const constricted = settled({ structuralResistance: 8, dynamicTone: 1 });
  assert.ok(
    relieved.portalPressureGradientMmHg < constricted.portalPressureGradientMmHg,
    'relieving it has to lower the gradient'
  );
  assert.ok(
    relieved.portalPressureGradientMmHg > settled({}).portalPressureGradientMmHg,
    'and must not take a cirrhotic liver back to a healthy gradient'
  );
});

// --- 5. Moved out of this layer ------------------------------------------
//
// Two things that used to be here are not physiology and have gone where they
// belong.
//
// *That this model's healthy liver produces an HVPG of 1–5 mmHg at about a
// litre a minute* is a calibration target, not a finding: the three reference
// resistances were chosen to hit it. `calibration.test.js` asserts it.
//
// *That every pressure drop the model reports is a flow times a resistance*,
// and that flow is conserved at the portal vein, are properties of the
// implementation. `tests/portal-hypertension-model.test.js` asserts them.
//
// The literature's own figures — normal HVPG 1–5 mmHg, portal flow of the
// order of a litre a minute — are recorded in
// `docs/model-evidence/cirrhosis-portal-hypertension.md` as the targets they
// are, and are not restated here as though the model had discovered them.
