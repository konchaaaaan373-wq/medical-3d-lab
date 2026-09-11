import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CONTROLS,
  DIAMETER_RANGE,
  solveUterineFibroid,
} from '../src/models/uterineFibroid.js';
import { UterineFibroidScene } from '../src/scenes/reproductive/scenes/uterineFibroid/UterineFibroidScene.js';
import { STAGES, VISUAL_MAPPING } from '../src/data/uterineFibroid.js';

/** Model integrity, and the axis the scene owns. */

test('uterine fibroid model: it is deterministic, and "no fibroid" is an empty wall', () => {
  const a = solveUterineFibroid();
  const b = solveUterineFibroid({ ...DEFAULT_CONTROLS });
  assert.equal(a.cavityContactFraction, b.cavityContactFraction);

  const none = solveUterineFibroid({ location: 'none', diameter: DIAMETER_RANGE.max });
  assert.equal(none.present, false);
  assert.equal(none.uterineVolumeRatio, 1);
  assert.equal(none.cavityContactFraction, 0);
  assert.equal(none.serosalBulge, 0);
  assert.equal(none.wallThickeningRatio, 1);
  assert.equal(none.diameter, 0, 'a size with nowhere to be is not a fibroid');
});

test('uterine fibroid model: rubbish in does not produce rubbish out', () => {
  for (const value of [NaN, -4, 900, Infinity, undefined, null, 'somewhere']) {
    const solved = solveUterineFibroid({ location: value, diameter: value });
    for (const [key, number] of Object.entries(solved)) {
      if (typeof number !== 'number') continue;
      assert.ok(Number.isFinite(number), `${key} with ${String(value)}`);
    }
    assert.ok(solved.cavityContactFraction >= 0 && solved.cavityContactFraction <= 1, String(value));
    assert.ok(solved.uterineVolumeRatio >= 1, String(value));
  }
  // An unknown location is no fibroid, not a fibroid nowhere.
  assert.equal(solveUterineFibroid({ location: 'on-a-stalk' }).present, false);
});

test('uterine fibroid scene: the axis is size, and it is not location', () => {
  const scene = new UterineFibroidScene({});
  scene.build();
  const at = (progress) => {
    scene.setProgress(progress);
    return scene.solved;
  };

  assert.equal(at(0).diameter.toFixed(6), DIAMETER_RANGE.min.toFixed(6));
  assert.equal(at(1).diameter.toFixed(6), DIAMETER_RANGE.max.toFixed(6));
  for (const progress of [0, 0.3, 0.6, 1]) {
    assert.equal(at(progress).location, 'intramural', 'the axis never moves it in the wall');
  }

  // The three stages the copy names are three states the model reaches, and
  // each is distinguishable from the one before it.
  const [small, reaching, large] = STAGES.map((stage) => at(stage.at));
  assert.equal(small.reachesCavity, false, 'the first stage reaches nothing');
  assert.equal(small.reachesSerosa, false, 'the first stage reaches nothing');
  assert.equal(reaching.reachesCavity, true, 'the second reaches past the wall');
  assert.equal(reaching.reachesSerosa, true, 'on both sides, because it is in the middle');
  assert.ok(large.cavityContactFraction > reaching.cavityContactFraction, 'and the third is further in');

  scene.dispose();
});

test('uterine fibroid scene: the drawing is the model’s depth and the model’s diameter', () => {
  const scene = new UterineFibroidScene({});
  scene.build();
  scene.setProgress(1);

  for (const location of ['submucosal', 'intramural', 'subserosal']) {
    scene.setModelControl('location', location);
    assert.ok(Math.abs(scene.fibroid.scale.x - scene.solved.radius) < 1e-9, `${location}: the radius`);
    assert.ok(Math.abs(scene.fibroid.position.z - scene.solved.centreDepth) < 1e-9, `${location}: the depth`);
    assert.equal(scene.fibroid.visible, true, location);
  }

  // The read-out is the same solve, and the volume is the figure that does not
  // distinguish them — which is what it is there to show.
  const volumes = new Set();
  for (const location of ['submucosal', 'intramural', 'subserosal']) {
    scene.setModelControl('location', location);
    const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row.value]));
    assert.equal(rows.uterineVolume, scene.solved.uterineVolumeRatio.toFixed(3));
    assert.equal(Number(rows.cavityContact), Math.round(scene.solved.cavityContactFraction * 100));
    volumes.add(rows.uterineVolume);
  }
  assert.equal(volumes.size, 1, 'the same volume is printed at all three locations');

  scene.setModelControl('location', 'none');
  assert.equal(scene.fibroid.visible, false, 'and nothing is drawn where there is no fibroid');
  assert.equal(
    scene.getAnnotations().find((annotation) => annotation.id === 'fibroid').isDrawn(),
    false,
    'nor named'
  );

  scene.dispose();
});

test('uterine fibroid scene: the drawing says what it is not doing', () => {
  // The two a reader could take past the copy: a size that is not a size, and a
  // bulge that is not a deformed organ.
  const size = VISUAL_MAPPING.find((entry) => entry.id === 'fibroid-size');
  assert.match(size.notClaim, /no centimetre follows/i);

  const wall = VISUAL_MAPPING.find((entry) => entry.id === 'wall-not-redrawn');
  assert.match(wall.notClaim, /not a deformed organ/i);

  const cavity = VISUAL_MAPPING.find((entry) => entry.id === 'cavity-pressed');
  assert.match(cavity.notClaim, /not bleeding/i);

  for (const entry of VISUAL_MAPPING) {
    if (entry.reading === 'proportional') continue;
    assert.ok(entry.notClaim && entry.notClaimJa, `${entry.id} says what it is not, in both languages`);
  }
});
