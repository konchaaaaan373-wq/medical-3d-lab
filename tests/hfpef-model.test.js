import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HFPEF_LIMITS,
  HFPEF_REFERENCE,
  hfpefParameters,
  hfpefPressureVolume,
  solveHfpef,
} from '../src/models/hfpef.js';

test('HFpEF model: states remain finite and internally consistent across the full surface', () => {
  for (let i = 0; i <= 20; i++) {
    const stiffness = i / 20;
    for (const filling of [HFPEF_LIMITS.filling.min, 1, HFPEF_LIMITS.filling.max]) {
      const state = solveHfpef({ stiffness, filling });
      for (const [key, value] of Object.entries(state)) {
        assert.ok(Number.isFinite(value), `${key} is not finite at stiffness=${stiffness}, filling=${filling}`);
      }
      assert.ok(state.endSystolicVolumeMl > 0);
      assert.ok(state.endDiastolicVolumeMl > state.endSystolicVolumeMl);
      assert.ok(Math.abs(state.strokeVolumeMl - (state.endDiastolicVolumeMl - state.endSystolicVolumeMl)) < 1e-10);
      assert.ok(Math.abs(state.ejectionFraction - state.strokeVolumeMl / state.endDiastolicVolumeMl) < 1e-12);
      assert.ok(Math.abs(state.cardiacOutputLMin - state.strokeVolumeMl * state.heartRatePerMin / 1000) < 1e-12);
      assert.ok(state.ejectionFraction > 0 && state.ejectionFraction < 1);
      assert.ok(state.endDiastolicPressureMmHg >= 0);
    }
  }
});

test('HFpEF model: stiffness changes passive mechanics rather than masquerading as HFrEF', () => {
  const normal = hfpefParameters(0);
  const stiff = hfpefParameters(1);
  assert.ok(stiff.edpvrBPerMl > normal.edpvrBPerMl, 'passive EDPVR should become steeper');
  assert.ok(stiff.wallThicknessMm > normal.wallThicknessMm, 'concentric structural cue should increase');
  assert.ok(stiff.endSystolicElastanceMmHgMl >= normal.endSystolicElastanceMmHgMl,
    'this teaching axis must not create systolic failure by lowering Ees');
});

test('HFpEF model: baseline is a plausible preserved-EF reference calibration', () => {
  const state = solveHfpef();
  assert.equal(state.endDiastolicVolumeMl, HFPEF_REFERENCE.endDiastolicVolumeMl);
  assert.ok(state.ejectionFraction >= 0.55 && state.ejectionFraction <= 0.7, `EF ${state.ejectionFraction}`);
  assert.ok(state.endDiastolicPressureMmHg >= 5 && state.endDiastolicPressureMmHg <= 12,
    `LVEDP ${state.endDiastolicPressureMmHg}`);
});

test('HFpEF model: filling input is bounded and raises EDV monotonically', () => {
  const low = solveHfpef({ stiffness: 0.6, filling: -10 });
  const mid = solveHfpef({ stiffness: 0.6, filling: 1 });
  const high = solveHfpef({ stiffness: 0.6, filling: 10 });
  assert.equal(low.filling, HFPEF_LIMITS.filling.min);
  assert.equal(high.filling, HFPEF_LIMITS.filling.max);
  assert.ok(low.endDiastolicVolumeMl < mid.endDiastolicVolumeMl && mid.endDiastolicVolumeMl < high.endDiastolicVolumeMl);
  assert.ok(low.endDiastolicPressureMmHg < mid.endDiastolicPressureMmHg && mid.endDiastolicPressureMmHg < high.endDiastolicPressureMmHg);
});

test('HFpEF model: PV loop corners and source curves agree with the solved state', () => {
  for (const stiffness of [0, 0.5, 1]) {
    const state = solveHfpef({ stiffness, filling: 1.04 });
    const pv = hfpefPressureVolume(stiffness, 1.04);
    assert.ok(pv.loop.length > 40);
    assert.ok(pv.endDiastolic.length > 40 && pv.endSystolic.length > 40);
    assert.equal(pv.markers.endDiastole.volume, state.endDiastolicVolumeMl);
    assert.equal(pv.markers.endDiastole.pressure, state.endDiastolicPressureMmHg);
    assert.equal(pv.markers.endSystole.volume, state.endSystolicVolumeMl);
    assert.equal(pv.markers.endSystole.pressure, state.endSystolicPressureMmHg);
    for (const point of [...pv.loop, ...pv.endDiastolic, ...pv.endSystolic]) {
      assert.ok(Number.isFinite(point.volume) && Number.isFinite(point.pressure));
      assert.ok(point.volume >= 0 && point.pressure >= 0);
    }
  }
});
