import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  DEFAULT_CONTROLS,
  FILTRATION_COEFFICIENT,
  PRESET_CONTROLS,
  PRESET_IDS,
  REFERENCE,
  barrierFiltrationCoefficient,
  bowmanPressure,
  getState,
  injuryFeedback,
  oncoticPressure,
  presetState,
  solveGlomerulus,
  steadyStateBunMgDl,
  steadyStateCreatinineMgDl,
} from '../src/models/renalFiltration.js';

const normal = () => getState();
const near = (value, target, tolerance, what) =>
  assert.ok(Math.abs(value - target) <= tolerance, `${what}: ${value.toFixed(3)} is not within ${tolerance} of ${target}`);

// --- the reference kidney --------------------------------------------------

test('reference: the solved kidney lands on textbook central values', () => {
  const state = normal();
  near(state.gfrMlPerMin, 125, 6, 'GFR mL/min');
  near(state.renalBloodFlowMlPerMin, 1200, 60, 'renal blood flow mL/min');
  near(state.glomerularCapillaryPressureMmHg, 60, 2, 'glomerular capillary pressure mmHg');
  near(state.filtrationFraction, 0.2, 0.02, 'filtration fraction');
  near(state.singleNephronGfrNlPerMin, 62, 5, 'single-nephron GFR nL/min');
});

test('reference: the clinical numbers a reader would recognise come out right', () => {
  const state = normal();
  near(state.steadyStatePlasmaCreatinineMgDl, 0.8, 0.15, 'plasma creatinine mg/dL');
  near(state.steadyStateBunMgDl, 14, 3, 'BUN mg/dL');
  near(state.bunToCreatinineRatio, 16, 4, 'BUN:creatinine');
  near(state.fractionalSodiumExcretion, 0.007, 0.002, 'FENa');
  near(state.urineVolumeLPerDay, 1.5, 0.5, 'urine volume L/day');
  assert.ok(state.urinaryProteinGPerDay < 0.15, `albuminuria ${state.urinaryProteinGPerDay} should be trivial`);
});

test('reference: the solve converges', () => {
  assert.equal(normal().converged, true);
  for (const id of PRESET_IDS) {
    assert.equal(presetState(id).converged, true, `${id} did not converge`);
  }
});

test('reference: the same controls always give the same state', () => {
  assert.deepEqual(getState({ tubularHealth: 0.4 }), getState({ tubularHealth: 0.4 }));
});

// --- the Starling balance --------------------------------------------------

test('starling: oncotic pressure follows Landis–Pappenheimer', () => {
  near(oncoticPressure(7), 25.6, 0.5, 'π at 7 g/dL');
  assert.ok(oncoticPressure(0) === 0);
  // Markedly non-linear: doubling protein more than doubles the pressure.
  assert.ok(oncoticPressure(8) - oncoticPressure(7) > oncoticPressure(5) - oncoticPressure(4));
});

test('starling: filtration is what is left after the two opposing pressures', () => {
  const state = normal();
  const net =
    state.glomerularCapillaryPressureMmHg - state.bowmanPressureMmHg - state.meanOncoticPressureMmHg;
  near(state.netFiltrationPressureMmHg, net, 1e-9, 'net filtration pressure identity');
  near(state.gfrMlPerMin, FILTRATION_COEFFICIENT * net, 0.5, 'GFR = Kf x net pressure');
});

test('starling: plasma concentrated along the capillary opposes further filtration', () => {
  const state = normal();
  assert.ok(
    state.meanOncoticPressureMmHg > state.afferentOncoticPressureMmHg,
    'the mean must exceed the entering value, or nothing was concentrated'
  );
});

// --- the arterioles --------------------------------------------------------

test('arterioles: efferent constriction raises filtration while lowering blood flow', () => {
  // The behaviour no other vessel in the body has, and the reason an ACE
  // inhibitor drops the GFR of a kidney that was depending on it.
  const base = normal();
  const constricted = getState({ efferentToneMultiplier: 1.6 });
  assert.ok(constricted.glomerularCapillaryPressureMmHg > base.glomerularCapillaryPressureMmHg);
  assert.ok(constricted.renalBloodFlowMlPerMin < base.renalBloodFlowMlPerMin);
  assert.ok(constricted.filtrationFraction > base.filtrationFraction);
});

test('arterioles: afferent constriction lowers both flow and filtration', () => {
  const base = normal();
  const constricted = getState({ afferentToneMultiplier: 1.6 });
  assert.ok(constricted.glomerularCapillaryPressureMmHg < base.glomerularCapillaryPressureMmHg);
  assert.ok(constricted.renalBloodFlowMlPerMin < base.renalBloodFlowMlPerMin);
  assert.ok(constricted.gfrMlPerMin < base.gfrMlPerMin);
});

test('arterioles: perfusion pressure alone moves filtration', () => {
  assert.ok(getState({ meanArterialPressureMmHg: 70 }).gfrMlPerMin < normal().gfrMlPerMin);
  assert.ok(getState({ meanArterialPressureMmHg: 120 }).gfrMlPerMin > normal().gfrMlPerMin);
});

// --- the four failures -----------------------------------------------------

test('pre-renal: filtration falls, filtration fraction does not, and sodium is held', () => {
  const state = presetState('prerenal');
  const base = normal();
  assert.ok(state.gfrMlPerMin < base.gfrMlPerMin, 'GFR should fall');
  assert.ok(state.filtrationFraction >= base.filtrationFraction * 0.95, 'filtration fraction is defended');
  assert.ok(state.fractionalSodiumExcretion < 0.01, `FENa ${state.fractionalSodiumExcretion} should be under 1%`);
  assert.ok(state.fractionalSodiumExcretion < base.fractionalSodiumExcretion, 'and lower than baseline');
  assert.ok(state.bunToCreatinineRatio > 20, 'urea rises out of proportion to creatinine');
  assert.ok(state.urineOsmolalityMosmKg > 700, 'an intact tubule concentrates');
  assert.ok(state.urineSodiumMmolL < base.urineSodiumMmolL, 'urine sodium falls');
});

test('tubular injury: every one of those numbers inverts', () => {
  const state = presetState('tubularInjury');
  const prerenal = presetState('prerenal');
  assert.ok(state.fractionalSodiumExcretion > 0.02, `FENa ${state.fractionalSodiumExcretion} should exceed 2%`);
  assert.ok(state.fractionalUreaExcretion > 0.5, 'urea is no longer reabsorbed');
  assert.ok(state.bunToCreatinineRatio < 15, 'the ratio falls rather than rises');
  assert.ok(state.urineOsmolalityMosmKg < prerenal.urineOsmolalityMosmKg, 'it cannot concentrate');

  // Every discriminator points the other way from pre-renal, which is the
  // entire clinical content of the pair.
  assert.ok(state.fractionalSodiumExcretion > prerenal.fractionalSodiumExcretion * 5);
  assert.ok(state.bunToCreatinineRatio < prerenal.bunToCreatinineRatio);
});

test('tubular injury: reaches the glomerulus by feedback and by casts', () => {
  const feedback = injuryFeedback(0.25);
  assert.ok(feedback.afferentMultiplier > 1, 'tubuloglomerular feedback constricts the afferent');
  assert.ok(feedback.castPressureMmHg > 0, 'casts raise the pressure behind them');
  assert.deepEqual(injuryFeedback(1), { afferentMultiplier: 1, castPressureMmHg: 0 });

  // So GFR falls, which is what makes it acute kidney injury rather than a
  // tubule problem with a normal filtration rate.
  assert.ok(getState({ tubularHealth: 0.25 }).gfrMlPerMin < normal().gfrMlPerMin * 0.5);
});

test('obstruction: a blockage below the kidney reaches the Starling equation', () => {
  const state = presetState('obstruction');
  assert.ok(state.bowmanPressureMmHg > REFERENCE.bowmanPressureMmHg, "Bowman's pressure rises");
  assert.ok(state.gfrMlPerMin < normal().gfrMlPerMin, 'and filtration falls with it');
  // It is the only route a downstream blockage has.
  assert.equal(bowmanPressure(0), REFERENCE.bowmanPressureMmHg);
  assert.ok(bowmanPressure(1) > bowmanPressure(0.5));
  assert.ok(bowmanPressure(0.5) > bowmanPressure(0.2));
});

test('obstruction: complete obstruction stops filtration entirely', () => {
  assert.ok(getState({ outflowObstruction: 1 }).gfrMlPerMin < 1);
});

test('chronic: losing nephrons costs less GFR than it should, and the survivors pay', () => {
  const state = presetState('chronic');
  const base = normal();
  const fraction = state.functioningNephronFraction;

  assert.ok(
    state.gfrMlPerMin > base.gfrMlPerMin * fraction * 1.3,
    'GFR falls by much less than the nephron count did'
  );
  assert.ok(
    state.singleNephronGfrNlPerMin > base.singleNephronGfrNlPerMin * 1.4,
    'because each remaining nephron filters far more'
  );
  assert.ok(
    state.glomerularCapillaryPressureMmHg > base.glomerularCapillaryPressureMmHg,
    'at a higher capillary pressure — the compensation that is also the injury'
  );
});

test('chronic: the same dietary sodium leaves through fewer nephrons', () => {
  assert.ok(presetState('chronic').fractionalSodiumExcretion > normal().fractionalSodiumExcretion * 1.5);
});

test('chronic: concentrating ability is limited by nephron loss, not only by injury', () => {
  const thirsty = { antidiureticActivity: 3 };
  const healthy = getState(thirsty);
  const chronic = getState({ ...thirsty, functioningNephronFraction: 0.2 });
  assert.ok(chronic.urineOsmolalityMosmKg < healthy.urineOsmolalityMosmKg);
});

test('nephrotic: grams of protein leave while filtration stays near normal', () => {
  const state = presetState('nephrotic');
  assert.ok(state.urinaryProteinGPerDay > 3.5, `${state.urinaryProteinGPerDay} g/day should be nephrotic`);
  assert.ok(state.gfrMlPerMin > normal().gfrMlPerMin * 0.6, 'filtration is not what failed');
  assert.ok(state.urinaryProteinGPerDay > normal().urinaryProteinGPerDay * 50);
});

test('nephrotic: a damaged barrier loses surface as well as selectivity', () => {
  // Without it the model would predict a *higher* GFR than normal, seeing only
  // the fall in plasma oncotic pressure.
  assert.equal(barrierFiltrationCoefficient(1), 1);
  assert.ok(barrierFiltrationCoefficient(20) < 0.6);
  const lowOncoticOnly = getState({ plasmaProteinGDl: 5 });
  assert.ok(lowOncoticOnly.gfrMlPerMin > normal().gfrMlPerMin, 'low oncotic pressure alone raises GFR');
  assert.ok(presetState('nephrotic').gfrMlPerMin < lowOncoticOnly.gfrMlPerMin);
});

// --- the mechanism the FENa rests on ---------------------------------------

test('mechanism: proximal reabsorption follows filtration fraction, not a rule', () => {
  const low = getState({ efferentToneMultiplier: 0.8 });
  const high = getState({ efferentToneMultiplier: 1.6 });
  assert.ok(high.filtrationFraction > low.filtrationFraction);
  assert.ok(high.proximalSodiumFraction > low.proximalSodiumFraction);
  assert.ok(high.fractionalSodiumExcretion < low.fractionalSodiumExcretion);
});

test('mechanism: aldosterone and glomerulotubular balance are separate causes of a low FENa', () => {
  const base = normal();
  const hormonal = getState({ aldosteroneActivity: 2.5 });
  const haemodynamic = getState({ efferentToneMultiplier: 1.6 });
  assert.ok(hormonal.fractionalSodiumExcretion < base.fractionalSodiumExcretion);
  assert.ok(haemodynamic.fractionalSodiumExcretion < base.fractionalSodiumExcretion);
  // And they act on different segments, so the proximal fraction only moves
  // for one of them.
  assert.equal(hormonal.proximalSodiumFraction, base.proximalSodiumFraction);
  assert.ok(haemodynamic.proximalSodiumFraction > base.proximalSodiumFraction);
});

test('mechanism: withdrawing efferent support drops the GFR that support was holding up', () => {
  const supported = presetState('prerenal');
  const withdrawn = presetState('efferentSupportWithdrawn');
  assert.ok(withdrawn.gfrMlPerMin < supported.gfrMlPerMin * 0.8);
  assert.ok(withdrawn.renalBloodFlowMlPerMin > supported.renalBloodFlowMlPerMin, 'flow rises as filtration falls');
});

// --- mass balance ----------------------------------------------------------

test('mass balance: what is excreted is what was filtered minus what was reabsorbed', () => {
  const state = normal();
  near(
    state.excretedSodiumMmolPerDay,
    state.filteredSodiumMmolPerDay * state.fractionalSodiumExcretion,
    1e-6,
    'sodium mass balance'
  );
  near(
    state.excretedUreaMmolPerDay,
    state.filteredUreaMmolPerDay * state.fractionalUreaExcretion,
    1e-6,
    'urea mass balance'
  );
});

test('mass balance: urine volume is the solute divided by the concentration reached', () => {
  const state = normal();
  near(
    state.urineVolumeLPerDay,
    state.urinaryOsmolesPerDay / state.urineOsmolalityMosmKg,
    1e-9,
    'urine volume identity'
  );
});

test('mass balance: urine sodium can never exceed half the urine osmolality', () => {
  // Sodium leaves with an anion, so it contributes twice its own concentration
  // to the osmolality it is being concentrated within. A model that assumed a
  // fixed solute load produced concentrations no kidney can make.
  for (const id of PRESET_IDS) {
    const state = presetState(id);
    assert.ok(
      state.urineSodiumMmolL <= state.urineOsmolalityMosmKg / 2 + 1e-6,
      `${id}: urine sodium ${state.urineSodiumMmolL.toFixed(0)} exceeds half of ${state.urineOsmolalityMosmKg}`
    );
  }
});

test('mass balance: creatinine and urea are production divided by clearance', () => {
  near(steadyStateCreatinineMgDl(125), REFERENCE.creatinineProductionMgPerDay / (125 * 1.44) / 10, 1e-9, 'creatinine');
  // Halving GFR doubles the steady-state creatinine. The most-taught fact
  // about creatinine, and here it is arithmetic rather than an assertion.
  near(steadyStateCreatinineMgDl(62.5) / steadyStateCreatinineMgDl(125), 2, 1e-9, 'creatinine doubling');
  assert.ok(steadyStateBunMgDl(125, 0.25) > steadyStateBunMgDl(125, 0.5), 'less excreted urea, higher BUN');
});

// --- boundaries ------------------------------------------------------------

test('boundaries: no control can produce a physically impossible state', () => {
  const extremes = [
    { meanArterialPressureMmHg: 20 },
    { meanArterialPressureMmHg: 220 },
    { afferentToneMultiplier: 10 },
    { afferentToneMultiplier: 0.05 },
    { efferentToneMultiplier: 10 },
    { efferentToneMultiplier: 0.05 },
    { functioningNephronFraction: 0.01 },
    { tubularHealth: 0.01 },
    { barrierPermeability: 500 },
    { outflowObstruction: 1 },
    { plasmaProteinGDl: 2 },
    { aldosteroneActivity: 0 },
    { antidiureticActivity: 0 },
  ];

  for (const controls of extremes) {
    const state = getState(controls);
    const where = JSON.stringify(controls);
    for (const [key, value] of Object.entries(state)) {
      if (typeof value !== 'number') continue;
      assert.ok(Number.isFinite(value), `${where}: ${key} is not finite`);
    }
    assert.ok(state.gfrMlPerMin >= 0, `${where}: negative GFR`);
    assert.ok(state.renalBloodFlowMlPerMin > 0, `${where}: non-positive renal blood flow`);
    assert.ok(state.fractionalSodiumExcretion >= 0 && state.fractionalSodiumExcretion <= 1, `${where}: FENa`);
    assert.ok(state.fractionalUreaExcretion > 0 && state.fractionalUreaExcretion <= 1, `${where}: FEurea`);
    assert.ok(state.urineVolumeLPerDay >= 0, `${where}: negative urine volume`);
    assert.ok(state.urinaryProteinGPerDay >= 0, `${where}: negative proteinuria`);
    assert.ok(
      state.urineOsmolalityMosmKg >= 290 && state.urineOsmolalityMosmKg <= 1250,
      `${where}: urine osmolality ${state.urineOsmolalityMosmKg}`
    );
  }
});

test('boundaries: filtration cannot exceed the plasma delivered to it', () => {
  for (const controls of [{}, { efferentToneMultiplier: 4 }, { plasmaProteinGDl: 2 }]) {
    const state = getState(controls);
    assert.ok(
      state.gfrMlPerMin <= state.renalPlasmaFlowMlPerMin,
      `filtration fraction above 1: ${state.gfrMlPerMin} of ${state.renalPlasmaFlowMlPerMin}`
    );
  }
});

test('boundaries: the model has no opinion about what it is for', () => {
  // `src/models/` rule 6: a model that mentions the UI has stopped being one.
  // Comments are stripped first — they are allowed to explain what a scene
  // will do with the state, and this one does.
  const code = readFileSync(new URL('../src/models/renalFiltration.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  for (const forbidden of [/from 'three'/, /THREE\./, /\bdocument\b/, /\bwindow\b/, /sceneId/, /Math\.random/]) {
    assert.ok(!forbidden.test(code), `the model layer must not reference ${forbidden}`);
  }
  assert.ok(!/^import .* from '(?!\.\/)/m.test(code), 'the model layer imports nothing outside itself');
});

test('presets: each one is a set of controls, and carries no copy at all', () => {
  for (const [id, controls] of Object.entries(PRESET_CONTROLS)) {
    for (const [key, value] of Object.entries(controls)) {
      assert.ok(key in DEFAULT_CONTROLS, `${id} sets an undeclared control "${key}"`);
      assert.equal(typeof value, 'number', `${id}.${key} is not a number — copy belongs in src/data/`);
    }
  }
});

test('glomerulus: the solver is usable on its own', () => {
  const solved = solveGlomerulus(DEFAULT_CONTROLS);
  assert.ok(solved.converged);
  near(solved.gfrMlPerMin, getState().gfrMlPerMin, 1e-9, 'the two entry points agree');
});
