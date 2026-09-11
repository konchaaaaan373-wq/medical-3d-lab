import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CONTROLS, solveRotatorCuffTear } from '../src/models/rotatorCuffTear.js';
import { RotatorCuffTearScene } from '../src/scenes/musculoskeletal/scenes/rotatorCuffTear/RotatorCuffTearScene.js';
import { STAGES, VISUAL_MAPPING, MODEL_SCOPE } from '../src/data/rotatorCuffTear.js';

/** Model integrity, and the axis the scene owns. */

test('cuff model: it is deterministic, and an untorn cuff is an untouched shoulder', () => {
  const a = solveRotatorCuffTear();
  const b = solveRotatorCuffTear({ ...DEFAULT_CONTROLS });
  assert.equal(a.riseFraction, b.riseFraction);

  const intact = solveRotatorCuffTear({ tear: 0, couple: 1 });
  assert.equal(intact.torn, false);
  assert.equal(intact.fullWidth, false);
  assert.equal(intact.riseFraction, 0);
  assert.equal(intact.containment, 1);
});

test('cuff model: rubbish in does not produce rubbish out', () => {
  for (const value of [NaN, -4, 900, Infinity, undefined, null, 'a bit']) {
    const solved = solveRotatorCuffTear({ tear: value, couple: value });
    for (const [key, number] of Object.entries(solved)) {
      if (typeof number !== 'number') continue;
      assert.ok(Number.isFinite(number), `${key} with ${String(value)}`);
    }
    assert.ok(solved.riseFraction >= 0 && solved.riseFraction <= 1, String(value));
    assert.ok(solved.containment >= 0 && solved.containment <= 1, String(value));
  }
});

test('cuff scene: the axis is the tear, and the pair is not on it', () => {
  const scene = new RotatorCuffTearScene({});
  scene.build();
  const at = (progress) => {
    scene.setProgress(progress);
    return scene.solved;
  };
  for (const progress of [0, 0.5, 1]) assert.equal(at(progress).couple, 1, 'the axis never touches the pair');

  const [intact, partial, full] = STAGES.map((stage) => at(stage.at));
  assert.equal(intact.torn, false, 'the first stage is a whole sleeve');
  assert.ok(partial.torn && !partial.fullWidth, 'the second is a hole in it');
  assert.equal(full.fullWidth, true, 'the third is gone across');
  assert.equal(full.centred, true, 'and the head is still where it was');
  scene.dispose();
});

test('cuff scene: the tendon is redrawn as a defect, and the head moves only when the model says', () => {
  const scene = new RotatorCuffTearScene({});
  scene.build();

  scene.setProgress(0);
  const closed = scene.pieces.medial.surface.curve
    .getPointAt(1)
    .distanceTo(scene.pieces.lateral.surface.curve.getPointAt(0));
  scene.setProgress(1);
  const open = scene.pieces.medial.surface.curve
    .getPointAt(1)
    .distanceTo(scene.pieces.lateral.surface.curve.getPointAt(0));
  assert.ok(open > closed + 0.2, `the defect opened: ${closed} to ${open}`);
  assert.equal(scene.shoulder.mesh('supraspinatus-tendon').visible, false, 'the atlas’s intact one is not on screen');

  // The head is where it was while the pair holds, and everything belonging to
  // the arm bone moves together when it stops.
  const restY = new Map([...scene.restY].map(([id, entry]) => [id, entry.mesh.position.y]));
  assert.equal(scene.shoulder.mesh('humeral-head').position.y, restY.get('humeral-head'));
  scene.setModelControl('couple', 0);
  const rise = scene.rise();
  assert.ok(rise > 0);
  for (const [id, entry] of scene.restY) {
    assert.ok(Math.abs(entry.mesh.position.y - (restY.get(id) + rise)) < 1e-9, `${id} rose with the head`);
  }
  assert.equal(scene.shoulder.mesh('acromion').position.y, 0, 'and the arch above it did not move');

  const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row.value]));
  assert.equal(Number(rows.rise), Math.round(scene.solved.riseFraction * 100));
  assert.match(rows.centred, /riding up/);
  scene.dispose();
});

test('cuff scene: the gap it reports a share of is named as a drawn one', () => {
  // The rule this scene exists under. The number looks exactly like the
  // measurement somebody takes off an X-ray, and the atlas that drew the gap
  // says in its own file that the gap is a legibility value.
  const rise = VISUAL_MAPPING.find((entry) => entry.id === 'head-rise');
  assert.match(rise.notClaim, /display gap/i);
  assert.match(rise.notClaim, /not an acromiohumeral distance/i);
  assert.match(rise.notClaimJa, /肩峰骨頭間距離でも/);

  const caution = MODEL_SCOPE.cautions.find((entry) => /acromiohumeral/i.test(entry.text));
  assert.ok(caution, 'the scope panel says it too');
  assert.match(caution.text, /drawn gap/i);

  // And the metric that carries it says what it is a share of, in its label.
  assert.ok(
    MODEL_SCOPE.cautions.some((entry) => /millimetres/i.test(entry.text)),
    'and refuses millimetres by name'
  );

  for (const entry of VISUAL_MAPPING) {
    if (entry.reading === 'proportional') continue;
    assert.ok(entry.notClaim && entry.notClaimJa, `${entry.id} says what it is not, in both languages`);
  }
});
