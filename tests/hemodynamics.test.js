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
    { at: 0, ef: [0.55, 0.62], edv: [108, 126], lvedp: [6, 10], pvp: [7, 13] },
    { at: 0.18, ef: [0.55, 0.65], edv: [100, 118], lvedp: [9, 15], pvp: [11, 18] },
    { at: 0.42, ef: [0.33, 0.44], edv: [154, 178], lvedp: [14, 21], pvp: [15, 22] },
    { at: 0.64, ef: [0.23, 0.33], edv: [192, 216], lvedp: [19, 27], pvp: [20, 28] },
    { at: 1, ef: [0.15, 0.25], edv: [238, 264], lvedp: [28, 37], pvp: [27, 35] },
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
  assert.equal(congestionFromPressure(12).front, 0);
  assert.ok(congestionFromPressure(30).front > 0.99);
  // Interstitial fluid appears only well above the pressure at which the front
  // starts to spread, and never before it.
  assert.equal(congestionFromPressure(22).fluid, 0);
  assert.ok(congestionFromPressure(32).fluid > 0.99);
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

test('the pressure waveforms are the same beat the loop is, and the valve events line up', () => {
  for (const p of [0, 0.42, 1]) {
    const { waveform } = pressureVolumeCurves(p);
    const h = sampleHemodynamics(p);
    const n = waveform.phase.length;
    for (const key of ['ventricular', 'arterial', 'atrial']) {
      assert.equal(waveform[key].length, n, `${key} trace has a different length at ${p}`);
      assert.ok(waveform[key].every(Number.isFinite), `${key} trace has a non-finite value at ${p}`);
    }
    assert.ok(
      Math.abs(waveform.cycleLengthSeconds - 60 / h.hr) < 1e-9,
      `the beat should last 60/HR seconds at ${p}`
    );
    assert.equal(waveform.ejection.from, h.ejectionStartPhase);
    assert.equal(waveform.ejection.to, h.ejectionEndPhase);

    // The shaded band is drawn from the solved flows; the two lines crossing is
    // what a reader sees. They have to be the same event, or the picture would
    // be telling a different story from the model.
    for (let i = 0; i < n; i++) {
      const phase = waveform.phase[i];
      const inside = phase > waveform.ejection.from + 0.02 && phase < waveform.ejection.to - 0.02;
      if (!inside) continue;
      assert.ok(
        waveform.ventricular[i] >= waveform.arterial[i] - 1e-9,
        `ventricular pressure should be at or above arterial while ejecting, at ${phase} (progress ${p})`
      );
    }
    // And outside it — with the isovolumic periods excluded, since that is
    // exactly where ventricular pressure crosses the arterial line.
    for (let i = 0; i < n; i++) {
      const phase = waveform.phase[i];
      if (phase > waveform.ejection.from - 0.02 && phase < waveform.ejection.to + 0.12) continue;
      assert.ok(
        waveform.ventricular[i] < waveform.arterial[i],
        `the aortic valve should be shut at ${phase} (progress ${p})`
      );
    }
  }
});

test('filling is driven by the atrium being at the higher pressure', () => {
  // Not a decorative third line: the mitral valve opens because left atrial
  // pressure exceeds ventricular pressure, and that is what the raised atrial
  // trace in the failing beat is showing.
  //
  // Checked against the valve rather than against a stretch of the cycle,
  // because diastole is not one continuous fill: an early wave, then diastasis
  // with the valve shut while the atrium refills from the pulmonary veins, then
  // the atrial kick reopening it. A phase window would have to guess where
  // those fall; the flow does not.
  for (const p of [0, 0.42, 0.85, 1]) {
    const parameters = circulationParameters(p);
    let open = 0;
    const inflow = [];
    walkBeat(solve(p), parameters, 480, ({ phase, pressures, flows }) => {
      if (flows.mitral > 0) {
        open++;
        assert.ok(
          pressures.la >= pressures.lv,
          `the atrium must be the higher pressure while the mitral valve is open, at ${phase} (progress ${p})`
        );
      }
      inflow.push(flows.mitral);
    });
    assert.ok(open > 40, `the mitral valve should be open for a real part of the beat at ${p}`);

    // Filling is not one smooth ramp: an early wave as the ventricle relaxes,
    // then the atrial kick. That shows up as inflow rising again after it has
    // been falling — stated without naming a phase, because where diastasis
    // lands moves with heart rate and with how stiff the ventricle is.
    const peak = inflow.indexOf(Math.max(...inflow));
    let trough = Infinity;
    let rebound = 0;
    for (let i = peak; i < inflow.length; i++) {
      // The largest rise above any preceding low, kept across the whole of
      // diastole — inflow returns to zero at the end of the beat, so a running
      // figure that reset at each new low would forget the kick it just saw.
      trough = Math.min(trough, inflow[i]);
      rebound = Math.max(rebound, inflow[i] - trough);
    }
    assert.ok(rebound > 5, `the atrial kick should show as a second filling wave at ${p}`);
  }
});

test('the simulated failing state opens its aortic valve later than the normal one', () => {
  // Along this trajectory a lower end-systolic elastance takes longer to raise
  // ventricular pressure to aortic, so the valve opens later in the cycle and
  // the gap before the shaded band grows. Nothing sets this; it falls out of the
  // elastance model.
  //
  // It is a property of these two simulated states, not a general fact about
  // HFrEF: isovolumic contraction time in real patients also moves with heart
  // rate, loading, conduction and contractile reserve, and this model varies
  // only some of those.
  const early = sampleHemodynamics(0).ejectionStartPhase;
  const late = sampleHemodynamics(1).ejectionStartPhase;
  assert.ok(late > early, 'ejection should begin later in the simulated failing state');
  // Both still leave most of the cycle for ejection and filling.
  assert.ok(early > 0 && late < 0.2, 'isovolumic contraction should stay a small part of the beat');
});

// ---------------------------------------------------------------------------
// Calibration of the low-pressure side.
//
// These exist because of a specific defect: a left atrium compliant enough that
// almost all of its pressure came from its own contraction. That gave an a-wave
// and essentially no v-wave, held mean atrial pressure several mmHg below left
// ventricular end-diastolic pressure, and left the pulmonary side only loosely
// coupled to the ventricle it is meant to be backing up behind.
// ---------------------------------------------------------------------------

test('the normal state sits in the normal range on the low-pressure side too', () => {
  const normal = sampleHemodynamics(0);
  const within = (value, [low, high], label) =>
    assert.ok(value >= low && value <= high, `${label} = ${value.toFixed(1)} outside [${low}, ${high}]`);

  // A healthy ventricle does not fill at zero pressure. Ranges are the usual
  // resting ones, deliberately wide: what is being guarded is that the model is
  // calibrated at all, not that it hits a particular figure.
  within(normal.endDiastolicPressureMmHg, [6, 10], 'normal LVEDP');
  within(normal.meanAtrialPressureMmHg, [6, 12], 'normal mean LA pressure');
  within(normal.meanPulmonaryVenousPressureMmHg, [6, 13], 'normal mean pulmonary venous pressure');
  within(normal.meanPulmonaryArterialPressureMmHg, [10, 20], 'normal mean pulmonary arterial pressure');

  // Mean atrial pressure tracking end-diastolic pressure is the relationship
  // that makes a wedge pressure a useful proxy for it. A large gap in either
  // direction would mean the two are not really connected in the model.
  assert.ok(
    Math.abs(normal.meanAtrialPressureMmHg - normal.endDiastolicPressureMmHg) < 3,
    'mean atrial pressure should sit close to LV end-diastolic pressure in a normal heart'
  );
});

test('the left atrial trace has a v-wave, and it is the larger of the two', () => {
  // In the left atrium the v-wave — the atrium filling from the pulmonary veins
  // against a shut mitral valve — is normally at least as tall as the a-wave.
  // A model whose atrium is too compliant produces the opposite, because the
  // only thing that can raise its pressure is its own contraction.
  for (const p of [0, 0.85]) {
    const parameters = circulationParameters(p);
    const h = sampleHemodynamics(p);
    let vWave = -Infinity;
    let aWave = -Infinity;
    let trough = Infinity;
    walkBeat(solve(p), parameters, 480, ({ phase, pressures }) => {
      trough = Math.min(trough, pressures.la);
      // The v-wave peaks around the end of ejection, the a-wave late in diastole.
      if (phase > h.ejectionStartPhase && phase < h.ejectionEndPhase + 0.15) {
        vWave = Math.max(vWave, pressures.la);
      }
      if (phase > 0.8) aWave = Math.max(aWave, pressures.la);
    });
    assert.ok(vWave > aWave, `the v-wave should be the taller of the two at ${p}`);
    assert.ok(vWave - trough > 3, `the atrial trace should have real waves, not a flat line, at ${p}`);
    assert.ok(
      aWave - trough > 1,
      `the atrial kick should still be visible in the pressure trace at ${p}`
    );
  }
});

test('the pulmonary side follows left atrial pressure, continuously', () => {
  // The overlay is driven by mean pulmonary venous pressure rather than by LV
  // end-diastolic pressure directly, and both of those come out of the same
  // solution. What must hold is that the chain is actually connected: as
  // atrial pressure rises, so does the pressure just upstream of it, and so
  // does the overlay — with no step anywhere.
  const states = SWEEP.slice().sort((a, b) => a - b).map((p) => ({ p, h: sampleHemodynamics(p) }));
  let previousLa = -Infinity;
  let previousPvp = -Infinity;
  let previousFront = -Infinity;
  for (const { p, h } of states) {
    assert.ok(h.meanAtrialPressureMmHg >= previousLa - 0.2, `atrial pressure should not fall back at ${p}`);
    assert.ok(h.meanPulmonaryVenousPressureMmHg >= previousPvp - 0.2, `pulmonary venous pressure should not fall back at ${p}`);
    assert.ok(h.congestionLevel >= previousFront - 1e-9, `the overlay should not fall back at ${p}`);
    // Pressure is transmitted upstream, so the vein is always above the atrium.
    assert.ok(
      h.meanPulmonaryVenousPressureMmHg > h.meanAtrialPressureMmHg,
      `the pulmonary vein must stay above the atrium at ${p}`
    );
    previousLa = h.meanAtrialPressureMmHg;
    previousPvp = h.meanPulmonaryVenousPressureMmHg;
    previousFront = h.congestionLevel;
  }

  // The contradiction this is here to prevent: an atrium in the twenties with
  // nothing happening on the pulmonary side. Any such state must show a
  // substantial overlay — the overlay hides itself below 0.02.
  const raised = states.filter(({ h }) => h.meanAtrialPressureMmHg >= 20);
  assert.ok(raised.length > 0, 'the trajectory should reach a raised atrial pressure at all');
  for (const { p, h } of raised) {
    assert.ok(
      h.congestionLevel > 0.5,
      `mean LA pressure of ${h.meanAtrialPressureMmHg.toFixed(1)} mmHg must show on the pulmonary side (at ${p})`
    );
  }
  // And the converse: a normal atrium shows nothing at all.
  assert.equal(sampleHemodynamics(0).congestionLevel, 0);
  assert.equal(sampleHemodynamics(0).interstitialFluidLevel, 0);
});

test('the drawn valve events are the ones the flows actually produce', () => {
  // Both plots mark the same two moments — the shaded ejection band on the
  // waveform, the corners of the loop — and both take them from the state's
  // ejection window. That window has to be exactly where the aortic valve is
  // open, or the picture would be marking something the model did not do.
  for (const p of [0, 0.42, 0.85, 1]) {
    const parameters = circulationParameters(p);
    const h = sampleHemodynamics(p);
    let firstOpen = null;
    let lastOpen = null;
    let openOutside = 0;
    walkBeat(solve(p), parameters, 480, ({ phase, flows }) => {
      if (flows.aortic <= 0) {
        // Nothing may leave the ventricle outside the band that is drawn.
        return;
      }
      if (firstOpen === null) firstOpen = phase;
      lastOpen = phase;
      if (phase < h.ejectionStartPhase - 0.01 || phase > h.ejectionEndPhase + 0.01) openOutside++;
    });
    assert.equal(openOutside, 0, `the aortic valve is open outside the drawn band at ${p}`);
    // The solver records the window at its own step size; the check runs at a
    // finer one, so they agree to within a step rather than exactly.
    assert.ok(Math.abs(firstOpen - h.ejectionStartPhase) < 0.01, `band starts off the valve at ${p}`);
    assert.ok(Math.abs(lastOpen - h.ejectionEndPhase) < 0.01, `band ends off the valve at ${p}`);
    // And the volume the band accounts for is the stroke volume.
    assert.ok(
      Math.abs(h.esvMl - cavityVolumeAt(h.ejectionEndPhase, h)) < 0.5,
      `the end of the band should be end-systolic volume at ${p}`
    );
  }
});
