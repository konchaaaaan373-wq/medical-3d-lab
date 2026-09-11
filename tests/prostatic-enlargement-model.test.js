import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CONTROLS, solveProstaticEnlargement } from '../src/models/prostaticEnlargement.js';
import { BenignProstaticEnlargementScene } from '../src/scenes/reproductive/scenes/benignProstaticEnlargement/BenignProstaticEnlargementScene.js';
import { STAGES, VISUAL_MAPPING } from '../src/data/benignProstaticEnlargement.js';

/** Model integrity, and the axis mapping the scene owns. */

test('prostatic enlargement model: it is deterministic, and the defaults are a gland at rest', () => {
  const a = solveProstaticEnlargement();
  const b = solveProstaticEnlargement({ ...DEFAULT_CONTROLS });
  assert.deepEqual(a.zoneShares, b.zoneShares);
  assert.equal(a.transitionVolumeRatio, 1);
  assert.equal(a.glandVolumeRatio, 1);
  assert.equal(a.peripheralRimRatio, 1);
  assert.equal(a.urethralLumenFraction, 1);
  assert.equal(a.peripheralIsARim, false);
});

test('prostatic enlargement model: rubbish in does not produce rubbish out', () => {
  for (const value of [NaN, -4, 900, Infinity, undefined, null]) {
    const state = solveProstaticEnlargement({ transitionGrowth: value, medianLobeShare: value });
    for (const [key, number] of Object.entries(state)) {
      if (typeof number !== 'number') continue;
      assert.ok(Number.isFinite(number), `${key} with ${String(value)}`);
    }
    assert.ok(state.glandVolumeRatio >= 1, String(value));
    assert.ok(state.urethralLumenFraction > 0 && state.urethralLumenFraction <= 1, String(value));
    assert.ok(state.bladderNeckLumenFraction > 0 && state.bladderNeckLumenFraction <= 1, String(value));
    const shares = state.zoneShares;
    assert.ok(Math.abs(shares.transition + shares.central + shares.peripheral - 1) < 1e-9, String(value));
  }
});

test('prostatic enlargement scene: the axis moves the transition zone and nothing else', () => {
  const scene = new BenignProstaticEnlargementScene({});
  scene.build();
  const at = (progress) => {
    scene.setProgress(progress);
    return scene.solved;
  };

  assert.equal(at(0).glandVolumeRatio, 1, 'the near end is a gland at rest');
  assert.equal(at(0).controls.medianLobeShare, 0, 'and the arrangement is not on the axis');
  assert.ok(at(1).transitionVolumeRatio > 13, 'the far end is the largest the scene draws');
  assert.equal(at(1).controls.medianLobeShare, 0, 'and it still is not');

  // Each stage the copy names lands where it says it does, and each is
  // distinguishable from the one before — otherwise three captions describe two
  // pictures.
  const [rest, inner, rim] = STAGES.map((stage) => at(stage.at));
  assert.equal(rest.peripheralIsARim, false, 'at rest the outside is not a rim');
  assert.ok(rest.zoneShares.peripheral > 0.75, 'it is most of the gland');

  assert.ok(inner.transitionVolumeRatio > 5, 'the middle stage has a several-fold transition zone');
  assert.ok(inner.glandVolumeRatio < 1.6, 'and a gland that grew by well under that');
  assert.ok(inner.zoneShares.peripheral < rest.zoneShares.peripheral - 0.15, 'the outside is losing its share');

  assert.ok(rim.peripheralIsARim, 'and by the last stage it reads as a rim');
  assert.ok(rim.zoneShares.transition > rim.zoneShares.peripheral, 'with the inner gland now the larger part');
  assert.ok(rim.urethralLumenFraction < inner.urethralLumenFraction, 'and a channel narrowed further');

  scene.dispose();
});

test('prostatic enlargement scene: the read-out, the meshes and the channel come from the same solve', () => {
  const scene = new BenignProstaticEnlargementScene({});
  scene.build();
  scene.setProgress(0.45);

  const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row.value]));
  assert.equal(rows.transitionRatio, scene.solved.transitionVolumeRatio.toFixed(2));
  assert.equal(Number(rows.rim), Math.round(scene.solved.peripheralRimRatio * 100));
  assert.equal(Number(rows.lumen), Math.round(scene.solved.urethralLumenFraction * 100));

  // The two groups of meshes carry the two radii, and they are different
  // radii: the inner gland grows faster than the organ does.
  const scaleOf = (id) => scene.zones.mesh(id).scale.x / scene.restScale.get(id).x;
  assert.ok(Math.abs(scaleOf('transition-zone') - scene.solved.innerRadiusRatio) < 1e-6);
  assert.ok(Math.abs(scaleOf('central-zone') - scene.solved.innerRadiusRatio) < 1e-6);
  assert.ok(Math.abs(scaleOf('peripheral-zone') - scene.solved.outerRadiusRatio) < 1e-6);
  assert.ok(scaleOf('transition-zone') > scaleOf('peripheral-zone'), 'the inside outgrows the outside');

  // The atlas's fixed urethra is out of the way, and the scene's own channel
  // is narrower where the model narrowed it.
  assert.equal(scene.zones.mesh('prostatic-urethra').visible, false);
  const midShaft = scene.lumenRadiusAt(0.6);
  scene.setProgress(0);
  assert.ok(scene.lumenRadiusAt(0.6) > midShaft, 'a resting gland leaves a wider channel than an enlarged one');

  scene.dispose();
});

test('prostatic enlargement scene: the median lobe moves the narrowing without moving the tissue', () => {
  const scene = new BenignProstaticEnlargementScene({});
  scene.build();
  scene.setProgress(0.5);
  // Asked at the scene's own bladder neck rather than at the top of the curve:
  // the channel is drawn longer than the gland, and where the gland starts is
  // read off the gland.
  const neck = () => scene.lumenRadiusAt(scene.channelWindow.neckU);
  const lateralGland = scene.solved.glandVolumeRatio;
  const lateralNeck = neck();
  const lateralShaft = scene.lumenRadiusAt(0.7);

  scene.setModelControl('medianLobeShare', 1);
  assert.equal(scene.solved.glandVolumeRatio, lateralGland, 'the same amount of tissue');
  assert.ok(neck() < lateralNeck, 'narrower at the bladder neck');
  assert.ok(scene.lumenRadiusAt(0.7) > lateralShaft, 'and wider along the prostatic length');

  // And the stretch the gland is not around keeps the calibre it was drawn
  // with, whichever arrangement the growth takes.
  const { DRAWN_LUMEN_RADIUS } = BenignProstaticEnlargementScene;
  assert.equal(scene.lumenRadiusAt(1), DRAWN_LUMEN_RADIUS, 'below the apex, nothing is narrowed');
  scene.setModelControl('medianLobeShare', 0);
  assert.equal(scene.lumenRadiusAt(1), DRAWN_LUMEN_RADIUS, 'and the same with lateral lobes');

  // Moving the growth by hand carries the axis with it, so the two never say
  // different things.
  scene.setModelControl('transitionGrowth', 14);
  assert.equal(scene.progress, 1);
  scene.setModelControl('transitionGrowth', 1);
  assert.equal(scene.progress, 0);

  scene.resetModelControls();
  assert.equal(scene.solved.controls.medianLobeShare, 0, 'reset returns the arrangement');
  scene.dispose();
});

test('prostatic enlargement scene: the exaggeration is declared, not assumed', () => {
  // The one thing this scene must never let slide. The channel on screen is
  // drawn several times wider than the model's own proportions, so the entry
  // that covers it has to say what it is not — and has to say it about the two
  // things a reader would otherwise take from a narrowing tube.
  const channel = VISUAL_MAPPING.find((entry) => entry.id === 'channel-narrowing');
  assert.ok(channel, 'the channel has a visual mapping entry');
  assert.notEqual(channel.reading, 'proportional');
  assert.match(channel.notClaim, /not a urethral diameter/i);
  assert.match(channel.notClaim, /no flow rate|no residual/i);

  // And every entry that is not proportional carries its own.
  for (const entry of VISUAL_MAPPING) {
    if (entry.reading === 'proportional') continue;
    assert.ok(entry.notClaim && entry.notClaimJa, `${entry.id} says what it is not, in both languages`);
  }
});
