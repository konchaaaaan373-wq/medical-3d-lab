import test from 'node:test';
import assert from 'node:assert/strict';
import { HEMODYNAMICS, STAGES } from '../src/data/heartFailure.js';
import {
  sampleHemodynamics,
  cavityVolumeAt,
  ventricleShape,
  myocardialVolumeFor,
  radiusForVolume,
  advanceCardiacPhase,
  SYSTOLE_FRACTION,
} from '../src/scenes/heartFailure/hemodynamics.js';
import { COMPARISON_OFFSET } from '../src/scenes/heartFailure/HeartFailureScene.js';

/** Fine sweep across the whole slider, including every keyframe boundary. */
const SWEEP = [];
for (let i = 0; i <= 400; i++) SWEEP.push(i / 400);
for (const kf of HEMODYNAMICS) SWEEP.push(kf.at);
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
      h.fillingPressureIndex >= 0 && h.fillingPressureIndex <= 1,
      `filling pressure index out of range at ${p}`
    );
  }
});

test('the failing ventricle does not pump more than the healthy one', () => {
  // The bug this guards against: interpolating EDV and ESV independently once
  // produced a stroke volume and cardiac output that ROSE as failure advanced.
  const normal = sampleHemodynamics(0);
  let previousSv = Infinity;
  for (const p of SWEEP.slice().sort((a, b) => a - b)) {
    const h = sampleHemodynamics(p);
    assert.ok(
      h.strokeVolumeMl <= previousSv + 1e-9,
      `stroke volume must not rise as remodelling advances (at ${p})`
    );
    assert.ok(
      h.strokeVolumeMl <= normal.strokeVolumeMl + 1e-9,
      `stroke volume must never exceed the healthy value (at ${p})`
    );
    // Resting cardiac output is broadly maintained in chronic HFrEF, but it
    // must never become supranormal.
    assert.ok(
      h.cardiacOutputLMin <= normal.cardiacOutputLMin * 1.1,
      `cardiac output must not become supranormal (at ${p})`
    );
    previousSv = h.strokeVolumeMl;
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
  assert.ok(byId.congestion.ejectionFraction < byId['systolic-dysfunction'].ejectionFraction);
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
  const tolerance = 1e-6;
  for (let i = 0; i <= 200; i++) {
    const phase = i / 200;
    const v = cavityVolumeAt(phase, h);
    assert.ok(v >= h.esvMl - tolerance && v <= h.edvMl + tolerance, `volume out of range at phase ${phase}`);
  }
  assert.ok(Math.abs(cavityVolumeAt(0, h) - h.edvMl) < tolerance, 'cycle should start at end-diastole');
  assert.ok(
    Math.abs(cavityVolumeAt(SYSTOLE_FRACTION - 1e-6, h) - h.esvMl) < 1e-3,
    'end of systole should reach end-systolic volume'
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
    'fillingPressureIndex',
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
