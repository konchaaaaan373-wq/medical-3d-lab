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
