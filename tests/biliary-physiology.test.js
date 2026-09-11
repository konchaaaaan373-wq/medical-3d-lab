import test from 'node:test';
import assert from 'node:assert/strict';

import {
  OBSTRUCTION_SITES,
  REFERENCE,
  solveBiliaryObstruction,
} from '../src/models/biliaryObstruction.js';

/**
 * Constraints the physiology imposes on any model of biliary outflow, checked
 * without reference to anything this repository chose.
 *
 * These are **Layer 1**: a failure here licenses the sentence "the model has
 * broken a constraint the physiology imposes". None of them mentions a
 * calibration constant, a caption or a stored answer, and every one of them
 * would still be true if this repository did not exist.
 *
 * The propositions are the ones the scene exists to teach, and the reason they
 * are tests rather than prose is that an earlier draft of a duct model can be
 * internally consistent and still say that a cystic-duct stone causes jaundice.
 */

const blocked = (site, completeness = 1, extra = {}) =>
  solveBiliaryObstruction({ site, completeness, ...extra });

test('physiology: a blockage off the bile path does not reduce what reaches the gut', () => {
  // The gallbladder is a dead end. Bile leaving the liver never passes through
  // it on the way to the duodenum, so occluding the duct that leads to it
  // cannot reduce the flow along a path it is not on. This is the whole reason
  // a cystic-duct stone is not an obstructive-jaundice problem.
  const open = blocked('none');
  for (const completeness of [0.25, 0.5, 0.75, 1]) {
    const cystic = blocked('cystic-duct', completeness);
    assert.equal(
      cystic.bileToDuodenumMlPerMin.toFixed(6),
      open.bileToDuodenumMlPerMin.toFixed(6),
      `cystic duct at ${completeness}`
    );
    assert.equal(
      cystic.pressure['common-bile-duct'].toFixed(6),
      open.pressure['common-bile-duct'].toFixed(6),
      `common bile duct pressure at ${completeness}`
    );
  }
});

test('physiology: a blockage on the bile path raises the pressure above it and not below it', () => {
  // Pressure at a point is the flow times the resistance still downstream of
  // it. A resistance inserted low down is downstream of everything above it and
  // of nothing below it, so the segments above are pressurised and the segments
  // below are not — which is why the site decides the picture.
  const open = blocked('none');
  const low = blocked('common-bile-duct');

  for (const segment of ['right-hepatic-duct', 'left-hepatic-duct', 'common-hepatic-duct', 'common-bile-duct']) {
    assert.ok(
      low.pressure[segment] > open.pressure[segment] * 2,
      `${segment}: ${open.pressure[segment]} -> ${low.pressure[segment]}`
    );
  }
  // The pancreatic duct is below the junction and on its own path entirely.
  assert.equal(
    low.pressure['pancreatic-duct'].toFixed(6),
    open.pressure['pancreatic-duct'].toFixed(6)
  );
});

test('physiology: only a blockage at the shared sphincter reaches the pancreatic duct', () => {
  // The sphincter is the one resistance the two paths have in common. A
  // blockage anywhere else in the biliary tree is not on the pancreatic path,
  // and pressure cannot reach a path a resistance is not on.
  const open = blocked('none');
  for (const { id } of OBSTRUCTION_SITES) {
    const state = blocked(id);
    const reaches = state.pressure['pancreatic-duct'] > open.pressure['pancreatic-duct'] * 1.25;
    assert.equal(reaches, id === 'ampulla', `${id} reaching the pancreatic duct`);
  }
});

test('physiology: an open cystic duct puts the gallbladder at the pressure of the duct it hangs off', () => {
  // A dead end at equilibrium is at the pressure of whatever it opens into. So
  // a distal blockage distends the gallbladder as well — and an occluded cystic
  // duct is precisely what stops it hearing about that.
  const distal = blocked('common-bile-duct');
  assert.equal(
    distal.gallbladderPressureCmH2O.toFixed(6),
    distal.pressure['common-bile-duct'].toFixed(6)
  );
  assert.ok(distal.gallbladderVolumeMl > blocked('none').gallbladderVolumeMl * 1.5);

  const cystic = blocked('cystic-duct');
  assert.equal(cystic.gallbladderConnected, false);
  assert.equal(
    cystic.gallbladderVolumeMl.toFixed(6),
    blocked('none').gallbladderVolumeMl.toFixed(6),
    'a gallbladder cut off from the duct does not follow it'
  );
});

test('physiology: secretion gives way against pressure, so a complete blockage is bounded', () => {
  // Hepatic bile secretion is not a pump. It falls as duct pressure rises and
  // ceases at a ceiling, so a complete obstruction produces a pressure that
  // approaches that ceiling and a flow that approaches zero — never a pressure
  // that runs away. A model without this would have to be stopped by hand.
  const complete = blocked('common-bile-duct', 1);
  assert.ok(complete.bileToDuodenumMlPerMin > 0, 'flow approaches zero rather than reversing');
  assert.ok(complete.bileDeliveredFraction < 0.15, complete.bileDeliveredFraction);
  const ceiling = REFERENCE.maxSecretoryPressureCmH2O;
  assert.ok(complete.pressure['common-bile-duct'] < ceiling, `${complete.pressure['common-bile-duct']} < ${ceiling}`);
  assert.ok(complete.pressure['common-bile-duct'] > ceiling * 0.8, 'and climbs most of the way to it');

  // Secreting harder against a complete blockage raises the pressure towards
  // the same ceiling and does not deliver more: the ceiling is a property of
  // the secretion, not of how much of it there is.
  const harder = blocked('common-bile-duct', 1, { hepaticSecretion: 1.6 });
  assert.ok(harder.pressure['common-bile-duct'] < ceiling);
  assert.ok(harder.bileDeliveredFraction < 0.3, harder.bileDeliveredFraction);
});

test('physiology: a gallbladder keeps up with the duct on a time constant, not on an equilibrium', () => {
  // Given forever, a dead end behind any finite resistance equalises. Whether
  // it keeps up with a meal is a question about the resistance times the
  // compliance — the same τ = R·C the obstructed lung is built on — and that is
  // why a cystic duct does not have to be nearly shut to cut a gallbladder off.
  const open = blocked('none');
  assert.ok(open.gallbladderTimeConstantMin < REFERENCE.gallbladderWindowMin, open.gallbladderTimeConstantMin);

  let previous = 0;
  for (const completeness of [0, 0.2, 0.4, 0.6, 0.8, 1]) {
    const state = blocked('cystic-duct', completeness);
    assert.ok(state.gallbladderTimeConstantMin > previous, `${completeness}: ${state.gallbladderTimeConstantMin}`);
    previous = state.gallbladderTimeConstantMin;
  }
  assert.equal(blocked('cystic-duct', 1).gallbladderConnected, false);
});
