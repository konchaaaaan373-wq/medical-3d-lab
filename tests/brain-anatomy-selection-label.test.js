import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import BrainAnatomyScene from '../src/scenes/nervous/scenes/brainAnatomy/index.js';

/**
 * Guards the root cause of the bug where a tapped structure's panel named it
 * but the model itself showed no label for it: the selection's anchor was a
 * single, camera-independent outward vertex — the same kind of point an
 * authored landmark uses — and that point can sit behind a neighbouring
 * structure from a given camera (F-40). A selection is now held to a
 * stricter rule: the exact point a tap hit, or, lacking one, the first of
 * several ranked candidate points the live camera can actually see.
 *
 * `_visibleAnchorFor` is exercised directly, with a hand-built pair of
 * candidate points and a real raycast, rather than through the full ranking
 * (`rankedSurfacePoints`) — that ranking answers from the *whole* atlas's
 * geometry, which a two-structure fixture perturbs every time a third mesh
 * (the occluder) is added, making "which vertex ranks first" a moving
 * target unrelated to what this guards. What must hold regardless of
 * ranking is the policy itself: given several candidates, prefer one the
 * camera can see.
 */

function mkMesh({ id, label, position, size, category = 'cortex', side = 'left', core = true }) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(...size),
    new THREE.MeshBasicMaterial({ color: '#ffffff' })
  );
  mesh.name = `${label}.${side}`;
  mesh.position.fromArray(position);
  mesh.userData = {
    bx_id: id,
    bx_cat: category,
    bx_label: label,
    bx_side: side,
    bx_region: 'Test region',
    bx_core: core ? 1 : 0,
    bx_source: 'test atlas',
  };
  return mesh;
}

function buildFixture(meshes) {
  const atlas = new THREE.Group();
  atlas.name = 'fixture-atlas';
  for (const mesh of meshes) atlas.add(mesh);
  const scene = new BrainAnatomyScene({ atlas });
  scene.build();
  scene.root.updateMatrixWorld(true);
  return scene;
}

const TARGET_ID = 501;
const OCCLUDER_ID = 502;

test('brain: given an occluded and a visible candidate, the visible one is chosen', () => {
  // A large flat "sheet", so two arbitrary points on one face are genuine
  // mesh surface — not points floating in space that happen to share a
  // coordinate with it. Not `core`, so it alone decides the atlas's framing
  // (its own centring, rotation and scale) rather than a calculation shared
  // with the occluder — the fixture must not shift under its own test.
  const target = mkMesh({ id: TARGET_ID, label: 'Test sulcus', position: [0, 0, 0], size: [12, 12, 0.1] });
  // Not `core` either, so its position does not feed back into where "the
  // front face" of the atlas ends up.
  const occluder = mkMesh({ id: OCCLUDER_ID, label: 'Test gyrus', position: [0, 0, 5], size: [2, 2, 2], core: false });
  const scene = buildFixture([target, occluder]);
  const meshes = scene._meshesFor(TARGET_ID);
  const targetMesh = meshes[0];

  // Points and a camera defined in the target's own local space and carried
  // into world space by the same transform the build gave it — rather than
  // assumed to already be world coordinates, which the atlas's own centring,
  // 180° turn and rescale (`attachAtlas`) make false.
  const occludedPoint = targetMesh.localToWorld(new THREE.Vector3(0, 0, 0.05));
  const visiblePoint = targetMesh.localToWorld(new THREE.Vector3(4, 4, 0.05));
  const targetCentre = targetMesh.localToWorld(new THREE.Vector3(0, 0, 0));
  const cameraPosition = targetMesh.localToWorld(new THREE.Vector3(0, 0, 10));

  const camera = new THREE.PerspectiveCamera(90, 1, 0.01, 1000);
  camera.position.copy(cameraPosition);
  camera.lookAt(targetCentre);
  camera.updateMatrixWorld(true);

  // The fixture must actually put one candidate behind the occluder and
  // leave the other clear, or nothing below tests anything.
  assert.equal(scene._rayVisible(occludedPoint, meshes, camera), false);
  assert.equal(scene._rayVisible(visiblePoint, meshes, camera), true);

  scene.viewer = { camera };
  const chosen = scene._visibleAnchorFor(TARGET_ID, [occludedPoint, visiblePoint], meshes);
  assert.ok(chosen.equals(visiblePoint), 'the occluded top candidate must not win over a visible one');

  // Reversing the order changes nothing: it is about visibility, not about
  // which one was listed first.
  const chosenReversed = scene._visibleAnchorFor(TARGET_ID, [visiblePoint, occludedPoint], meshes);
  assert.ok(chosenReversed.equals(visiblePoint));

  // With no live camera — a route opened on a structure, before a viewer
  // exists — there is nothing to ask, so the top-ranked candidate is used
  // as before, occluded or not: this is the fallback the four authored
  // landmarks still rely on (F-40).
  scene.viewer = null;
  const withoutCamera = scene._visibleAnchorFor(TARGET_ID, [occludedPoint, visiblePoint], meshes);
  assert.ok(withoutCamera.equals(occludedPoint));

  // And if every candidate is genuinely hidden, the best-ranked one is
  // returned anyway — "no visible point" is the case `isVisible` should
  // then correctly answer `false` for, not a case with nothing to anchor to.
  scene.viewer = { camera };
  const allHidden = scene._visibleAnchorFor(TARGET_ID, [occludedPoint], meshes);
  assert.ok(allHidden.equals(occludedPoint));

  scene.dispose();
});

test('brain: the point a tap actually hit is used verbatim, without a candidate search', () => {
  const target = mkMesh({ id: TARGET_ID, label: 'Test sulcus', position: [0, 0, 0], size: [1, 1, 1] });
  const other = mkMesh({ id: OCCLUDER_ID, label: 'Test gyrus', position: [3, 0, 0], size: [1, 1, 1] });
  const scene = buildFixture([target, other]);
  const meshes = scene._meshesFor(TARGET_ID);
  const tapped = new THREE.Vector3(0.123, 0.456, 0.789);

  // What `_pointerUp` records before calling `selectStructure` — deliberately
  // not on the target's surface, so this cannot pass by accident of also
  // being visible; it must be used because it *is* the tap, not because a
  // search happened to land there.
  scene._lastPick = { structureId: TARGET_ID, point: tapped };
  const chosen = scene._visibleAnchorFor(TARGET_ID, [new THREE.Vector3(9, 9, 9)], meshes);
  assert.ok(chosen.equals(tapped), 'the tapped point is the anchor, verbatim');

  // A different structure's annotation must not borrow another one's tap.
  const chosenForOther = scene._visibleAnchorFor(OCCLUDER_ID, [new THREE.Vector3(9, 9, 9)], meshes);
  assert.ok(!chosenForOther.equals(tapped));

  // Clearing the selection drops the recorded tap — a later selection made
  // another way (keyboard, a tour) must not inherit a stale point.
  scene.selectStructure(TARGET_ID);
  scene.clearSelection();
  assert.equal(scene._lastPick, null);

  scene.dispose();
});

test('brain: a selection annotation reanchors to a visible candidate once the camera turns', () => {
  // A selection made without a tap (the parts tree, the keyboard, a tour)
  // gets its anchor from whatever the camera could see at that moment. Turn
  // the camera afterwards and that captured point can end up behind the
  // occluder even though the structure itself — and another candidate on it
  // — is still on screen. `reanchor()` is the label layer's way of asking
  // for a fresh one, called only once the captured point has already failed
  // `isVisible`.
  const target = mkMesh({ id: TARGET_ID, label: 'Test sulcus', position: [0, 0, 0], size: [12, 12, 0.1] });
  const occluder = mkMesh({ id: OCCLUDER_ID, label: 'Test gyrus', position: [0, 0, 5], size: [2, 2, 2], core: false });
  const scene = buildFixture([target, occluder]);
  const meshes = scene._meshesFor(TARGET_ID);
  const targetMesh = meshes[0];

  const occludedPoint = targetMesh.localToWorld(new THREE.Vector3(0, 0, 0.05));
  const visiblePoint = targetMesh.localToWorld(new THREE.Vector3(4, 4, 0.05));
  const targetCentre = targetMesh.localToWorld(new THREE.Vector3(0, 0, 0));
  const cameraPosition = targetMesh.localToWorld(new THREE.Vector3(0, 0, 10));
  const camera = new THREE.PerspectiveCamera(90, 1, 0.01, 1000);
  camera.position.copy(cameraPosition);
  camera.lookAt(targetCentre);
  camera.updateMatrixWorld(true);

  // Seed the ranked-candidate cache directly, occluded point ranked first —
  // the case a keyboard selection made from a different angle would have
  // produced — rather than depending on `rankedSurfacePoints`'s own ranking
  // of this fixture's vertices, which is not what this test is about.
  scene.structureAnchors.set(`structure:${TARGET_ID}`, [occludedPoint, visiblePoint]);

  // No viewer yet: a structure named before a camera exists gets the
  // top-ranked candidate regardless (F-40's existing fallback).
  scene.viewer = null;
  const annotation = scene.getStructureAnnotation(TARGET_ID);
  assert.ok(annotation.position.equals(occludedPoint), 'captured with no camera to ask');

  // The camera arrives, and from here the captured point is genuinely hidden.
  scene.viewer = { camera };
  assert.equal(annotation.isVisible(camera), false, 'the fixture must actually occlude this point');

  const moved = annotation.reanchor(camera);
  assert.equal(moved, true);
  assert.ok(annotation.position.equals(visiblePoint), 'reanchor swaps in the candidate the camera can see');
  assert.equal(annotation.isVisible(camera), true, 'the label is visible again on the same anchor object');

  // Already on the best visible candidate: nothing left to swap to.
  assert.equal(annotation.reanchor(camera), false, 'reanchor is a no-op once the anchor already holds');

  scene.dispose();
});

/**
 * A "sheet + occluder" fixture with a camera looking straight at the sheet,
 * shared by the guards below: one point on the sheet sits behind the
 * occluder, another is clear.
 */
function occludedFixture() {
  const target = mkMesh({ id: TARGET_ID, label: 'Test sulcus', position: [0, 0, 0], size: [12, 12, 0.1] });
  const occluder = mkMesh({ id: OCCLUDER_ID, label: 'Test gyrus', position: [0, 0, 5], size: [2, 2, 2], core: false });
  const scene = buildFixture([target, occluder]);
  const meshes = scene._meshesFor(TARGET_ID);
  const targetMesh = meshes[0];
  const occludedPoint = targetMesh.localToWorld(new THREE.Vector3(0, 0, 0.05));
  const visiblePoint = targetMesh.localToWorld(new THREE.Vector3(4, 4, 0.05));
  const camera = new THREE.PerspectiveCamera(90, 1, 0.01, 1000);
  camera.position.copy(targetMesh.localToWorld(new THREE.Vector3(0, 0, 10)));
  camera.lookAt(targetMesh.localToWorld(new THREE.Vector3(0, 0, 0)));
  camera.updateMatrixWorld(true);
  assert.equal(scene._rayVisible(occludedPoint, meshes, camera), false);
  assert.equal(scene._rayVisible(visiblePoint, meshes, camera), true);
  return { scene, meshes, occludedPoint, visiblePoint, camera };
}

test('brain: reanchoring a label leaves the structure\'s candidate cache and the tap point untouched', () => {
  // The candidate list is a property of the geometry, cached per structure
  // for the life of the scene; a label's anchor is a property of one label.
  // Audit of the first version found `reanchor()` writing through an alias
  // into the cache: after one swap, the best-ranked candidate had been
  // overwritten with the second, for every later selection of the structure.
  const { scene, occludedPoint, visiblePoint, camera } = occludedFixture();
  const key = `structure:${TARGET_ID}`;
  const cachedTop = occludedPoint.clone();
  scene.structureAnchors.set(key, [occludedPoint, visiblePoint]);

  scene.viewer = null;
  const annotation = scene.getStructureAnnotation(TARGET_ID);
  assert.ok(annotation.position.equals(occludedPoint));
  assert.notEqual(annotation.position, occludedPoint, 'the label owns its own point, not the cache entry');

  scene.viewer = { camera };
  assert.equal(annotation.reanchor(camera), true);
  assert.ok(annotation.position.equals(visiblePoint));
  assert.ok(
    scene.structureAnchors.get(key)[0].equals(cachedTop),
    'the cached top candidate must survive a reanchor of a label built from it'
  );

  // The same for a tap: its recorded point is the reader's, not the label's.
  const tapped = visiblePoint.clone();
  scene._lastPick = { structureId: TARGET_ID, point: tapped };
  const fromTap = scene.getStructureAnnotation(TARGET_ID);
  assert.notEqual(fromTap.position, tapped);
  fromTap.position.set(1, 2, 3);
  assert.ok(scene._lastPick.point.equals(visiblePoint), 'moving the label must not move the recorded tap');

  scene.dispose();
});

test('brain: a tap point that turns out of view falls back to a visible candidate, and returns when it can be seen', () => {
  // A tap is visible by construction at the moment it lands. Rotate the
  // model afterwards and it can go behind a neighbouring gyrus like any
  // other point — the first version kept it unconditionally, so the one
  // selection method most readers use was the one that could not recover.
  const { scene, meshes, occludedPoint, visiblePoint, camera } = occludedFixture();
  scene.viewer = { camera };

  scene._lastPick = { structureId: TARGET_ID, point: occludedPoint.clone() };
  const fallenBack = scene._visibleAnchorFor(TARGET_ID, [visiblePoint], meshes);
  assert.ok(fallenBack.equals(visiblePoint), 'an occluded tap point gives way to a visible candidate');

  // A visible tap point still wins over every candidate, including a
  // visible one listed first: it is where the reader touched.
  scene._lastPick = { structureId: TARGET_ID, point: visiblePoint.clone() };
  const other = meshes[0].localToWorld(new THREE.Vector3(-4, -4, 0.05));
  assert.equal(scene._rayVisible(other, meshes, camera), true);
  const kept = scene._visibleAnchorFor(TARGET_ID, [other], meshes);
  assert.ok(kept.equals(visiblePoint), 'a visible tap point is used verbatim');

  // Nothing visible at all: the tap point is still the better answer than an
  // arbitrary candidate, and `isVisible` will say "no" for it correctly.
  scene._lastPick = { structureId: TARGET_ID, point: occludedPoint.clone() };
  const allHidden = scene._visibleAnchorFor(TARGET_ID, [occludedPoint.clone()], meshes);
  assert.ok(allHidden.equals(occludedPoint));

  scene.dispose();
});

test('brain: a label that has nothing visible to move to is not searched again until the camera moves', () => {
  // The label layer asks `reanchor()` every frame the anchor is occluded.
  // With every candidate hidden — the far hemisphere on a medial view — that
  // was a full candidate raycast each frame for as long as the selection
  // stayed. The search now runs once per camera pose.
  const { scene, occludedPoint, camera } = occludedFixture();
  scene.structureAnchors.set(`structure:${TARGET_ID}`, [occludedPoint]);
  scene.viewer = { camera };
  const annotation = scene.getStructureAnnotation(TARGET_ID);
  assert.equal(annotation.isVisible(camera), false);

  let searches = 0;
  const original = scene._visibleAnchorFor.bind(scene);
  scene._visibleAnchorFor = (...args) => {
    searches += 1;
    return original(...args);
  };
  assert.equal(annotation.reanchor(camera), false);
  assert.equal(annotation.reanchor(camera), false);
  assert.equal(annotation.reanchor(camera), false);
  assert.equal(searches, 1, 'one search per pose, not one per frame');

  camera.position.x += 0.5;
  camera.updateMatrixWorld(true);
  assert.equal(annotation.reanchor(camera), false);
  assert.equal(searches, 2, 'a moved camera is a new question');

  scene.dispose();
});
