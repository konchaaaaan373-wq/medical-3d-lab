import test from 'node:test';
import assert from 'node:assert/strict';
import { CIRCULATION_INTERVENTIONS, solveCirculation } from '../src/models/circulation.js';

/**
 * Layer 1 — external physiology.
 *
 * These tests defend directions supported by the cited clinical literature,
 * never the response sizes selected for this repository. Exact multipliers,
 * the MAP target and all absolute outputs belong in calibration.test.js.
 */

test('physiology: a preload-responsive fluid state raises stroke volume and cardiac output', () => {
  const before = solveCirculation({ intervention: CIRCULATION_INTERVENTIONS.BASELINE });
  const responsive = solveCirculation({ intervention: CIRCULATION_INTERVENTIONS.FLUID });

  assert.ok(responsive.strokeVolumeMl > before.strokeVolumeMl);
  assert.ok(responsive.cardiacOutputLMin > before.cardiacOutputLMin);
});

test('physiology: dobutamine can raise stroke volume and cardiac output while systemic resistance falls', () => {
  const before = solveCirculation({ intervention: CIRCULATION_INTERVENTIONS.BASELINE });
  const dobutamine = solveCirculation({ intervention: CIRCULATION_INTERVENTIONS.DOBUTAMINE });

  assert.ok(dobutamine.strokeVolumeMl > before.strokeVolumeMl);
  assert.ok(dobutamine.cardiacOutputLMin > before.cardiacOutputLMin);
  assert.ok(dobutamine.systemicVascularResistanceDynSCm5 < before.systemicVascularResistanceDynSCm5);
});
