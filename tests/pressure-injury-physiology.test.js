import test from 'node:test';
import assert from 'node:assert/strict';

import { DEPTHS, GROUNDS, LAYERS, TRAPPED, solvePressureInjury } from '../src/models/pressureInjury.js';

const at = (ground, load = 1) => solvePressureInjury(load, { ground });
const share = (solved, id) => solved.layer(id).share;

test('physiology: over a prominence the worst of it is deep, not at the skin', () => {
  // The claim the whole model exists to make. Tissue caught between a load
  // above and a bone below is squeezed from both sides at once, so the peak of
  // the profile is at that interface — and the interface is the deepest thing
  // in the picture.
  const caught = at('bony-prominence');
  assert.equal(caught.worstAt, 'deep-interface');
  assert.ok(caught.againstTheSurface > 1.2, `${caught.againstTheSurface} should be well above the skin`);
  assert.ok(share(caught, 'deep-interface') > share(caught, 'epidermis'), 'the deep layer takes more than the skin');
  assert.ok(TRAPPED > 1, 'which is only possible because trapped tissue is squeezed harder');
});

test('physiology: over soft tissue the squeeze fades downwards from the skin', () => {
  // The other shape, and the one a reader arrives with. It has to be here, or
  // the scene would be asserting that the deep peak is what always happens.
  const soft = at('soft-tissue');
  assert.equal(soft.worstAt, 'epidermis');
  let previous = Infinity;
  for (const layer of soft.layers) {
    assert.ok(layer.deform < previous, `${layer.id} takes less than the layer above it`);
    previous = layer.deform;
  }
  assert.ok(Math.abs(soft.againstTheSurface - 1) < 1e-9, 'nothing is deeper-hit than the surface');
});

test('physiology: the two grounds are two shapes, not two amounts', () => {
  // If one were a worse version of the other, every depth would move the same
  // way between them. The skin is squeezed *less* over bone while the deep
  // layer is squeezed far more, which no single amount can do.
  const soft = at('soft-tissue');
  const caught = at('bony-prominence');
  assert.ok(share(caught, 'epidermis') < share(soft, 'epidermis'), 'the skin is not simply worse off');
  assert.ok(share(caught, 'deep-interface') > share(soft, 'deep-interface') * 5, 'while the deep layer plainly is');
  assert.notEqual(soft.worstAt, caught.worstAt, 'and the answer to the question is a different layer');
});

test('physiology: a profile whose peak could not exceed its surface is refused', () => {
  // The reason the arithmetic is not clamped. A model in which deformation only
  // ever decreased with depth could not represent an injury that begins deep,
  // so the deep term has to be able to carry the profile above the surface.
  const caught = at('bony-prominence');
  assert.ok(caught.worstDeform > caught.layer('epidermis').deform, 'the peak is above the surface value');
  assert.ok(caught.worstDeform > 1, 'and is not held down to one');
  assert.equal(share(caught, caught.worstAt), 1, 'shares are taken against the profile’s own peak');
});

test('physiology: nothing pressing means nothing is squeezed anywhere', () => {
  const idle = at('none');
  assert.equal(idle.loaded, false);
  assert.equal(idle.worstAt, null);
  assert.equal(idle.worstDeform, 0);
  assert.deepEqual(idle.worstLayers, []);
  for (const layer of idle.layers) assert.equal(layer.deform, 0, `${layer.id} is as it was`);
  // And an unloaded ground is unloaded however far up the axis it is asked.
  assert.equal(at('none', 1).worstAt, null);
});

test('physiology: how hard the surface is pressed changes the amount, never the answer', () => {
  // The axis is a magnitude. Which depth takes the most of it is settled by
  // what is underneath, and pressing harder must not be able to change it.
  for (const ground of GROUNDS.filter((g) => g.loaded).map((g) => g.id)) {
    const answers = [0.2, 0.5, 0.8, 1].map((load) => at(ground, load).worstAt);
    assert.deepEqual(new Set(answers).size, 1, `${ground}: the answer does not move with the load`);
    const ratios = [0.2, 1].map((load) => at(ground, load).againstTheSurface);
    assert.ok(Math.abs(ratios[0] - ratios[1]) < 1e-9, `${ground}: nor does the shape`);
  }
});

test('physiology: no stage, grade or damage is produced anywhere in the output', () => {
  // The step this model refuses to take. Staging rests on what tissue is
  // visible and what has been lost, and this model has neither.
  for (const ground of GROUNDS.map((g) => g.id)) {
    const solved = at(ground);
    assert.equal(solved.stage, null, `${ground}: no stage is produced`);
    for (const key of Object.keys(solved)) {
      assert.ok(
        !/stage|grade|damage|necro|ulcer|wound|injur|severity|risk/i.test(key) || key === 'stage',
        `${ground}: "${key}" reads as damage or a stage`
      );
    }
    for (const layer of solved.layers) {
      for (const key of Object.keys(layer)) {
        assert.ok(!/stage|grade|damage|necro|ulcer|wound|injur/i.test(key), `${ground}/${layer.id}: "${key}"`);
      }
    }
  }
});

test('physiology: the depths are the skin atlas’s own, and the bone is at its floor', () => {
  // The model may not invent a geometry for the anatomy it is standing on: the
  // layers have to sit inside the block the atlas draws, and the prominence's
  // datum has to be the block's own floor.
  assert.equal(DEPTHS.bone, DEPTHS.subcutisFloor, 'the prominence begins where the block ends');
  for (const layer of LAYERS) {
    assert.ok(layer.at <= DEPTHS.surface, `${layer.id} is not above the surface`);
    assert.ok(layer.at >= DEPTHS.subcutisFloor, `${layer.id} is not below the block`);
  }
  // And they are in order, top down, so a bar drawn per layer reads as a profile.
  for (let i = 1; i < LAYERS.length; i += 1) assert.ok(LAYERS[i].at < LAYERS[i - 1].at);
});
