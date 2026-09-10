import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { LungAnatomyScene } from '../src/scenes/respiratory/scenes/lungAnatomy/LungAnatomyScene.js';
import { LiverAnatomyScene } from '../src/scenes/hepatobiliary/scenes/liverAnatomy/LiverAnatomyScene.js';
import { KidneyAnatomyScene } from '../src/scenes/renal/scenes/kidneyAnatomy/KidneyAnatomyScene.js';
import {
  GROUP_ID_PREFIX,
  anatomyContractProblems,
  isGroupId,
  treeLeaves,
  treeNodes,
} from '../src/app/anatomyContract.js';

/**
 * The three organ anatomy scenes, held to the same rule the brain is held to.
 *
 * `tests/anatomy-contract.test.js` proves the brain answers the contract with a
 * fixture atlas. These three are built in code, so there is nothing to fixture:
 * the real organ builders run here, and what is checked is the thing a reader
 * would otherwise have to find for themselves — that the name on the card, the
 * row in the tree and the mesh under the pointer are one structure.
 *
 * Built once per scene and shared across the assertions below. Carving three
 * organs costs a couple of seconds, and every test here restores what it
 * changed, so a shared model is a shared model and not a shared state.
 */
const SCENES = [
  { id: 'lung-anatomy', Scene: LungAnatomyScene, minimum: 40 },
  { id: 'liver-anatomy', Scene: LiverAnatomyScene, minimum: 20 },
  { id: 'kidney-anatomy', Scene: KidneyAnatomyScene, minimum: 25 },
];

const built = new Map();
const sceneFor = (entry) => {
  if (!built.has(entry.id)) {
    const scene = new entry.Scene({});
    scene.build();
    built.set(entry.id, scene);
  }
  return built.get(entry.id);
};

test('every organ anatomy scene answers the anatomy contract', () => {
  for (const entry of SCENES) {
    assert.deepEqual(anatomyContractProblems(sceneFor(entry)), [], entry.id);
  }
});

test('the scene is ready with more structures than meshes would suggest by name alone', () => {
  for (const entry of SCENES) {
    const scene = sceneFor(entry);
    const status = scene.getAnatomyStatus();
    assert.equal(status.state, 'ready', entry.id);
    assert.ok(
      status.selectableCount >= entry.minimum,
      `${entry.id}: ${status.selectableCount} selectable structures, expected at least ${entry.minimum}`
    );
    // Meshes are how a structure is drawn; structures are what a reader points
    // at. A scene that reported meshes would overstate itself by however many
    // parts happen to be drawn in pieces.
    assert.ok(status.meshCount >= status.selectableCount, entry.id);
  }
});

test('every structure is named and described in both languages', () => {
  for (const entry of SCENES) {
    const scene = sceneFor(entry);
    for (const structure of scene.structures) {
      for (const field of ['name', 'nameJa', 'description', 'descriptionJa']) {
        assert.ok(
          typeof structure[field] === 'string' && structure[field].trim().length > 0,
          `${entry.id}/${structure.id}: ${field} is missing`
        );
      }
      assert.ok(structure.meshes.length > 0, `${entry.id}/${structure.id} has no mesh`);
      assert.ok(!isGroupId(structure.id), `${entry.id}/${structure.id} is shaped like a grouping node`);
    }
  }
});

test('the part tree lists every structure exactly once, and no grouping node selects', () => {
  for (const entry of SCENES) {
    const scene = sceneFor(entry);
    const tree = scene.getAnatomyTree();
    const leaves = treeLeaves(tree).map((leaf) => leaf.structureId);
    assert.deepEqual(
      [...leaves].sort(),
      scene.structures.map((structure) => structure.id).sort(),
      entry.id
    );
    assert.equal(new Set(leaves).size, leaves.length, `${entry.id}: no structure listed twice`);

    for (const node of treeNodes(tree)) {
      if (node.structureId !== undefined) continue;
      assert.ok(node.nodeId.startsWith(GROUP_ID_PREFIX), `${entry.id}: ${node.nodeId} is not marked as a group`);
      assert.equal(scene.selectStructure(node.nodeId), false, `${entry.id}: ${node.nodeId} selected something`);
    }
    scene.clearSelection();
  }
});

test('isolating a structure removes the rest from the model and from the ray', () => {
  for (const entry of SCENES) {
    const scene = sceneFor(entry);
    const first = scene.structures[0];
    // A structure the layer slider is not already hiding, so that "gone" and
    // "back" mean isolation rather than the slider's doing.
    const second = scene.structures.find(
      (structure) => structure !== first && structure.revealAt === 0
    );
    assert.equal(scene.isolateStructure(first.id), true, entry.id);
    assert.equal(scene.getAnatomyIsolation(), first.id, entry.id);
    assert.equal(first.currentOpacity, first.baseOpacity, `${entry.id}: the isolated structure is solid`);
    assert.equal(second.currentOpacity, 0, `${entry.id}: everything else is gone`);
    for (const mesh of second.meshes) {
      assert.equal(mesh.visible, false, `${entry.id}: a hidden mesh is still drawn`);
      // The failure this guards: a ray does not know a mesh is invisible, so a
      // scene that only drops opacity happily selects what the reader cannot see.
      assert.equal(scene._isPickable(mesh), false, `${entry.id}: a hidden mesh is still pickable`);
    }
    assert.equal(scene.clearIsolation(), true, entry.id);
    assert.equal(second.currentOpacity > 0, true, `${entry.id}: clearing isolation restores the model`);
  }
});

test('isolation does not change the selection, and a colour mode does not either', () => {
  for (const entry of SCENES) {
    const scene = sceneFor(entry);
    const target = scene.structures.find((structure) => structure.revealAt === 0 && structure !== scene.structures[0]);
    scene.selectStructure(target.id);
    scene.isolateStructure(scene.structures[0].id);
    assert.equal(scene.getAnatomySelection().id, target.id, `${entry.id}: isolation moved the selection`);
    scene.clearIsolation();

    const modes = scene.getAnatomyColorModes();
    assert.ok(modes.length >= 2, `${entry.id}: offers more than one reading of the same meshes`);
    const other = modes.find((mode) => mode.id !== scene.getAnatomyColorMode());
    assert.equal(scene.setAnatomyColorMode(other.id), true, entry.id);
    assert.equal(scene.getAnatomySelection().id, target.id, `${entry.id}: recolouring moved the selection`);
    scene.setAnatomyColorMode(modes[0].id);
    scene.clearSelection();
  }
});

test('the layer slider fades the outer tissue and brings the inner structures up', () => {
  for (const entry of SCENES) {
    const scene = sceneFor(entry);
    // The outermost layer is what is solid at 0 and steps back; the innermost
    // is what is not there at 0 and comes up. A middle layer does both — the
    // kidney's pyramids appear under the cortex and then fade for the calyces
    // — and belongs to neither list.
    const outer = scene.structures.filter(
      (structure) => structure.ghostAt != null && structure.revealAt === 0
    );
    const inner = scene.structures.filter(
      (structure) => structure.revealAt > 0 && structure.ghostAt == null
    );
    assert.ok(outer.length > 0, `${entry.id}: something has to get out of the way`);
    assert.ok(inner.length > 0, `${entry.id}: something has to be underneath it`);

    settle(scene, 0);
    for (const structure of outer) assert.ok(structure.currentOpacity > 0.85, `${entry.id}/${structure.id} starts solid`);
    for (const structure of inner) assert.ok(structure.currentOpacity < 0.05, `${entry.id}/${structure.id} starts hidden`);

    settle(scene, 1);
    for (const structure of outer) assert.ok(structure.currentOpacity < 0.2, `${entry.id}/${structure.id} steps back`);
    for (const structure of inner) assert.ok(structure.currentOpacity > 0.6, `${entry.id}/${structure.id} comes up`);

    settle(scene, 0);
  }
});

test('a cut shows what is inside without waiting for the layer slider', () => {
  const scene = sceneFor(SCENES[2]);
  const pyramid = scene.structures.find((structure) => structure.id.startsWith('pyramid-'));
  settle(scene, 0);
  assert.ok(pyramid.currentOpacity < 0.05, 'under an intact cortex the pyramids are not shown');

  scene.setAnatomyView('coronal-section');
  scene._applyLayers(1 / 60, true);
  assert.ok(pyramid.currentOpacity > 0.9, 'cut open, they are there at the same slider value');

  scene.setAnatomyView('kidneys');
  scene._applyLayers(1 / 60, true);
  assert.ok(pyramid.currentOpacity < 0.05, 'and go back when the cut does');
  settle(scene, 0);
});

test('a viewpoint may hide a side or cut the organ, and both are undone by the next one', () => {
  const scene = sceneFor(SCENES[0]);
  const views = scene.getAnatomyViews().map((view) => view.id);
  assert.ok(views.includes('right-mediastinal') && views.includes('coronal-section'));

  const leftLung = scene.structures.find((structure) => structure.id === 'lobe:left-upper');
  scene.setAnatomyView('right-mediastinal');
  assert.equal(leftLung.hidden, true, 'the left lung is taken away, not faded');
  assert.equal(leftLung.currentOpacity, 0);

  scene.setAnatomyView('coronal-section');
  assert.equal(leftLung.hidden, false, 'a cut is not a hidden side');
  assert.ok(scene.sectionPlane instanceof THREE.Plane);
  for (const mesh of leftLung.meshes) {
    assert.deepEqual(mesh.material.clippingPlanes, [scene.sectionPlane]);
    // Front faces only, deliberately: the inner surface of a carved shell is
    // the same surface the parts inside it were cut against, and drawing both
    // puts two coincident surfaces in the depth buffer.
    assert.equal(mesh.material.side, THREE.FrontSide);
  }

  scene.setAnatomyView('anterior');
  assert.equal(scene.sectionPlane, null, 'the cut is put back');
  for (const mesh of leftLung.meshes) assert.equal(mesh.material.clippingPlanes, null);
});

test('every viewpoint names a real pose, and the first one is the pose the scene opens at', () => {
  for (const entry of SCENES) {
    const scene = sceneFor(entry);
    const views = scene.getAnatomyViews();
    assert.ok(views.length >= 3, entry.id);
    for (const view of views) {
      assert.ok(view.label && view.labelJa, `${entry.id}/${view.id} is named in both languages`);
      const pose = scene.getAnatomyView(view.id);
      assert.ok(pose.position instanceof THREE.Vector3 && pose.target instanceof THREE.Vector3, view.id);
    }
    const opening = scene.getAnatomyView(views[0].id);
    assert.ok(
      opening.position.distanceTo(entry.Scene.cameraPose.position) < 1e-6,
      `${entry.id}: the first viewpoint is the opening pose`
    );
    scene.setAnatomyView(views[0].id);
  }
});

test('the kidney names parts only on the side it actually partitioned', () => {
  const scene = sceneFor(SCENES[2]);
  const landmark = scene.structures.find((structure) => structure.id === 'whole-kidney');
  assert.ok(landmark, 'the other kidney is one structure');
  assert.ok(landmark.note && landmark.noteJa, 'and says so where a reader is looking at it');
  // The failure this guards: giving a landmark shape part names, so that a
  // reader selects "medullary pyramid" on a mesh that has no pyramids in it.
  const named = scene.structures.filter((structure) => /pyramid|column|calyx/.test(structure.id));
  assert.ok(named.length >= 15, 'the opened kidney does carry its parts');
  assert.ok(
    named.every((structure) => structure.hierarchy[0] === 'Left kidney'),
    'and every one of them belongs to the opened side'
  );
});

test('a scene lets go of its listeners and its geometry', () => {
  const scene = new LiverAnatomyScene({});
  scene.build();
  const released = new Set();
  for (const mesh of scene.selectables) {
    const geometry = mesh.geometry;
    const original = geometry.dispose.bind(geometry);
    geometry.dispose = () => {
      released.add(geometry);
      original();
    };
  }
  const meshCount = scene.selectables.length;
  let told = 0;
  scene.onAnatomySelection(() => { told += 1; });
  scene.selectStructure(scene.structures[0].id);
  assert.equal(told, 1);

  scene.dispose();
  assert.equal(scene.listeners.size, 0);
  assert.equal(scene.getAnatomySelection(), null);
  assert.equal(released.size, meshCount, 'every geometry the scene put on the GPU is released');
});

/**
 * Run the layer slider to a value and let the model settle there.
 *
 * `setProgress` sets the target and `update()` damps towards it. Writing the
 * damped value directly would test a shortcut rather than the path the slider
 * takes.
 */
function settle(scene, progress) {
  scene.setProgress(progress);
  for (let step = 0; step < 400; step += 1) scene.update(1 / 60);
  scene._applyLayers(1 / 60, true);
}
