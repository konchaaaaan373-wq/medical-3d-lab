import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { PressureInjuryScene } from '../src/scenes/integumentary/scenes/pressureInjury/PressureInjuryScene.js';
import { DEPTHS, LAYERS, solvePressureInjury } from '../src/models/pressureInjury.js';
import { MODEL_CONTROLS, PALETTE, VISUAL_MAPPING } from '../src/data/pressureInjury.js';
import { LAYER_DISPLAY_THICKNESS } from '../src/scenes/integumentary/organs/skinBlock.js';

const built = () => { const s = new PressureInjuryScene({}); s.build(); return s; };
const hex = (mesh) => mesh.material.color.getHexString();

test('model: each bar is as long as its layer’s share of the profile’s peak', () => {
  const scene = built();
  for (const ground of ['soft-tissue', 'bony-prominence']) {
    scene.setModelControl('ground', ground);
    for (const load of [0.3, 0.7, 1]) {
      scene.setProgress(load);
      const solved = solvePressureInjury(load, { ground });
      for (const layer of solved.layers) {
        const bar = scene.bars.get(layer.id);
        const expected = scene.barPlacement(layer.share);
        assert.ok(Math.abs(bar.scale.x - expected.length) < 1e-9, `${ground}/${layer.id} at ${load}`);
        assert.ok(Math.abs(bar.position.x - expected.centre) < 1e-9, `${ground}/${layer.id}: runs out from the side`);
        // And it is drawn at the depth it is about, not in a list of its own.
        assert.ok(Math.abs(bar.position.y - layer.at) < 1e-9, `${ground}/${layer.id}: at its own depth`);
      }
    }
  }
  scene.dispose();
});

test('model: the longest bar over bone is the deepest one, on screen', () => {
  // The claim, measured off the drawing rather than off the solver.
  const scene = built();
  scene.setModelControl('ground', 'bony-prominence');
  scene.setProgress(1);
  const bars = LAYERS.map((l) => scene.bars.get(l.id));
  const longest = bars.reduce((most, bar) => (bar.scale.x > most.scale.x ? bar : most), bars[0]);
  const lowest = bars.reduce((low, bar) => (bar.position.y < low.position.y ? bar : low), bars[0]);
  assert.equal(longest, lowest, 'the longest bar is the lowest bar');
  assert.ok(longest.scale.x > bars[0].scale.x * 1.2, 'and plainly longer than the skin’s');

  scene.setModelControl('ground', 'soft-tissue');
  const soft = LAYERS.map((l) => scene.bars.get(l.id));
  const softest = soft.reduce((most, bar) => (bar.scale.x > most.scale.x ? bar : most), soft[0]);
  assert.equal(softest, soft[0], 'and over soft tissue it is the topmost bar instead');
  scene.dispose();
});

test('model: colour marks only which bar is the longest', () => {
  const scene = built();
  scene.setProgress(1);
  scene.setModelControl('ground', 'bony-prominence');
  const deep = scene.bars.get('deep-interface');
  const skin = scene.bars.get('epidermis');
  assert.equal(hex(deep), PALETTE.squeezed.replace('#', ''));
  assert.equal(hex(skin), PALETTE.easy.replace('#', ''));

  scene.setModelControl('ground', 'soft-tissue');
  assert.equal(hex(skin), PALETTE.squeezed.replace('#', ''), 'and it follows the answer');
  assert.equal(hex(deep), PALETTE.easy.replace('#', ''));
  // Nothing else in the scene takes the colour: it is not a state of tissue.
  for (const id of ['epidermis', 'dermis', 'subcutaneous-tissue']) {
    assert.notEqual(scene.block.mesh(id).material.color.getHexString(), PALETTE.squeezed.replace('#', ''));
  }
  scene.dispose();
});

test('model: the prominence is drawn only when it is the ground, and sits at the block’s floor', () => {
  const scene = built();
  scene.setProgress(1);
  scene.setModelControl('ground', 'bony-prominence');
  assert.equal(scene.bone.visible, true);
  const apex = scene.bone.position.y + scene.bone.scale.y;
  assert.ok(Math.abs(apex - DEPTHS.bone) < 1e-9, 'its apex is the depth the model measures from');
  assert.ok(Math.abs(apex - LAYER_DISPLAY_THICKNESS.subcutisFloor) < 1e-9, 'which is the atlas’s own floor');

  for (const ground of ['soft-tissue', 'none']) {
    scene.setModelControl('ground', ground);
    assert.equal(scene.bone.visible, false, `${ground}: nothing is drawn under the block`);
  }
  // And the scene declares that it added the structure.
  const declared = VISUAL_MAPPING.find((m) => m.from === 'overBone');
  assert.ok(/adds|added/i.test(declared.notClaim), 'the visual mapping says the scene added it');
  scene.dispose();
});

test('model: the skin never moves, whatever is pressing on it', () => {
  // A dent would be read as the injury, and there is no injury in this model.
  const scene = built();
  const surface = scene.block.mesh('epidermis');
  const before = surface.position.clone();
  const geometry = surface.geometry.attributes.position.array.slice();
  let lowest = Infinity;
  for (const ground of ['none', 'soft-tissue', 'bony-prominence']) {
    scene.setModelControl('ground', ground);
    for (const load of [0, 0.5, 1]) {
      scene.setProgress(load);
      assert.ok(surface.position.equals(before), `${ground} at ${load}: the block has not moved`);
      assert.deepEqual(Array.from(surface.geometry.attributes.position.array), Array.from(geometry));
      if (ground === 'bony-prominence') lowest = Math.min(lowest, scene.load.position.y);
    }
  }
  // The load is what descends, and it stays above the surface.
  scene.setModelControl('ground', 'bony-prominence');
  scene.setProgress(0);
  assert.ok(scene.load.position.y > lowest, 'an unloaded surface is met from further away');
  assert.ok(lowest > DEPTHS.surface, 'and the load never goes into the block');
  scene.dispose();
});

test('model: labels sit above what they point at, and the bone’s is above its apex', () => {
  // The explanation panel takes the lower third of the screen, so an anchor
  // below its subject's centre is a label a reader cannot read.
  const scene = built();
  scene.setProgress(1);
  scene.setModelControl('ground', 'bony-prominence');
  const annotations = Object.fromEntries(scene.getAnnotations().map((a) => [a.id, a.position]));
  assert.ok(annotations.bone.y > DEPTHS.bone, 'the prominence’s label is above its apex');
  assert.ok(annotations.load.y > scene.load.position.y, 'the load’s is above the load');
  const worst = scene.bars.get('deep-interface');
  assert.ok(annotations.squeezed.y > worst.position.y, 'and the answer’s is above its bar');
  assert.ok(annotations.squeezed.x > 0, 'on the side the bars are drawn');
  scene.dispose();
});

test('model: the read-out prints the absence of a stage rather than omitting it', () => {
  const scene = built();
  scene.setProgress(1);
  for (const ground of ['none', 'soft-tissue', 'bony-prominence']) {
    scene.setModelControl('ground', ground);
    const row = scene.getMetrics().find((m) => m.id === 'stage');
    assert.ok(row, `${ground}: the row is there`);
    assert.match(row.value, /not in this model/i);
    for (const metric of scene.getMetrics()) {
      assert.ok(!/^\s*(1|2|3|4|I{1,3}V?)\s*$/.test(String(metric.value)), `${ground}: "${metric.value}" reads as a stage`);
    }
  }
  scene.dispose();
});

test('model: the controls offer three grounds and reset to the one the claim needs', () => {
  const scene = built();
  const control = MODEL_CONTROLS.find((c) => c.id === 'ground');
  assert.deepEqual(control.options.map((o) => o.value), ['none', 'soft-tissue', 'bony-prominence']);
  scene.setModelControl('ground', 'none');
  assert.equal(scene.getModelControls()[0].value, 'none');
  scene.resetModelControls();
  assert.equal(scene.solved.overBone, true, 'the baseline is the arrangement the scene exists to show');
  scene.dispose();
});

test('model: nothing is drawn beside the block when nothing is pressing', () => {
  const scene = built();
  scene.setModelControl('ground', 'none');
  scene.setProgress(1);
  for (const layer of LAYERS) assert.equal(scene.bars.get(layer.id).visible, false, `${layer.id}`);
  const drawn = Object.fromEntries(scene.getAnnotations().map((a) => [a.id, a.isDrawn?.() ?? true]));
  assert.equal(drawn.squeezed, false, 'and no label claims an answer');
  assert.equal(drawn.bone, false);
  scene.dispose();
});

test('model: the scene disposes what it made', () => {
  const scene = built();
  const meshes = [];
  scene.root.traverse((o) => { if (o instanceof THREE.Mesh) meshes.push(o); });
  assert.ok(meshes.length > 5, 'there is something to free');
  let freed = 0;
  for (const mesh of meshes) {
    const geometry = mesh.geometry;
    const dispose = geometry.dispose.bind(geometry);
    geometry.dispose = () => { freed += 1; dispose(); };
  }
  scene.dispose();
  assert.ok(freed >= meshes.length, `every geometry was freed (${freed} of ${meshes.length})`);
});
