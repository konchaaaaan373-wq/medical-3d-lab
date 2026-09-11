import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CONTROLS,
  REST_SHARES,
  solveProstaticEnlargement,
} from '../src/models/prostaticEnlargement.js';

/**
 * Layer 1 — what this model asserts about prostates rather than about itself.
 *
 * There is very little physiology in this scene and a great deal of geometry,
 * which is exactly why these tests are worth writing: the propositions below
 * are the ones a reader is meant to leave with, and every one of them is a
 * statement about the world that would still be true if this repository did
 * not exist. None of them reads a constant this repository chose.
 */

test('physiology: what enlarges is the transition zone, and nothing is added to the peripheral zone', () => {
  // The single most common way this disease is drawn wrongly is as a gland
  // that gets uniformly bigger. It is not, and the model must not permit it.
  const rest = solveProstaticEnlargement();
  const grown = solveProstaticEnlargement({ transitionGrowth: 6 });

  assert.ok(grown.transitionVolumeRatio > 5.9, 'the transition zone is what grew');

  // The peripheral zone's share falls because the gland grew around it, not
  // because anything was taken out of it: its absolute volume is unchanged.
  const peripheralVolume = (solved) => solved.zoneShares.peripheral * solved.glandVolumeRatio;
  assert.ok(
    Math.abs(peripheralVolume(grown) - peripheralVolume(rest)) < 1e-9,
    'the peripheral zone contains what it always contained'
  );
  assert.ok(grown.zoneShares.peripheral < rest.zoneShares.peripheral, 'but it is a smaller share of the gland');

  // And the central zone is not the site either.
  const centralVolume = (solved) => solved.zoneShares.central * solved.glandVolumeRatio;
  assert.ok(Math.abs(centralVolume(grown) - centralVolume(rest)) < 1e-9, 'the central zone is not the site');

  // At rest the peripheral zone is the larger part of the gland, which is the
  // arrangement the first stage is about.
  assert.ok(rest.zoneShares.peripheral > 0.5, 'at rest the outside is most of the gland');
  assert.ok(rest.zoneShares.transition < rest.zoneShares.peripheral, 'and the transition zone is the small one');
});

test('physiology: the rim thins while the tissue in it is conserved', () => {
  // The compressed peripheral zone — the plane an enucleation proceeds in. A
  // model that thinned it by removing tissue would be teaching atrophy.
  let previousRim = Infinity;
  for (const growth of [1, 2, 4, 8, 12]) {
    const solved = solveProstaticEnlargement({ transitionGrowth: growth });
    assert.ok(solved.peripheralRimRatio < previousRim, `the rim thins by ×${growth}`);
    previousRim = solved.peripheralRimRatio;

    const peripheralVolume = solved.zoneShares.peripheral * solved.glandVolumeRatio;
    const restVolume = 1 - REST_SHARES.innerRadiusFraction ** 3;
    assert.ok(Math.abs(peripheralVolume - restVolume) < 1e-9, 'and loses nothing while it does');
  }

  assert.equal(solveProstaticEnlargement().peripheralRimRatio, 1, 'at rest the rim is its own thickness');
  assert.ok(solveProstaticEnlargement({ transitionGrowth: 10 }).peripheralIsARim, 'and far enough in it reads as a rim');
});

test('physiology: several times the zone is a fraction more gland', () => {
  // Additive volumes: the gland can only grow by what was added to it, and
  // what was added is a multiple of a small share. Ten times the transition
  // zone is under twice the organ, and that proportion is the scene's point.
  const grown = solveProstaticEnlargement({ transitionGrowth: 10 });
  assert.ok(grown.transitionVolumeRatio > 9.9, 'the zone is ten times what it was');
  assert.ok(grown.glandVolumeRatio < 2, `and the gland is ${grown.glandVolumeRatio.toFixed(2)}× — under twice`);
  assert.ok(grown.glandVolumeRatio > 1.5, 'though it has plainly grown');

  // The gland always lags the zone, at every position, and never the reverse.
  for (const growth of [1.5, 3, 5, 8, 14]) {
    const solved = solveProstaticEnlargement({ transitionGrowth: growth });
    assert.ok(
      solved.glandVolumeRatio < solved.transitionVolumeRatio,
      `at ×${growth} the gland grows less than the zone did`
    );
    assert.ok(solved.glandVolumeRatio > 1, 'but it does grow');
  }
});

test('physiology: the same tissue in two arrangements narrows different places', () => {
  // Lateral lobes surround the channel along its length; a median lobe
  // projects into the bladder neck. The amount of tissue is identical in both
  // of these — only where it sits differs.
  const growth = 7;
  const lateral = solveProstaticEnlargement({ transitionGrowth: growth, medianLobeShare: 0 });
  const median = solveProstaticEnlargement({ transitionGrowth: growth, medianLobeShare: 1 });

  assert.equal(lateral.glandVolumeRatio, median.glandVolumeRatio, 'the same amount of tissue');
  assert.equal(lateral.transitionVolumeRatio, median.transitionVolumeRatio, 'in the same zone');

  assert.ok(lateral.urethralLumenFraction < 1, 'lateral lobes narrow the channel along its length');
  assert.ok(
    Math.abs(median.urethralLumenFraction - 1) < 1e-9,
    'a median lobe leaves the length of the channel alone'
  );
  assert.ok(
    median.bladderNeckLumenFraction < lateral.bladderNeckLumenFraction,
    'and narrows the bladder neck harder than lateral lobes do'
  );

  // With nothing grown, neither arrangement means anything.
  for (const share of [0, 0.5, 1]) {
    const rest = solveProstaticEnlargement({ ...DEFAULT_CONTROLS, medianLobeShare: share });
    assert.equal(rest.urethralLumenFraction, 1, 'an unenlarged gland narrows nothing');
    assert.equal(rest.bladderNeckLumenFraction, 1, 'at either end of the channel');
  }
});
