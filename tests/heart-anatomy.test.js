import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { HeartAnatomyScene } from '../src/scenes/cardiovascular/scenes/heartAnatomy/HeartAnatomyScene.js';
import {
  HEART_AXES,
  HEART_MISSING,
  HEART_PARTS,
  heartColor,
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

test('heart: the great vessels are recorded as absent, not implied to be present', () => {
  const built = scene();
  const missing = built.getMissingStructures();
  assert.deepEqual(missing.map((entry) => entry.id), HEART_MISSING.map((entry) => entry.id));

  const required = missing.filter((entry) => entry.standing === 'required').map((entry) => entry.id);
  assert.deepEqual(required.sort(), [
    'aorta',
    'inferior-vena-cava',
    'pulmonary-trunk',
    'pulmonary-veins',
    'superior-vena-cava',
  ]);
  for (const entry of missing) {
    assert.ok(entry.name?.trim() && entry.nameJa?.trim(), `${entry.id} is named in both languages`);
    assert.equal(built.selectStructure(entry.id), false, 'and naming it does not make it selectable');
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
