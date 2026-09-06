import test from 'node:test';
import assert from 'node:assert/strict';
import { circulationParameters } from '../src/scenes/cardiovascular/scenes/heartFailure/hemodynamics.js';
import { solveSteadyState } from '../src/models/cardiacMechanics.js';

function copyReference() {
  const base = circulationParameters(0);
  return { ...base, lv: { ...base.lv } };
}

function solve(mutator = () => {}) {
  const parameters = copyReference();
  mutator(parameters);
  return solveSteadyState(parameters).cycle;
}

test('physiology: raising preload raises end-diastolic volume and stroke volume', () => {
  const reference = solve();
  const higherPreload = solve((parameters) => {
    parameters.circulatingVolume *= 1.08;
  });

  assert.ok(higherPreload.edv > reference.edv, 'more filling should raise end-diastolic volume');
  assert.ok(higherPreload.strokeVolume > reference.strokeVolume, 'Frank-Starling recruitment should raise stroke volume');
});

test('physiology: raising afterload reduces stroke volume at fixed contractility', () => {
  const reference = solve();
  const higherAfterload = solve((parameters) => {
    parameters.systemicResistance *= 1.35;
  });

  assert.ok(higherAfterload.strokeVolume < reference.strokeVolume, 'higher afterload should reduce ejection');
  assert.ok(higherAfterload.esv > reference.esv, 'more blood should remain at end-systole');
});

test('physiology: reducing contractility lowers ejection fraction and raises end-systolic volume', () => {
  const reference = solve();
  const lowerContractility = solve((parameters) => {
    parameters.lv.ees *= 0.7;
  });

  assert.ok(lowerContractility.ejectionFraction < reference.ejectionFraction, 'lower Ees should lower EF');
  assert.ok(lowerContractility.esv > reference.esv, 'lower contractility should leave a larger end-systolic volume');
});

test('physiology: greater left-sided filling raises both atrial and pulmonary venous pressure', () => {
  const reference = solve();
  const fullerCirculation = solve((parameters) => {
    parameters.circulatingVolume *= 1.12;
  });

  assert.ok(fullerCirculation.meanAtrialPressure > reference.meanAtrialPressure, 'left atrial pressure should rise');
  assert.ok(
    fullerCirculation.meanPulmonaryVenousPressure > reference.meanPulmonaryVenousPressure,
    'the pulmonary venous compartment should share the higher left-sided filling pressure'
  );
});
