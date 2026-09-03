import test from 'node:test';
import assert from 'node:assert/strict';
import {
  diastolicPressureAtVolume,
  solveHfpef,
} from '../src/models/hfpef.js';

test('physiology: increasing passive LV stiffness shifts the EDPVR upward at the same volume', () => {
  for (const volumeMl of [100, 110, 120, 130]) {
    const compliant = diastolicPressureAtVolume(volumeMl, 0);
    const stiff = diastolicPressureAtVolume(volumeMl, 1);
    assert.ok(stiff > compliant, `stiff LV did not require more pressure at ${volumeMl} mL`);
  }
});

test('physiology: elevated filling pressure can coexist with preserved ejection fraction', () => {
  const reference = solveHfpef({ stiffness: 0, filling: 1 });
  const stiff = solveHfpef({ stiffness: 1, filling: 1 });

  assert.ok(reference.ejectionFraction >= 0.5, 'reference EF should be preserved');
  assert.ok(stiff.ejectionFraction >= 0.5, 'stiff-ventricle EF should remain preserved');
  assert.ok(stiff.endDiastolicPressureMmHg > reference.endDiastolicPressureMmHg * 1.5,
    'filling pressure should rise substantially despite preserved EF');
});

test('physiology: a filling challenge raises pressure more steeply in the stiff ventricle', () => {
  const delta = (stiffness) => {
    const base = solveHfpef({ stiffness, filling: 1 });
    const loaded = solveHfpef({ stiffness, filling: 1.08 });
    return loaded.endDiastolicPressureMmHg - base.endDiastolicPressureMmHg;
  };

  assert.ok(delta(1) > delta(0) * 1.5, 'stiff LV should pay a larger pressure cost for the same added filling');
});
