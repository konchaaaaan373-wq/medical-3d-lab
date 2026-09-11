import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_CONTROLS, HIP, solveHipOsteoarthritis } from '../src/models/hipOsteoarthritis.js';
import { HipOsteoarthritisScene } from '../src/scenes/musculoskeletal/scenes/hipOsteoarthritis/HipOsteoarthritisScene.js';
import { STAGES, VISUAL_MAPPING, MODEL_SCOPE } from '../src/data/hipOsteoarthritis.js';

/** Model integrity, and the axis the scene owns. */

test('hip model: it is deterministic, and an untouched hip is concentric', () => {
  const a = solveHipOsteoarthritis();
  const b = solveHipOsteoarthritis({ ...DEFAULT_CONTROLS });
  assert.equal(a.offset, b.offset);

  const none = solveHipOsteoarthritis({ direction: 'none', loss: 1 });
  assert.equal(none.present, false);
  assert.equal(none.loss, 0);
  assert.equal(none.concentric, true);
  assert.equal(none.apparentWidening, false);
});

test('hip model: rubbish in does not produce rubbish out', () => {
  for (const value of [NaN, -4, 900, Infinity, undefined, null, 'outwards']) {
    const solved = solveHipOsteoarthritis({ direction: value, loss: value });
    assert.ok(Number.isFinite(solved.offset), String(value));
    for (const place of Object.values(solved.at)) {
      assert.ok(Number.isFinite(place.gapFraction) && place.gapFraction >= 0, `${place.id} / ${String(value)}`);
      assert.ok(place.remaining >= 0 && place.remaining <= 1, `${place.id} / ${String(value)}`);
    }
  }
  assert.equal(solveHipOsteoarthritis({ direction: 'anteriorly' }).present, false);
});

test('hip scene: the axis is how much, and it is not which way', () => {
  const scene = new HipOsteoarthritisScene({});
  scene.build();
  const at = (progress) => {
    scene.setProgress(progress);
    return scene.solved;
  };
  for (const progress of [0, 0.55, 1]) assert.equal(at(progress).direction, 'superolateral');

  const [shared, parting, closed] = STAGES.map((stage) => at(stage.at));
  assert.equal(shared.concentric, true, 'the first stage shares a centre');
  assert.ok(parting.offsetFraction > 0.3 && parting.offsetFraction < 1, 'the second is coming apart');
  assert.equal(parting.apparentWidening, true, 'and already open on the far side');
  assert.ok(closed.narrowest.gapFraction < 0.05, 'the third has closed where the layer went');
  assert.ok(closed.widest.gapFraction > parting.widest.gapFraction, 'and opened further opposite');
  scene.dispose();
});

test('hip scene: the ring is the model’s answer, and the atlas’s even layer is not on screen', () => {
  const scene = new HipOsteoarthritisScene({});
  scene.build();
  scene.setProgress(1);

  // The atlas glazes both surfaces evenly, which is the one thing this scene is
  // about not being true.
  for (const mesh of scene.hip.cartilageMeshes) assert.equal(mesh.visible, false, mesh.name);

  // Every segment is as thick as the model says the space is there.
  const { sweep, segments } = HipOsteoarthritisScene.RING;
  assert.equal(scene.ring.length, segments);
  for (let index = 0; index < segments; index += 1) {
    const angle = (sweep * (index + 0.5)) / segments;
    // The drawn thickness is the model's gap, with a floor so a closed space
    // reads as a hairline rather than as nothing at all.
    const expected = Math.max(0.022, scene.solved.gapAt(angle));
    assert.ok(
      Math.abs(scene.ring[index].mesh.scale.x - expected) < 1e-9,
      `segment ${index} is the gap the model gives it`
    );
  }

  // The ball has settled, and by the layer's own thickness at full loss.
  const rest = scene.restPosition.get('femoral-head').at;
  const moved = scene.hip.mesh('femoral-head').position;
  assert.ok(Math.abs(moved.distanceTo(rest) - HIP.layer) < 1e-9, 'the centres are a whole layer apart');
  scene.setModelControl('direction', 'concentric');
  assert.ok(
    scene.hip.mesh('femoral-head').position.distanceTo(rest) < 1e-9,
    'and with no direction in it nothing has moved'
  );

  const rows = Object.fromEntries(scene.getMetrics().map((row) => [row.id, row.value]));
  assert.match(rows.shape, /centres still shared/);
  scene.dispose();
});

test('hip scene: the layer is never called a joint space width', () => {
  // The same rule as the knee's, and for the same reason: the figure looks
  // exactly like the number a radiograph gives.
  const ring = VISUAL_MAPPING.find((entry) => entry.id === 'the-space-itself');
  assert.match(ring.notClaim, /not a joint space width/i);
  assert.match(ring.notClaim, /weight-bearing/i);
  assert.match(ring.notClaimJa, /関節裂隙幅ではありません/);

  const caution = MODEL_SCOPE.cautions.find((entry) => /joint space width/i.test(entry.text));
  assert.ok(caution, 'the scope panel says it too');
  assert.match(caution.text, /millimetres/i);

  // And the widening says it is not a gain.
  const widening = VISUAL_MAPPING.find((entry) => entry.id === 'apparent-widening');
  assert.match(widening.notClaim, /not a claim that anything has grown/i);

  for (const entry of VISUAL_MAPPING) {
    if (entry.reading === 'proportional') continue;
    assert.ok(entry.notClaim && entry.notClaimJa, `${entry.id} says what it is not, in both languages`);
  }
});
