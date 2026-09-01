import test from 'node:test';
import assert from 'node:assert/strict';
import BrainAnatomyScene from '../src/scenes/nervous/scenes/brainAnatomy/index.js';
import { BRAIN_REGIONS } from '../src/data/brainAnatomy.js';

test('brain anatomy exposes selectable bilateral lobes and deep structures', () => {
  const scene = new BrainAnatomyScene();
  scene.build();
  const ids = new Set(scene.selectables.map((mesh) => mesh.userData.regionId));
  for (const id of Object.keys(BRAIN_REGIONS)) assert.ok(ids.has(id), `${id} has selectable geometry`);
  assert.ok(ids.has('left-temporal') && ids.has('right-temporal'));
  scene.dispose();
});

test('selection publishes bilingual anatomical information and highlights one mesh', () => {
  const scene = new BrainAnatomyScene();
  scene.build();
  let published;
  scene.onAnatomySelection((value) => { published = value; });
  scene.selectRegion('left-temporal');
  assert.equal(published.nameJa, '側頭葉');
  assert.equal(published.sideJa, '左');
  assert.equal(scene.selectables.filter((mesh) => mesh.userData.selected).length, 1);
  scene.dispose();
});

test('dissection progression separates hemispheres and reveals deep structures', () => {
  const scene = new BrainAnatomyScene();
  scene.build();
  const insula = scene.selectables.find((mesh) => mesh.userData.regionId === 'right-insula');
  assert.equal(insula.material.transparent, true, 'the insula can fade while it is concealed');
  const insulaAnchor = scene.getAnnotations().find((item) => item.id === 'insula').position;
  const initialAnchorX = insulaAnchor.x;
  scene.setProgress(1);
  for (let i = 0; i < 180; i++) scene.update(1 / 60);
  assert.ok(scene.hemispheres[0].position.x * scene.hemispheres[1].position.x < 0);
  assert.ok(scene.deep.every((mesh) => mesh.material.opacity > 0.95));
  assert.ok(scene.cortical.every((mesh) => mesh.material.opacity < 0.4));
  assert.ok(insulaAnchor.x > initialAnchorX + 0.4, 'the insula label follows the opening hemisphere');
  scene.dispose();
});
