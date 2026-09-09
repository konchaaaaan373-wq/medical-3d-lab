import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';

import { HeartAnatomyScene } from '../src/scenes/cardiovascular/scenes/heartAnatomy/HeartAnatomyScene.js';
import {
  HEART_AXES,
  HEART_DEFAULT_HIDDEN,
  HEART_MISSING,
  HEART_PARTS,
  HEART_STRUCTURES,
  HEART_VESSELS,
  heartColor,
  heartMeshOwner,
  heartPartById,
  heartStructureInfo,
} from '../src/data/heartAnatomy.js';
import { ANATOMY_CONTRACT_METHODS, treeLeaves } from '../src/app/anatomyContract.js';
import { devAssetById } from '../src/catalog/devAssets.js';
import { assetById } from '../src/catalog/assetManifest.js';
import { betaPublicationProblems } from '../src/catalog/release.js';

/**
 * The heart scene, against a fixture rather than against the candidate GLB.
 *
 * The real file is not committed — it is a candidate fetched by
 * `npm run assets:dev` — so a test that loaded it would pass on one machine and
 * fail on a fresh checkout. What is testable everywhere is the part of the
 * scene that is ours: the part table, the adapter, the contract, and the
 * display rules. The measurements that were taken *of* the file are recorded in
 * `docs/asset-qa/heart-hubmap-vh-m-heart.md` and quoted in the part table, and
 * the two checks below hold the table to them.
 *
 * The fixture's geometry is arranged to reproduce the three relationships the
 * axes were derived from, and to put a papillary muscle inside a ventricle,
 * because those are the two things the scene reasons about geometrically.
 */

/** Where each fixture part sits, in the model's own axes: +x left, +y superior, +z anterior. */
const PLACES = {
  VH_M_heart_left_ventricle: [0.42, -0.55, 0.05, 0.7],
  VH_M_heart_right_ventricle: [-0.34, -0.4, 0.5, 0.6],
  VH_M_left_cardiac_atrium: [0.5, 0.55, -0.42, 0.4],
  VH_M_right_cardiac_atrium: [-0.5, 0.55, 0.02, 0.4],
  VH_M_interventricular_septum: [0.04, -0.5, 0.22, 0.35],
  VH_M_mitral_valve: [0.34, 0.06, -0.06, 0.18],
  VH_M_tricuspid_valve: [-0.3, 0.06, 0.26, 0.18],
  VH_M_aortic_valve: [0.1, 0.2, 0.0, 0.16],
  VH_M_pulmonary_valve: [-0.12, 0.34, 0.34, 0.16],
  VH_M_papillary_muscle_of_heart_anterior: [0.42, -0.62, 0.05, 0.08],
  VH_M_papillary_muscle_of_heart_anterolateral: [0.5, -0.6, 0.02, 0.07],
  VH_M_papillary_muscle_of_heart_medial: [-0.3, -0.45, 0.5, 0.07],
  VH_M_papillary_muscle_of_heart_posterior: [-0.38, -0.45, 0.46, 0.07],
  VH_M_papillary_muscle_of_heart_posteromedial: [0.36, -0.66, 0.02, 0.07],
};

function fixture({ extraMesh = false } = {}) {
  const group = new THREE.Group();
  group.name = 'fixture-heart';
  for (const entry of HEART_PARTS) {
    const [x, y, z, size] = PLACES[entry.id];
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshBasicMaterial({ color: '#ffffff' })
    );
    mesh.name = entry.id;
    mesh.position.set(x, y, z);
    group.add(mesh);
  }
  if (extraMesh) {
    const stray = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial());
    stray.name = 'VH_M_something_the_table_does_not_know';
    group.add(stray);
  }
  return group;
}

function scene(options = {}) {
  const built = new HeartAnatomyScene({ model: fixture(options) });
  built.build();
  return built;
}

const centreOf = (built, id) => built.getStructureBounds(id).centre;

// ---------------------------------------------------------------------------
// The part table

test('heart: the fourteen parts are fourteen distinct structures', () => {
  assert.equal(HEART_PARTS.length, 14);
  assert.equal(new Set(HEART_PARTS.map((entry) => entry.id)).size, 14, 'no two parts share a node name');
  assert.equal(new Set(HEART_PARTS.map((entry) => entry.ontologyId)).size, 14, 'nor a vocabulary term');

  // The parts that a careless adapter would collapse: five papillary muscles
  // are five structures, and the two atria are two.
  const papillary = HEART_PARTS.filter((entry) => entry.group === 'papillary');
  assert.equal(papillary.length, 5);
  assert.equal(new Set(papillary.map((entry) => entry.name)).size, 5);
  assert.equal(HEART_PARTS.filter((entry) => /atrium/.test(entry.name)).length, 2);
});

test('heart: an ontology id is a cross-reference, never the key a structure is found by', () => {
  for (const entry of HEART_PARTS) {
    assert.equal(heartPartById(entry.id), entry);
    assert.equal(heartPartById(entry.ontologyId), null, 'a term does not resolve to a mesh');
    assert.match(entry.ontologyId, /^(UBERON|FMA):\d+$/);
  }
});

test('heart: an open surface says it is open, and a closed one says nothing', () => {
  // The five open surfaces were counted in the file by boundary edges: aortic
  // valve 72, anterior papillary 42, medial 26, posterior 21, right atrium 3.
  const open = HEART_PARTS.filter((entry) => !entry.closed).map((entry) => entry.id);
  assert.deepEqual(open.sort(), [
    'VH_M_aortic_valve',
    'VH_M_papillary_muscle_of_heart_anterior',
    'VH_M_papillary_muscle_of_heart_medial',
    'VH_M_papillary_muscle_of_heart_posterior',
    'VH_M_right_cardiac_atrium',
  ]);
  for (const entry of HEART_PARTS) {
    const info = heartStructureInfo(entry.id);
    if (entry.closed) {
      assert.equal(info.note, null, `${entry.id} is closed and needs no note`);
      assert.equal(info.noteJa, null);
    } else {
      assert.match(info.note, /open surface/);
      assert.ok(info.noteJa?.trim(), `${entry.id}: the note is in both languages or in neither`);
    }
  }
});

test('heart: a chamber is described as the space it encloses, not as muscle', () => {
  for (const entry of HEART_PARTS.filter((part) => part.group === 'chamber')) {
    const info = heartStructureInfo(entry.id);
    assert.match(info.description, /closed surface enclosing the space/);
    assert.match(info.description, /no separate myocardial free wall/);
  }
  // And the volumes that settled it are recorded rather than remembered.
  assert.equal(heartPartById('VH_M_heart_left_ventricle').enclosedMl, 121.6);
  assert.equal(heartPartById('VH_M_heart_right_ventricle').enclosedMl, 74.0);
});

test('heart: every part carries the fields the panels read, in both languages', () => {
  for (const entry of HEART_PARTS) {
    const info = heartStructureInfo(entry.id);
    for (const field of ['id', 'name', 'nameJa', 'breadcrumb', 'breadcrumbJa']) {
      assert.ok(String(info[field]).trim(), `${entry.id}: ${field}`);
    }
    assert.equal(info.hierarchy.length, info.hierarchyJa.length);
    assert.notEqual(info.name, info.nameJa, `${entry.id} needs a deliberate Japanese name`);
  }
});

// ---------------------------------------------------------------------------
// The scene

test('heart: the scene satisfies the anatomy contract', () => {
  const built = scene();
  for (const method of ANATOMY_CONTRACT_METHODS) {
    assert.equal(typeof built[method], 'function', `missing ${method}`);
  }
  assert.equal(built.getAnatomyStatus().state, 'ready');
  assert.equal(built.getAnatomyStatus().selectableCount, 14);
  assert.equal(built.getAnatomyInventory().length, 14);
  assert.equal(treeLeaves(built.getAnatomyTree()).length, 14, 'every part is reachable in the tree');
  built.dispose();
});

test('heart: a mesh the table does not know is counted, not adopted', () => {
  const built = new HeartAnatomyScene({ model: fixture({ extraMesh: true }) });
  built.build();
  const status = built.getAnatomyStatus();
  assert.equal(status.selectableCount, 14, 'the stray mesh does not become a fifteenth structure');
  assert.equal(status.unknownMeshes, 1, 'and it is not silently dropped either');
  assert.equal(built.selectStructure('VH_M_something_the_table_does_not_know'), false);
  built.dispose();
});

test('heart: selection round-trips through the structure id', () => {
  const built = scene();
  const seen = [];
  built.onAnatomySelection((structure) => seen.push(structure?.id ?? null));

  assert.equal(built.selectStructure('VH_M_mitral_valve'), true);
  assert.equal(built.getAnatomySelection().id, 'VH_M_mitral_valve');
  assert.equal(built.getAnatomySelection().nameJa, '僧帽弁');
  built.clearSelection();
  assert.equal(built.getAnatomySelection(), null);
  assert.deepEqual(seen, ['VH_M_mitral_valve', null]);
  built.dispose();
});

test('heart: the axes the adapter declares are the axes the fixture has', () => {
  // Architecture rule 5, checked rather than asserted: the three relationships
  // that fixed the axes are re-derived from the geometry.
  const built = scene();
  const left = new THREE.Vector3(...HEART_AXES.left);
  const superior = new THREE.Vector3(...HEART_AXES.superior);
  const anterior = new THREE.Vector3(...HEART_AXES.anterior);

  const leftAtrium = centreOf(built, 'VH_M_left_cardiac_atrium');
  const rightAtrium = centreOf(built, 'VH_M_right_cardiac_atrium');
  assert.ok(leftAtrium.dot(left) > rightAtrium.dot(left), 'the left atrium is to the patient-left');

  const apex = centreOf(built, 'VH_M_heart_left_ventricle');
  const valve = centreOf(built, 'VH_M_aortic_valve');
  assert.ok(apex.dot(superior) < valve.dot(superior), 'the apex is below the valve plane');

  const rightVentricle = centreOf(built, 'VH_M_heart_right_ventricle');
  assert.ok(rightVentricle.dot(anterior) > leftAtrium.dot(anterior), 'the right ventricle is in front');

  const axes = built.getAnatomyAxes();
  assert.equal(axes.left.dot(axes.superior), 0, 'the declared axes are orthogonal');
  assert.equal(axes.left.dot(axes.anterior), 0);
  built.dispose();
});

test('heart: the six viewpoints are named for directions, and none of them claims an interior', () => {
  const built = scene();
  const ids = built.getAnatomyViews().map((view) => view.id);
  assert.deepEqual(ids, ['anterior', 'posterior', 'left-lateral', 'right-lateral', 'base', 'apex']);
  for (const view of built.getAnatomyViews()) {
    assert.ok(view.label?.trim() && view.labelJa?.trim(), `${view.id} is named in both languages`);
    assert.doesNotMatch(view.id, /inside|interior|cut|section/, 'the file supports no cut, so no view offers one');
  }

  // Anterior and posterior really are opposite, in the axes the model declares.
  const anterior = built.getAnatomyView('anterior').position;
  const posterior = built.getAnatomyView('posterior').position;
  const forward = new THREE.Vector3(...HEART_AXES.anterior);
  assert.ok(anterior.dot(forward) > 0 && posterior.dot(forward) < 0);
  built.dispose();
});

test('heart: hiding, isolating and showing again are one order of rules', () => {
  const built = scene();
  const drawn = () => built._drawnMeshes().map((mesh) => mesh.userData.structureId).sort();

  assert.equal(built.isStructureVisible('VH_M_mitral_valve'), true);
  built.setStructureHidden('VH_M_mitral_valve', true);
  assert.equal(built.isStructureVisible('VH_M_mitral_valve'), false);
  assert.ok(!drawn().includes('VH_M_mitral_valve'), 'a hidden structure is not on the ray either');

  // Isolation is a temporary override that writes nothing down: the hidden
  // structure is still hidden when it ends.
  built.isolateStructure('VH_M_heart_left_ventricle');
  assert.deepEqual(drawn(), ['VH_M_heart_left_ventricle']);
  built.clearIsolation();
  assert.equal(built.isStructureVisible('VH_M_mitral_valve'), false, 'isolation did not un-hide it');

  built.showAllHiddenStructures();
  assert.equal(built.isStructureVisible('VH_M_mitral_valve'), true);
  assert.equal(drawn().length, 14);
  built.dispose();
});

test('heart: isolating a structure also stops the others being clickable', () => {
  const built = scene();
  built.isolateStructure('VH_M_mitral_valve');
  const clickable = built._drawnMeshes();
  assert.equal(clickable.length, 1);
  assert.equal(clickable[0].userData.structureId, 'VH_M_mitral_valve');
  built.dispose();
});

test('heart: revealing a part turns to it, and says so when turning is not enough', () => {
  const built = scene();

  // A surface part: hidden, then revealed, and the display can be put back.
  built.setStructureHidden('VH_M_left_cardiac_atrium', true);
  const atrium = built.revealStructure('VH_M_left_cardiac_atrium');
  assert.equal(atrium.ok, true);
  assert.ok(atrium.changed.includes('hidden'));
  assert.equal(built.isStructureVisible('VH_M_left_cardiac_atrium'), true);
  assert.equal(atrium.occluded, false, 'an outer structure is seen once it is shown');
  assert.equal(built.canRestoreDisplay(), true);
  built.restoreDisplay();
  assert.equal(built.isStructureVisible('VH_M_left_cardiac_atrium'), false, 'restore puts back what reveal changed');
  assert.equal(built.canRestoreDisplay(), false);

  // A part inside a chamber: turning cannot show it, so what is in front of it
  // is taken out of the way — measured by the ray, and reversible.
  built.showAllHiddenStructures();
  const id = 'VH_M_papillary_muscle_of_heart_anterolateral';
  assert.equal(built.isStructureObscured(id), true, 'drawn, and still not visible');

  const papillary = built.revealStructure(id);
  assert.equal(papillary.ok, true);
  assert.ok(papillary.hid.length > 0, 'something was in the way and was hidden');
  assert.ok(
    papillary.hid.includes('VH_M_heart_left_ventricle'),
    `the ventricle around it is what was hidden, not something else: ${papillary.hid.join(', ')}`
  );
  assert.ok(!papillary.hid.includes(id), 'and never the structure being revealed');
  assert.equal(papillary.occluded, false, 'so it really is visible now');
  assert.equal(built.isStructureObscured(id), false);

  // Nothing was cut: the ventricle is hidden, not opened, and it comes back.
  built.restoreDisplay();
  assert.deepEqual(built.getAnatomyVisibility().hidden, [], 'every blocker is put back');
  assert.equal(built.isStructureObscured(id), true);
  built.dispose();
});

test('heart: a structure on the outside is never called obscured', () => {
  const built = scene();
  for (const id of ['VH_M_heart_left_ventricle', 'VH_M_heart_right_ventricle', 'VH_M_left_cardiac_atrium']) {
    assert.equal(built.isStructureObscured(id), false, id);
    assert.deepEqual(built.revealStructure(id).hid, [], `${id} needs nothing moved out of the way`);
  }
  built.dispose();
});

test('heart: an unknown id changes nothing', () => {
  const built = scene();
  assert.deepEqual(built.revealStructure('no-such-part'), { ok: false, reason: 'unknown-structure' });
  assert.equal(built.setStructureHidden('no-such-part', true), false);
  assert.equal(built.isolateStructure('no-such-part'), false);
  assert.equal(built.getAnatomyVisibility().hidden.length, 0);
  built.dispose();
});

test('heart: colour is identity and never physiology', () => {
  const built = scene();
  const parts = HEART_PARTS.map((entry) => heartColor(entry.id, 'parts'));
  assert.equal(new Set(parts).size, HEART_PARTS.length, 'every part is its own colour');
  for (const entry of HEART_PARTS) {
    assert.notEqual(heartColor(entry.id, 'parts'), heartColor(entry.id, 'natural'), `${entry.id} reads differently`);
    assert.equal(heartColor(entry.id, 'parts'), heartColor(entry.id, 'parts'), 'and the same every run');
  }

  // The mistake this rules out: colouring the chambers by the blood they would
  // carry. Left and right chambers are not two colour families.
  const leftSide = [heartColor('VH_M_heart_left_ventricle', 'parts'), heartColor('VH_M_left_cardiac_atrium', 'parts')];
  const rightSide = [heartColor('VH_M_heart_right_ventricle', 'parts'), heartColor('VH_M_right_cardiac_atrium', 'parts')];
  assert.equal(new Set([...leftSide, ...rightSide]).size, 4);

  // Switching modes recolours without changing what is selected.
  built.selectStructure('VH_M_tricuspid_valve');
  built.setAnatomyColorMode('natural');
  assert.equal(built.getAnatomySelection().id, 'VH_M_tricuspid_valve');
  assert.equal(built.getAnatomyColorMode(), 'natural');
  built.dispose();
});

test('heart: one transform places the model, so a second file can join it unmoved', () => {
  const built = scene();
  const before = centreOf(built, 'VH_M_heart_left_ventricle').clone();

  // What adding the vasculature will look like: a sibling under the same root,
  // in the source's own coordinates.
  const vessel = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), new THREE.MeshBasicMaterial());
  vessel.position.set(0.1, 0.9, 0.0);
  built.modelRoot.add(vessel);
  built.root.updateMatrixWorld(true);

  assert.deepEqual(centreOf(built, 'VH_M_heart_left_ventricle').toArray(), before.toArray(), 'the heart did not move');
  const scale = built.modelRoot.scale.x;
  assert.ok(scale > 0);
  assert.equal(built.modelRoot.scale.y, scale, 'the transform is uniform');
  assert.equal(built.modelRoot.scale.z, scale);
  built.dispose();
});

test('heart: labels are anchored on the outside and hidden behind what covers them', () => {
  const built = scene();
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);

  const atrium = built.getStructureAnnotation('VH_M_left_cardiac_atrium');
  assert.equal(atrium.structureId, 'VH_M_left_cardiac_atrium');
  assert.equal(atrium.text, 'Left atrium');
  assert.equal(atrium.sub, '左心房');

  camera.position.copy(atrium.position).multiplyScalar(3);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  assert.equal(atrium.isVisible(camera), true, 'a structure facing the camera is labelled');

  camera.position.copy(atrium.position).multiplyScalar(-3);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  assert.equal(atrium.isVisible(camera), false, 'and one behind the heart is not');
  built.dispose();
});

// ---------------------------------------------------------------------------
// What is missing, and what that means for the release

test('heart: what is still absent is listed, and nothing absent is selectable', () => {
  const built = scene();
  const missing = built.getMissingStructures();
  assert.deepEqual(missing.map((entry) => entry.id), HEART_MISSING.map((entry) => entry.id));

  // The five the beta asked for are drawn now, from the vasculature file of the
  // same release. Nothing is `required` any more — and the release gate does not
  // read this list, so that is not what opens it.
  assert.deepEqual(missing.filter((entry) => entry.standing === 'required'), []);
  for (const entry of missing) {
    assert.ok(entry.name?.trim() && entry.nameJa?.trim(), `${entry.id} is named in both languages`);
    assert.equal(built.selectStructure(entry.id), false, 'and naming it does not make it selectable');
  }
  // An absence with a reason keeps the reason in both languages or in neither.
  for (const entry of missing) {
    assert.equal(Boolean(entry.why), Boolean(entry.whyJa), `${entry.id}`);
  }
  built.dispose();
});

test('heart: the file it draws is a candidate, and the release gate is shut on it', () => {
  const candidate = devAssetById('hubmap-vh-m-heart');
  assert.ok(candidate, 'the file is pinned');
  assert.match(candidate.url, /^https:\/\/raw\.githubusercontent\.com\/hubmapconsortium\/ccf-releases\/[0-9a-f]{40}\//);
  assert.match(candidate.sha256, /^[0-9a-f]{64}$/);
  assert.equal(assetById('hubmap-vh-m-heart'), null, 'and it is not in the manifest of what ships');

  const problems = betaPublicationProblems('heart-anatomy');
  assert.ok(problems.length > 0);
  assert.ok(problems.some((line) => /candidate asset "hubmap-vh-m-heart"/.test(line)));
});

// ---------------------------------------------------------------------------
// The second file: the vessels

/**
 * The vessel subtree, as the source ships it — one node named
 * `VH_M_blood_vasculature_of_heart`, with the meshes under it, plus a mesh from
 * elsewhere in the body to prove the subtree is what is taken.
 */
function vesselFixture() {
  const file = new THREE.Group();
  file.name = 'fixture-vasculature-file';

  const elsewhere = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial());
  elsewhere.name = 'VH_M_superior_ophthalmic_vein_L';
  elsewhere.position.set(0.02, 6, 0.07);
  file.add(elsewhere);

  const subtree = new THREE.Group();
  subtree.name = 'VH_M_blood_vasculature_of_heart';
  // A translation on the subtree node itself, so reparenting has something to
  // preserve: a naive `add()` that dropped it would move every vessel.
  subtree.position.set(0.5, 0.25, -0.125);
  file.add(subtree);

  const at = {
    VH_M_ascending_aorta: [-0.5, 0.35, 0.25],
    VH_M_pulmonary_trunk: [-0.35, 0.4, 0.3],
    VH_M_superior_vena_cava: [-0.95, 0.45, 0.25],
    VH_M_inferior_vena_cava_a: [-0.95, -0.25, 0.15],
    VH_M_inferior_vena_cava_b: [-0.95, -0.75, 0.15],
    VH_M_left_coronary_artery: [-0.3, 0.3, 0.3],
    VH_M_descending_aorta_a: [-0.55, -0.6, -0.1],
    VH_M_descending_aorta_b: [-0.55, -1.4, -0.1],
    VH_M_brachiocephalic_vein_L: [-0.2, 0.9, 0.2],
  };
  for (const [name, place] of Object.entries(at)) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.12), new THREE.MeshBasicMaterial());
    mesh.name = name;
    mesh.position.fromArray(place);
    subtree.add(mesh);
  }
  return file;
}

const pair = () => {
  const built = new HeartAnatomyScene({ model: fixture(), vessels: vesselFixture(), vesselLoader: null });
  built.build();
  return built;
};

test('heart: the vessel table bundles split meshes and keeps distinct vessels distinct', () => {
  assert.equal(HEART_STRUCTURES.length, HEART_PARTS.length + HEART_VESSELS.length);
  assert.equal(new Set(HEART_STRUCTURES.map((entry) => entry.id)).size, HEART_STRUCTURES.length);

  // One structure, two meshes — the same shape the brain's split gyri have.
  const cava = HEART_VESSELS.find((entry) => entry.id === 'VH_M_inferior_vena_cava');
  assert.deepEqual([...cava.meshNames], ['VH_M_inferior_vena_cava_a', 'VH_M_inferior_vena_cava_b']);
  assert.equal(heartMeshOwner('VH_M_inferior_vena_cava_a'), 'VH_M_inferior_vena_cava');
  assert.equal(heartMeshOwner('VH_M_inferior_vena_cava_b'), 'VH_M_inferior_vena_cava');

  // Two meshes carrying the same ontology term stay two structures, because a
  // term is a vocabulary and not an identifier.
  const diagonals = HEART_VESSELS.filter((entry) => entry.ontologyId === 'FMA:3860');
  assert.equal(diagonals.length, 2);
  assert.notEqual(diagonals[0].id, diagonals[1].id);

  // Every mesh a structure claims is claimed by exactly one structure.
  const claims = HEART_STRUCTURES.flatMap((entry) => entry.meshNames ?? [entry.id]);
  assert.equal(new Set(claims).size, claims.length);
  assert.equal(heartMeshOwner('VH_M_superior_ophthalmic_vein_L'), null, 'the rest of the body is not claimed');
});

test('heart: the five great vessels the beta asked for are in the model', () => {
  const built = pair();
  const ids = new Set(built.getAnatomyInventory().map((entry) => entry.id));
  for (const id of [
    'VH_M_ascending_aorta',
    'VH_M_pulmonary_trunk',
    'VH_M_superior_vena_cava',
    'VH_M_inferior_vena_cava',
  ]) {
    assert.ok(ids.has(id), `${id} is drawn`);
  }
  assert.equal(built.getAnatomyStatus().vessels, 'loaded');
  built.dispose();
});

test('heart: the two files keep the positions the source gave them', () => {
  const alone = scene();
  const both = pair();

  // The heart is in the same place either way: adding the vessels moved nothing.
  const heartAlone = centreOf(alone, 'VH_M_heart_left_ventricle');
  const heartWith = centreOf(both, 'VH_M_heart_left_ventricle');
  for (const axis of ['x', 'y', 'z']) {
    assert.ok(Math.abs(heartAlone[axis] - heartWith[axis]) < 1e-9, `the heart did not move on ${axis}`);
  }

  // And the vessels arrive where the source put them, through the subtree node's
  // own transform. In fixture coordinates the ascending aorta sits at
  // (0.5, 0.25, -0.125) + (-0.5, 0.35, 0.25) = (0, 0.6, 0.125): above the aortic
  // valve at (0.1, 0.2, 0.0) and near the midline, which is where an ascending
  // aorta belongs. Compared after the shared transform, in the same space.
  const superior = new THREE.Vector3(...HEART_AXES.superior);
  const aorta = centreOf(both, 'VH_M_ascending_aorta');
  const valve = centreOf(both, 'VH_M_aortic_valve');
  assert.ok(aorta.dot(superior) > valve.dot(superior), 'the ascending aorta is above the aortic valve');

  const cava = centreOf(both, 'VH_M_inferior_vena_cava');
  const atrium = centreOf(both, 'VH_M_right_cardiac_atrium');
  assert.ok(cava.dot(superior) < atrium.dot(superior), 'the inferior vena cava is below the right atrium');

  // One transform on one root, uniform, and that is the only thing applied.
  assert.equal(both.modelRoot.scale.x, both.modelRoot.scale.y);
  assert.equal(both.modelRoot.scale.y, both.modelRoot.scale.z);
  assert.equal(both.modelRoot.scale.x, alone.modelRoot.scale.x, 'the scale comes from the heart, not from the pair');
  alone.dispose();
  both.dispose();
});

test('heart: only the subtree the source calls the vessels of the heart is taken', () => {
  const built = pair();
  const drawnNames = built.selectables.map((mesh) => mesh.name);
  assert.ok(!drawnNames.includes('VH_M_superior_ophthalmic_vein_L'), 'the rest of the body is not adopted');
  const status = built.getAnatomyStatus();
  assert.ok(status.vesselMeshes > 0, 'the subtree is taken');
  assert.equal(status.vesselsNotTaken, 1, 'and what is left behind is counted, not silently dropped');
  assert.equal(status.vesselsInFile, status.vesselMeshes + status.vesselsNotTaken);
  built.dispose();
});

test('heart: the far-reaching vessels start hidden, and unhiding shows them', () => {
  const built = pair();
  const hidden = built.getAnatomyVisibility().hidden;
  for (const id of ['VH_M_descending_aorta', 'VH_M_brachiocephalic_vein_L']) {
    assert.ok(HEART_DEFAULT_HIDDEN.includes(id));
    assert.ok(hidden.includes(id), `${id} starts out of the way`);
    assert.equal(built.isStructureVisible(id), false);
  }
  // Nothing near the heart is hidden by default.
  assert.ok(!hidden.includes('VH_M_ascending_aorta'));
  assert.ok(!hidden.includes('VH_M_heart_left_ventricle'));

  built.showAllHiddenStructures();
  assert.deepEqual(built.getAnatomyVisibility().hidden, []);
  assert.equal(built.isStructureVisible('VH_M_descending_aorta'), true);
  built.dispose();
});

test('heart: a structure drawn from two meshes acts as one structure', () => {
  const built = pair();
  assert.equal(built.selectStructure('VH_M_inferior_vena_cava'), true);
  assert.equal(built.getAnatomySelection().id, 'VH_M_inferior_vena_cava');
  assert.equal(built._meshesFor('VH_M_inferior_vena_cava').length, 2, 'two meshes, one structure');

  built.isolateStructure('VH_M_inferior_vena_cava');
  const drawn = built._drawnMeshes();
  assert.equal(drawn.length, 2, 'isolating it draws both of its meshes and nothing else');
  assert.ok(drawn.every((mesh) => mesh.userData.structureId === 'VH_M_inferior_vena_cava'));
  built.dispose();
});

test('heart: the mesh whose source record disagrees with itself says so', () => {
  const info = heartStructureInfo('VH_M_left_anterior_descending_artery');
  assert.equal(info.ontologyId, 'FMA:8636', 'the id the file carries is kept, not replaced');
  assert.equal(info.sourceLabel, 'Anterior descending branch of left pulmonary artery');
  assert.match(info.note, /disagrees with itself/);
  assert.match(info.note, /neither is corrected/);
  assert.ok(info.noteJa?.trim());

  // And it is the only one: every other structure's name and source label agree
  // on what kind of thing it is, or carry no note at all.
  const flagged = HEART_VESSELS.filter((entry) => entry.note);
  assert.deepEqual(flagged.map((entry) => entry.id), ['VH_M_left_anterior_descending_artery']);
});

test('heart: natural colour reports the source\'s artery/vein assignment and says it is not oxygenation', () => {
  // The source ships two materials, pure red for arteries and pure blue for
  // veins, and assigns every vessel mesh to one. Reporting that is not the same
  // as claiming an oxygenation map — and the model carries the counterexample.
  const artery = heartColor('VH_M_pulmonary_trunk', 'natural');
  const vein = heartColor('VH_M_pulmonary_vein_L_sup', 'natural');
  const redness = (hex) => parseInt(hex.slice(1, 3), 16) - parseInt(hex.slice(5, 7), 16);
  assert.ok(redness(artery) > 0, 'the pulmonary trunk is red, and carries deoxygenated blood');
  assert.ok(redness(vein) < 0, 'the pulmonary veins are blue, and carry oxygenated blood');

  // Parts mode stays an identity map: every one of the 46 is its own colour.
  const all = HEART_STRUCTURES.map((entry) => heartColor(entry.id, 'parts'));
  assert.equal(new Set(all).size, HEART_STRUCTURES.length);
});

test('heart: every vessel is named, grouped and described in both languages', () => {
  for (const entry of HEART_VESSELS) {
    const info = heartStructureInfo(entry.id);
    assert.ok(info, entry.id);
    for (const field of ['name', 'nameJa', 'breadcrumb', 'breadcrumbJa', 'description', 'descriptionJa']) {
      assert.ok(String(info[field]).trim(), `${entry.id}: ${field}`);
    }
    assert.notEqual(info.name, info.nameJa, `${entry.id} needs a deliberate Japanese name`);
    assert.match(info.ontologyId, /^(UBERON|FMA):\d+$/);
    assert.ok(['artery', 'vein'].includes(entry.vesselType), `${entry.id}: vessel type`);
    assert.equal(info.side, 'Vessels', 'the card says which file it came from');
  }
});

test('heart: the fixed view hides and turns, and never cuts', () => {
  const built = pair();
  const [recipe] = built.getDisplayRecipes();
  assert.equal(recipe.id, 'inside-the-chambers');
  assert.ok(recipe.label?.trim() && recipe.labelJa?.trim());
  assert.ok(recipe.summary?.trim() && recipe.summaryJa?.trim());
  assert.match(recipe.note, /not a section/);
  assert.ok(recipe.noteJa?.trim());

  const before = built.getAnatomyVisibility().hidden.length;
  const result = built.applyDisplayRecipe('inside-the-chambers');
  assert.equal(result.ok, true);
  assert.equal(result.view, 'anterior');

  // The four chambers are hidden, and nothing else the recipe did not name.
  const hidden = new Set(built.getAnatomyVisibility().hidden);
  for (const id of [
    'VH_M_heart_left_ventricle',
    'VH_M_heart_right_ventricle',
    'VH_M_left_cardiac_atrium',
    'VH_M_right_cardiac_atrium',
  ]) {
    assert.ok(hidden.has(id), `${id} is out of the way`);
  }
  assert.equal(hidden.size, before + result.hid.length);

  // What it says it shows, it shows — checked by the same ray the labels use,
  // not by trusting the recipe's own list.
  assert.ok(result.shown.length > 0, 'something is actually visible');
  for (const id of result.shown) {
    assert.ok(recipe.shows.includes(id));
    assert.equal(built.isStructureVisible(id), true);
  }
  assert.deepEqual(
    [...result.shown, ...result.missing].sort(),
    [...recipe.shows].sort(),
    'every structure it names is reported as seen or as not seen'
  );

  // Nothing was cut, thinned or sectioned: the only change is hides and a view.
  built.restoreDisplay();
  assert.equal(built.getAnatomyVisibility().hidden.length, before);
  for (const id of recipe.hide) assert.equal(built.isStructureVisible(id), true);
  built.dispose();
});

test('heart: an unknown recipe changes nothing', () => {
  const built = pair();
  const before = built.getAnatomyVisibility().hidden.length;
  assert.deepEqual(built.applyDisplayRecipe('no-such-recipe'), { ok: false, reason: 'unknown-recipe' });
  assert.equal(built.getAnatomyVisibility().hidden.length, before);
  assert.equal(built.canRestoreDisplay(), false);
  built.dispose();
});

test('heart: a label knows the difference between "behind something" and "not drawn"', () => {
  const built = pair();
  const id = 'VH_M_left_cardiac_atrium';
  const label = built.getStructureAnnotation(id);
  assert.equal(label.isDrawn(), true);

  // Hidden by the reader: not drawn, and the layer must not wait.
  built.setStructureHidden(id, true);
  assert.equal(label.isDrawn(), false);
  built.setStructureHidden(id, false);
  assert.equal(label.isDrawn(), true);

  // Isolated away: same answer, different route.
  built.isolateStructure('VH_M_heart_left_ventricle');
  assert.equal(label.isDrawn(), false);
  built.clearIsolation();
  assert.equal(label.isDrawn(), true);

  // Taken out of the way by the fixed view: still the same answer.
  built.applyDisplayRecipe('inside-the-chambers');
  assert.equal(label.isDrawn(), false);
  built.restoreDisplay();
  assert.equal(label.isDrawn(), true);
  built.dispose();
});

test('the label layer waits out occlusion and never waits out a hide', () => {
  // Source-text, because the thing being fixed is an ordering in one function
  // and a behavioural test of a 140 ms timer is a test of a timer.
  const source = readFileSync(new URL('../src/components/LabelLayer.js', import.meta.url), 'utf8');
  assert.match(source, /const undrawn = item\.annotation\.isDrawn\?\.\(\) === false;/);
  // The grace timestamp is reset rather than refreshed when a structure is not
  // drawn, so nothing can be inside the window on the frame it comes back.
  assert.match(source, /if \(undrawn\) item\.seenAt = 0;/);
  // And `undrawn` is part of the hide decision, not merely computed.
  assert.match(source, /const hide = offscreen \|\| undrawn \|\| unseen \|\| never \|\| over;/);
});
