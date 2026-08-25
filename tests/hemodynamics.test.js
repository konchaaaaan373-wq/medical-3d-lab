import test from 'node:test';
import assert from 'node:assert/strict';
import { CIRCULATION_KEYFRAMES, STAGES } from '../src/data/heartFailure.js';
import {
  sampleHemodynamics,
  cavityVolumeAt,
  ventricleShape,
  myocardialVolumeFor,
  radiusForVolume,
  advanceCardiacPhase,
  circulationParameters,
  congestionFromPressure,
  pressureVolumeCurves,
} from '../src/scenes/heartFailure/hemodynamics.js';
import { solveSteadyState, walkBeat, COMPARTMENTS } from '../src/scenes/heartFailure/circulation.js';
import { COMPARISON_OFFSET } from '../src/scenes/heartFailure/HeartFailureScene.js';

/**
 * Sweep across the whole slider, including every keyframe and stage boundary.
 *
 * Coarser than it used to be because each point is now a solved circulation
 * rather than a table look-up. The solution cache is keyed on progress rounded
 * to 1/400, so these land on cache slots and the sweep costs one solve each.
 */
const SWEEP = [];
for (let i = 0; i <= 200; i++) SWEEP.push(i / 200);
for (const kf of CIRCULATION_KEYFRAMES) SWEEP.push(kf.at);
for (const stage of STAGES) SWEEP.push(stage.at);

const near = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

test('stroke volume, ejection fraction and cardiac output are arithmetically consistent', () => {
  for (const p of SWEEP) {
    const h = sampleHemodynamics(p);
    assert.ok(
      near(h.strokeVolumeMl, h.edvMl - h.esvMl),
      `SV != EDV - ESV at ${p}`
    );
    assert.ok(
      near(h.ejectionFraction, h.strokeVolumeMl / h.edvMl),
      `EF != SV / EDV at ${p}`
    );
    assert.ok(
      near(h.cardiacOutputLMin, (h.strokeVolumeMl * h.hr) / 1000, 1e-12),
      `CO != SV x HR at ${p}`
    );
  }
});

test('basic physiological invariants hold everywhere on the slider', () => {
  for (const p of SWEEP) {
    const h = sampleHemodynamics(p);
    assert.ok(h.edvMl > 0, `EDV must be positive at ${p}`);
    assert.ok(h.esvMl >= 0, `ESV must be non-negative at ${p}`);
    assert.ok(h.esvMl < h.edvMl, `ESV must be below EDV at ${p}`);
    assert.ok(h.ejectionFraction > 0 && h.ejectionFraction <= 1, `EF out of range at ${p}`);
    assert.ok(h.hr > 0, `HR must be positive at ${p}`);
    assert.ok(h.longToShortAxisRatio > 1, `cavity must stay elongated-or-round at ${p}`);
    assert.ok(
      h.congestionLevel >= 0 && h.congestionLevel <= 1,
      `congestion level out of range at ${p}`
    );
  }
});

test('this illustrative trajectory never has the failing ventricle out-pumping the healthy one', () => {
  // A property of this particular set of mechanical parameters, not a claim
  // that stroke volume or cardiac output must fall monotonically in heart
  // failure. The bug it guards against: interpolating EDV and ESV independently
  // once produced a stroke volume and cardiac output that ROSE as failure
  // advanced.
  //
  // Since stroke volume became a solved result rather than a tabulated one it
  // wanders by a few tenths of a millilitre between neighbouring states — the
  // circulation re-balancing as contractility, stiffness and resistance move
  // together. That is the model working, so the sample-to-sample test allows
  // it; what must hold strictly is the direction across the whole trajectory
  // and the comparison with the healthy state.
  const normal = sampleHemodynamics(0);
  const WANDER_ML = 0.5;
  let previousSv = Infinity;
  for (const p of SWEEP.slice().sort((a, b) => a - b)) {
    const h = sampleHemodynamics(p);
    assert.ok(
      h.strokeVolumeMl <= previousSv + WANDER_ML,
      `stroke volume must not climb as remodelling advances (at ${p})`
    );
    assert.ok(
      h.strokeVolumeMl <= normal.strokeVolumeMl + 1e-9,
      `stroke volume must never exceed the healthy value (at ${p})`
    );
    // Resting cardiac output may stay relatively preserved in some patients
    // despite a reduced EF, so a flat-ish curve is acceptable here — but a
    // failing ventricle producing more than a healthy one is not.
    assert.ok(
      h.cardiacOutputLMin <= normal.cardiacOutputLMin * 1.1,
      `cardiac output must not become supranormal (at ${p})`
    );
    previousSv = h.strokeVolumeMl;
  }

  // Stage to stage, with the wander averaged out, the direction is strict.
  let previousStageSv = Infinity;
  for (const stage of STAGES) {
    const sv = sampleHemodynamics(stage.at).strokeVolumeMl;
    assert.ok(sv < previousStageSv, `stroke volume should fall by the ${stage.id} stage`);
    previousStageSv = sv;
  }
});

test('ejection fraction falls once systolic dysfunction is reached', () => {
  const byId = Object.fromEntries(STAGES.map((s) => [s.id, sampleHemodynamics(s.at)]));
  assert.ok(byId.normal.ejectionFraction > 0.5, 'normal EF should be above 50%');
  // HFrEF is defined by a reduced ejection fraction; the stage labelled as such
  // must not show a preserved one.
  assert.ok(
    byId['systolic-dysfunction'].ejectionFraction < 0.4,
    'the HFrEF stage must show a clearly reduced EF'
  );
  assert.ok(
    sampleHemodynamics(1).ejectionFraction < byId['systolic-dysfunction'].ejectionFraction,
    'EF should keep falling towards the end of the axis'
  );
});

test('pulmonary congestion is not a structural stage', () => {
  // Congestion follows raised left-sided filling pressure. It is not the
  // structural stage after HFrEF, and it is not specific to HFrEF either, so it
  // must not appear as a step on the structural axis.
  for (const stage of STAGES) {
    assert.ok(
      !/congestion|うっ血/i.test(`${stage.id} ${stage.name} ${stage.nameJa}`),
      `"${stage.name}" presents congestion as a structural stage`
    );
  }
  // The last structural stage is the functional one, not a congestion stage.
  assert.equal(STAGES[STAGES.length - 1].id, 'systolic-dysfunction');
});

test('congestion rides its own axis and still reaches the overlay', () => {
  const level = (p) => sampleHemodynamics(p).congestionLevel;
  assert.ok(level(0) < 0.02, 'a normal ventricle should show no congestion overlay');
  // The overlay hides itself below 0.02 (see CongestionOverlay.setCongestion),
  // so the far end of the axis must be comfortably above that.
  assert.ok(level(1) > 0.9, 'the overlay must be fully available at the end of the axis');
  // It rises with, but is not identical to, the structural axis: it must already
  // be present before the last stage, so it never reads as "what comes after".
  const hfrefStart = STAGES.find((s) => s.id === 'systolic-dysfunction').at;
  assert.ok(level(hfrefStart) > 0.3, 'filling pressure should already be raised as HFrEF begins');
  let previous = -1;
  for (const p of SWEEP.slice().sort((a, b) => a - b)) {
    const value = level(p);
    assert.ok(value >= previous - 1e-9, `congestion level should not fall back at ${p}`);
    previous = value;
  }
});

test('the concentric state is named for what the model actually does', () => {
  // Increased relative wall thickness with increased mass is hypertrophy;
  // "remodeling" is the term for increased RWT with normal mass.
  const stage = STAGES.find((s) => s.id === 'concentric-hypertrophy');
  assert.ok(stage, 'the concentric stage should be identified as hypertrophy');
  const normal = sampleHemodynamics(0);
  const concentric = sampleHemodynamics(stage.at);
  const shapeOf = (h) =>
    ventricleShape({
      cavityVolumeMl: h.edvMl,
      myocardialVolumeMl: myocardialVolumeFor(h),
      longToShortAxisRatio: h.longToShortAxisRatio,
    });
  assert.ok(
    myocardialVolumeFor(concentric) > myocardialVolumeFor(normal) * 1.1,
    'the model must genuinely add myocardium for "hypertrophy" to be the right word'
  );
  assert.ok(shapeOf(concentric).relativeWallThickness > shapeOf(normal).relativeWallThickness);
  assert.ok(concentric.edvMl <= normal.edvMl, 'the cavity must not enlarge in a concentric pattern');
});

test('remodelling geometry moves in the right direction', () => {
  const shapeAt = (p) => {
    const h = sampleHemodynamics(p);
    return ventricleShape({
      cavityVolumeMl: h.edvMl,
      myocardialVolumeMl: myocardialVolumeFor(h),
      longToShortAxisRatio: h.longToShortAxisRatio,
    });
  };
  const normal = shapeAt(0);
  const concentric = shapeAt(0.18);
  const dilated = shapeAt(0.85);

  // Concentric remodelling: thicker wall, cavity not enlarged, RWT up.
  assert.ok(concentric.wallThickness > normal.wallThickness);
  assert.ok(concentric.cavityRadius <= normal.cavityRadius);
  assert.ok(concentric.relativeWallThickness > normal.relativeWallThickness);

  // Eccentric remodelling: bigger cavity, RWT down, but muscle mass still up.
  assert.ok(dilated.cavityRadius > normal.cavityRadius);
  assert.ok(dilated.relativeWallThickness < normal.relativeWallThickness);
  assert.ok(
    myocardialVolumeFor(sampleHemodynamics(0.85)) > myocardialVolumeFor(sampleHemodynamics(0)),
    'a remodelled ventricle should not have less myocardium than a normal one'
  );
});

test('geometry stays valid and continuous across the whole sweep', () => {
  let previous = null;
  for (const p of SWEEP.slice().sort((a, b) => a - b)) {
    const h = sampleHemodynamics(p);
    const myocardialVolumeMl = myocardialVolumeFor(h);
    assert.ok(myocardialVolumeMl > 0, `myocardial volume must be positive at ${p}`);
    const shape = ventricleShape({
      cavityVolumeMl: h.edvMl,
      myocardialVolumeMl,
      longToShortAxisRatio: h.longToShortAxisRatio,
    });
    assert.ok(shape.cavityRadius > 0 && shape.outerRadius > shape.cavityRadius, `inverted wall at ${p}`);
    assert.ok(shape.wallThickness > 0.2, `implausibly thin wall at ${p}`);
    if (previous) {
      // No abrupt jumps between adjacent samples (0.25% of the slider apart).
      assert.ok(
        Math.abs(shape.wallThickness - previous.wallThickness) < 0.15,
        `wall thickness jumps at ${p}`
      );
      assert.ok(
        Math.abs(shape.cavityRadius - previous.cavityRadius) < 0.15,
        `cavity radius jumps at ${p}`
      );
    }
    previous = shape;
  }
});

test('myocardium is incompressible within a beat, and the wall thickens in systole', () => {
  for (const p of [0, 0.18, 0.42, 0.64, 0.85, 1]) {
    const h = sampleHemodynamics(p);
    const myocardialVolumeMl = myocardialVolumeFor(h);
    const shapeFor = (cavityVolumeMl) =>
      ventricleShape({ cavityVolumeMl, myocardialVolumeMl, longToShortAxisRatio: h.longToShortAxisRatio });

    const ed = shapeFor(h.edvMl);
    const es = shapeFor(h.esvMl);

    // End-diastolic wall thickness must reproduce the stated keyframe value.
    assert.ok(Math.abs(ed.wallThickness * 10 - h.wallMm) < 1e-6, `ED wall mismatch at ${p}`);
    // Constant muscle volume implies systolic thickening, not a hand-animated one.
    assert.ok(es.wallThickness > ed.wallThickness, `wall must thicken in systole at ${p}`);

    const volumeOf = (r) => (4 / 3) * Math.PI * h.longToShortAxisRatio * r ** 3;
    const edMuscle = volumeOf(ed.outerRadius) - volumeOf(ed.cavityRadius);
    const esMuscle = volumeOf(es.outerRadius) - volumeOf(es.cavityRadius);
    assert.ok(Math.abs(edMuscle - esMuscle) < 1e-6, `muscle volume not conserved in the beat at ${p}`);
  }
});

test('the cardiac cycle stays between ESV and EDV and ends where it starts', () => {
  const h = sampleHemodynamics(0.5);
  // The solver stops once end-diastolic and end-systolic volume settle to
  // within 0.02 mL of the previous beat, so the recorded cycle is periodic to
  // about that much rather than exactly. Anything larger would be a real drift.
  const tolerance = 0.05;
  for (let i = 0; i <= 200; i++) {
    const phase = i / 200;
    const v = cavityVolumeAt(phase, h);
    assert.ok(v >= h.esvMl - tolerance && v <= h.edvMl + tolerance, `volume out of range at phase ${phase}`);
  }
  assert.ok(Math.abs(cavityVolumeAt(0, h) - h.edvMl) < tolerance, 'cycle should start at end-diastole');
  assert.ok(
    Math.abs(cavityVolumeAt(h.endSystolePhase, h) - h.esvMl) < tolerance,
    'the solved end-systolic phase should be where the volume bottoms out'
  );
});

test('radius/volume conversion round-trips', () => {
  for (const volume of [50, 120, 248]) {
    for (const ratio of [1.32, 1.9]) {
      const r = radiusForVolume(volume, ratio);
      assert.ok(Math.abs((4 / 3) * Math.PI * ratio * r ** 3 - volume) < 1e-9);
    }
  }
});

test('the cardiac phase advances safely and rejects bad state', () => {
  let phase = 0;
  for (let i = 0; i < 500; i++) {
    phase = advanceCardiacPhase(phase, 1 / 60, sampleHemodynamics(i / 500).hr);
    assert.ok(Number.isFinite(phase) && phase >= 0 && phase < 1, `phase left [0,1) at step ${i}`);
  }
  // A renamed state field once made this silently NaN, which reached the
  // geometry as NaN vertices. Fail loudly instead.
  assert.throws(() => advanceCardiacPhase(0, 1 / 60, undefined), RangeError);
  assert.throws(() => advanceCardiacPhase(NaN, 1 / 60, 70), RangeError);
});

test('every field the scene reads off the state object exists', () => {
  const state = sampleHemodynamics(0.5);
  for (const key of [
    'edvMl',
    'esvMl',
    'strokeVolumeMl',
    'ejectionFraction',
    'cardiacOutputLMin',
    'wallMm',
    'hr',
    'congestionLevel',
    'longToShortAxisRatio',
  ]) {
    assert.ok(Number.isFinite(state[key]), `state.${key} must be a finite number`);
  }
});

test('the two hearts in comparison mode never overlap', () => {
  // Comparison mode moves the healthy and remodelled ventricles to ±OFFSET.
  // If the remodelled chamber ever grew past the gap they would intersect, which
  // would read as one malformed organ rather than as two states.
  const outerRadiusAt = (p) => {
    const h = sampleHemodynamics(p);
    return ventricleShape({
      cavityVolumeMl: h.edvMl, // largest the chamber ever gets
      myocardialVolumeMl: myocardialVolumeFor(h),
      longToShortAxisRatio: h.longToShortAxisRatio,
    }).outerRadius;
  };

  const reference = outerRadiusAt(0);
  let widest = 0;
  for (const p of SWEEP) widest = Math.max(widest, outerRadiusAt(p));

  assert.ok(
    reference + widest < 2 * COMPARISON_OFFSET,
    `hearts would touch: ${(reference + widest).toFixed(2)} >= ${2 * COMPARISON_OFFSET}`
  );
});

// ---------------------------------------------------------------------------
// The circulation model itself.
//
// The tests above check what the scene reads off the state. These check the
// thing that now produces it: a closed-loop, time-varying-elastance model whose
// EF, stroke volume and pressures are integration results. The point of the
// rewrite was that those numbers stop being assertions the data file makes and
// start being consequences — so what is worth testing is the physics, not the
// figures.
// ---------------------------------------------------------------------------

const solve = (progress, options = {}) => solveSteadyState(circulationParameters(progress, options));

test('blood is conserved: the compartments always add up to the circulating volume', () => {
  for (const p of [0, 0.18, 0.42, 0.64, 0.85, 1]) {
    const parameters = circulationParameters(p);
    const { volumes } = solve(p);
    let total = 0;
    for (let i = 0; i < COMPARTMENTS; i++) {
      assert.ok(volumes[i] > 0, `compartment ${i} must hold blood at ${p}`);
      total += volumes[i];
    }
    // Every flow leaves one compartment and enters another, so the sum can only
    // drift through integration error. A leak here would be a sign error.
    assert.ok(
      Math.abs(total - parameters.circulatingVolume) < 0.5,
      `circulating volume drifted by ${(total - parameters.circulatingVolume).toFixed(3)} mL at ${p}`
    );
  }
});

test('valves are one-way: blood never crosses one backwards', () => {
  // This is the invariant behind the whole congestion overlay. Raised left-sided
  // filling pressure is transmitted backwards through the circulation; blood is
  // not. If a valve could pass flow the wrong way, the model itself would be
  // saying the thing the overlay was rewritten to stop implying.
  const VALVES = ['mitral', 'aortic', 'tricuspid', 'pulmonic'];
  for (const p of [0, 0.42, 0.85, 1]) {
    const parameters = circulationParameters(p);
    walkBeat(solve(p), parameters, 480, ({ phase, flows }) => {
      for (const valve of VALVES) {
        assert.ok(flows[valve] >= 0, `${valve} flow ran backwards at progress ${p}, phase ${phase}`);
      }
    });
  }
});

test('the pulmonary veins act as a reservoir, not as a route for backward flow', () => {
  // The vein-to-atrium segment has no valve, so blood can move back into the
  // pulmonary veins while the atrium contracts — which is real, and visible on
  // pulmonary venous Doppler as the atrial reversal wave. What must be true is
  // that it stays the size of a wave rather than becoming a route: the net
  // transport over a beat is forwards and equals the stroke volume.
  for (const p of [0, 0.64, 1]) {
    const parameters = circulationParameters(p);
    const solution = solve(p);
    const { cycle } = solution;
    let net = 0;
    let backwards = 0;
    walkBeat(solution, parameters, 480, ({ dt, flows }) => {
      net += flows.pulmonaryVenous * dt;
      if (flows.pulmonaryVenous < 0) backwards -= flows.pulmonaryVenous * dt;
    });
    assert.ok(
      Math.abs(net - cycle.strokeVolume) < 1,
      `net pulmonary venous transport should equal stroke volume at ${p}`
    );
    assert.ok(
      backwards < cycle.strokeVolume * 0.45,
      `the atrial reversal wave is too large to read as a reservoir at ${p} (${backwards.toFixed(1)} mL)`
    );
  }
});

test('solved pressures stay in a physiological range and in the right order', () => {
  for (const p of SWEEP) {
    const h = sampleHemodynamics(p);
    assert.ok(
      h.systolicPressureMmHg > h.diastolicPressureMmHg,
      `systolic must exceed diastolic at ${p}`
    );
    assert.ok(
      h.meanArterialPressureMmHg > h.diastolicPressureMmHg &&
        h.meanArterialPressureMmHg < h.systolicPressureMmHg,
      `mean arterial pressure must sit between systolic and diastolic at ${p}`
    );
    // Pressure falls along the direction of flow through the left heart.
    assert.ok(
      h.meanPulmonaryArterialPressureMmHg > h.meanPulmonaryVenousPressureMmHg,
      `pulmonary artery must be above pulmonary vein at ${p}`
    );
    assert.ok(
      h.meanPulmonaryVenousPressureMmHg > h.meanAtrialPressureMmHg,
      `pulmonary vein must be above the left atrium at ${p}`
    );
    // Loose, because these are the bounds of "not obviously wrong", not targets.
    assert.ok(h.systolicPressureMmHg > 60 && h.systolicPressureMmHg < 220, `systolic out of range at ${p}`);
    assert.ok(h.endDiastolicPressureMmHg > 0 && h.endDiastolicPressureMmHg < 45, `LVEDP out of range at ${p}`);
  }
});

test('a normal state and a failing state land where the reviewed illustration says', () => {
  // These are the figures the medical review looked at. They are not inputs any
  // more — no table contains them — so this test is what tells us the mechanical
  // parameters still produce the trajectory that was reviewed. A change here
  // means the illustration moved and needs looking at again, not that a number
  // needs editing.
  const expected = [
    { at: 0, ef: [0.55, 0.62], edv: [112, 132], lvedp: [5, 12], pvp: [4, 9] },
    { at: 0.18, ef: [0.55, 0.65], edv: [106, 126], lvedp: [12, 20], pvp: [6, 13] },
    { at: 0.42, ef: [0.33, 0.44], edv: [162, 190], lvedp: [17, 26], pvp: [10, 17] },
    { at: 0.64, ef: [0.23, 0.33], edv: [198, 226], lvedp: [24, 32], pvp: [15, 23] },
    { at: 1, ef: [0.15, 0.25], edv: [240, 270], lvedp: [30, 39], pvp: [22, 31] },
  ];
  for (const row of expected) {
    const h = sampleHemodynamics(row.at);
    const within = (value, [low, high], label) =>
      assert.ok(value >= low && value <= high, `${label} = ${value.toFixed(2)} outside [${low}, ${high}] at ${row.at}`);
    within(h.ejectionFraction, row.ef, 'EF');
    within(h.edvMl, row.edv, 'EDV');
    within(h.endDiastolicPressureMmHg, row.lvedp, 'LVEDP');
    within(h.meanPulmonaryVenousPressureMmHg, row.pvp, 'mean PVP');
  }
});

test('Frank-Starling: raising preload raises end-diastolic volume and stroke volume', () => {
  for (const p of [0, 0.42, 0.85]) {
    const low = sampleHemodynamics(p, { preload: 0.9 });
    const base = sampleHemodynamics(p, { preload: 1 });
    const high = sampleHemodynamics(p, { preload: 1.1 });
    assert.ok(low.edvMl < base.edvMl && base.edvMl < high.edvMl, `EDV must rise with preload at ${p}`);
    assert.ok(
      low.strokeVolumeMl < base.strokeVolumeMl && base.strokeVolumeMl < high.strokeVolumeMl,
      `stroke volume must rise with end-diastolic volume at ${p}`
    );
    // And the price of that filling is a higher filling pressure, which is why
    // more preload is not simply "better".
    assert.ok(
      high.endDiastolicPressureMmHg > base.endDiastolicPressureMmHg,
      `filling pressure must rise with preload at ${p}`
    );
  }
});

test('afterload sensitivity is real, and greater in the failing ventricle', () => {
  const drop = (p) => {
    const base = sampleHemodynamics(p, { afterload: 1 });
    const loaded = sampleHemodynamics(p, { afterload: 1.3 });
    assert.ok(
      loaded.strokeVolumeMl < base.strokeVolumeMl,
      `raising resistance must reduce stroke volume at ${p}`
    );
    assert.ok(
      loaded.meanArterialPressureMmHg > base.meanArterialPressureMmHg,
      `raising resistance must raise arterial pressure at ${p}`
    );
    return (base.strokeVolumeMl - loaded.strokeVolumeMl) / base.strokeVolumeMl;
  };
  // A ventricle with a low end-systolic elastance loses more of its stroke
  // volume to the same rise in resistance — the afterload sensitivity of a
  // failing heart. This falls out of the elastance model; nothing encodes it.
  assert.ok(drop(1) > drop(0) * 1.5, 'the failing ventricle should be the more afterload-sensitive one');
});

test('contractility drives ejection fraction, independent of the disease trajectory', () => {
  // Holding the whole circulation still and moving only Ees must move EF.
  const base = circulationParameters(0.42);
  const efFor = (ees) => {
    const parameters = { ...base, lv: { ...base.lv, ees } };
    return solveSteadyState(parameters).cycle.ejectionFraction;
  };
  const weak = efFor(base.lv.ees * 0.7);
  const same = efFor(base.lv.ees);
  const strong = efFor(base.lv.ees * 1.4);
  assert.ok(weak < same && same < strong, 'EF must follow end-systolic elastance');
});

test('the pressure-volume loop closes and meets the relationships that generate it', () => {
  for (const p of [0, 0.42, 1]) {
    const { loop, endSystolic, endDiastolic, markers } = pressureVolumeCurves(p);
    const h = sampleHemodynamics(p);

    // A closed loop: the beat returns to where it started.
    const first = loop[0];
    const last = loop[loop.length - 1];
    assert.ok(Math.abs(first.volume - last.volume) < 1.5, `loop does not close in volume at ${p}`);

    // The loop spans exactly the volumes the read-out reports.
    const volumes = loop.map((point) => point.volume);
    assert.ok(Math.abs(Math.max(...volumes) - h.edvMl) < 0.05, `loop maximum is not EDV at ${p}`);
    assert.ok(Math.abs(Math.min(...volumes) - h.esvMl) < 0.05, `loop minimum is not ESV at ${p}`);

    // Its top-left corner sits on the end-systolic elastance line and its
    // bottom-right corner on the end-diastolic relation — because those are the
    // equations the solver integrated, not because a curve was fitted.
    const peak = Math.max(...loop.map((point) => point.pressure));
    assert.ok(
      Math.abs(markers.endSystole.pressure - peak) < peak * 0.05,
      `the loop should reach the end-systolic line at ${p}`
    );
    const onEdpvr = interpolateAt(endDiastolic, markers.endDiastole.volume);
    assert.ok(
      Math.abs(onEdpvr - markers.endDiastole.pressure) < 1.5,
      `end-diastole should sit on the end-diastolic relation at ${p}`
    );
    // Both relationships rise with volume, as any elastance must.
    for (const curve of [endSystolic, endDiastolic]) {
      for (let i = 1; i < curve.length; i++) {
        assert.ok(curve[i].pressure >= curve[i - 1].pressure - 1e-9, `relationship must not fall at ${p}`);
      }
    }
  }
});

test('congestion is read from pressure, against fixed landmarks', () => {
  // The overlay is driven by a solved pressure, so the two thresholds are the
  // only place a judgement is made — and they are the clinical landmarks, not a
  // level tied to a structural stage.
  assert.equal(congestionFromPressure(0).front, 0);
  assert.equal(congestionFromPressure(10).front, 0);
  assert.ok(congestionFromPressure(25).front > 0.99);
  // Interstitial fluid appears only well above the pressure at which the front
  // starts to spread, and never before it.
  assert.equal(congestionFromPressure(18).fluid, 0);
  assert.ok(congestionFromPressure(28).fluid > 0.99);
  for (let mmHg = 0; mmHg <= 40; mmHg += 0.5) {
    const { front, fluid } = congestionFromPressure(mmHg);
    assert.ok(front >= 0 && front <= 1 && fluid >= 0 && fluid <= 1, `out of range at ${mmHg} mmHg`);
    assert.ok(fluid <= front + 1e-9, `fluid must never outrun the pressure front at ${mmHg} mmHg`);
  }
});

test('the solver is deterministic and converged', () => {
  const a = solve(0.6);
  const b = solve(0.6);
  assert.equal(a.cycle.edv, b.cycle.edv, 'the same parameters must give the same beat');
  assert.equal(a.cycle.ejectionFraction, b.cycle.ejectionFraction);
  assert.ok(a.beats > 1 && a.beats < 240, 'the solve should settle without hitting the beat cap');

  // Integration error: a much finer step must not move the answer, or the
  // displayed figures would be a property of the step size rather than of the
  // model. This is what lets the default be chosen for responsiveness.
  const coarse = solveSteadyState(circulationParameters(0.6), { stepsPerBeat: 240 });
  const fine = solveSteadyState(circulationParameters(0.6), { stepsPerBeat: 1920 });
  assert.ok(
    Math.abs(coarse.cycle.ejectionFraction - fine.cycle.ejectionFraction) < 0.005,
    'ejection fraction must not depend on the integration step'
  );
  assert.ok(
    Math.abs(coarse.cycle.edv - fine.cycle.edv) < 1.5,
    'end-diastolic volume must not depend on the integration step'
  );
});

test('stroke volume out of the left heart matches what the aortic valve passes', () => {
  // Independent of EDV - ESV: one is the chamber emptying, the other is the
  // integral of the flow that left it. They agree only if the ODEs are right.
  for (const p of [0, 0.42, 1]) {
    const { cycle } = solve(p);
    assert.ok(
      Math.abs(cycle.ejectedVolume - cycle.strokeVolume) < 0.5,
      `ejected volume and stroke volume disagree at ${p}`
    );
  }
});

/** Linear read of a sampled relationship at a volume. */
function interpolateAt(curve, volume) {
  for (let i = 1; i < curve.length; i++) {
    if (curve[i].volume >= volume) {
      const span = curve[i].volume - curve[i - 1].volume;
      const t = span > 0 ? (volume - curve[i - 1].volume) / span : 0;
      return curve[i - 1].pressure + (curve[i].pressure - curve[i - 1].pressure) * t;
    }
  }
  return curve[curve.length - 1].pressure;
}
