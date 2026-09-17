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
  HEART_RECIPES,
  HEART_STRUCTURES,
  HEART_VESSELS,
  heartColor,
  heartMeshOwner,
  heartPartById,
  heartStructureInfo,
} from '../src/data/heartAnatomy.js';
import { ANATOMY_CONTRACT_METHODS, treeLeaves } from '../src/app/anatomyContract.js';
import { fitPoseToSafeArea, orbitLimitsForSubject } from '../src/app/framing.js';
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
  // The five open surfaces were counted in the file by boundary edges, with
  // vertices welded at 1 µm and again at 10 µm: aortic valve 72/72, anterior
  // papillary 42/42, medial 26/26, posterior 21/21, right atrium 286/39. The
  // right atrium's count depends on the weld; that it is open does not.
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

test('heart: a chamber is described as a named surface whose meaning is still open', () => {
  // B4-G1. This test used to require the opposite: that each chamber is "the
  // space it encloses, not the muscle around it". Nothing measured that. Genus
  // does not settle it (a cup has a wall and genus 0), and the enclosed volume
  // does not either, since a normal left ventricular myocardial volume is of
  // the same order as a normal cavity volume. So the description says what the
  // source recorded and leaves the meaning open — and this test holds it open.
  const chambers = HEART_PARTS.filter(
    (part) => part.group === 'chamber' && part.id !== 'VH_M_interventricular_septum'
  );
  assert.equal(chambers.length, 4);
  for (const entry of chambers) {
    const info = heartStructureInfo(entry.id);
    assert.match(info.description, /the source recorded under this chamber's name/);
    assert.match(info.description, /space or the wall around it is still being checked/);
    assert.match(info.descriptionJa, /確認中/);
    // The retracted claim, in both languages, in the string a reader is given.
    assert.doesNotMatch(info.description, /not the muscle around it/);
    assert.doesNotMatch(info.description, /no separate myocardial free wall/);
    assert.doesNotMatch(info.descriptionJa, /これは心腔であって/);
  }
  // The volumes stay: they are measurements. What they were said to settle is
  // what was withdrawn, so nothing here reads a meaning off them.
  assert.equal(heartPartById('VH_M_heart_left_ventricle').enclosedMl, 121.6);
  assert.equal(heartPartById('VH_M_heart_right_ventricle').enclosedMl, 74.0);
});

test('heart: nothing in the scene settles the wall question somewhere else', () => {
  // The retraction is only worth something if it holds everywhere a reader can
  // reach, so this sweeps every string the scene hands out — descriptions in
  // both languages, the recipe notes, and the absence notes.
  const strings = [];
  for (const part of HEART_PARTS) {
    const info = heartStructureInfo(part.id);
    strings.push(info.description, info.descriptionJa, info.note, info.noteJa);
  }
  for (const recipe of HEART_RECIPES) {
    strings.push(recipe.summary, recipe.summaryJa, recipe.note, recipe.noteJa);
  }
  for (const gap of HEART_MISSING) strings.push(gap.why, gap.whyJa);

  const retracted = [
    /not the muscle around it/i,
    /no myocardial wall to cut/i,
    /no separate myocardial free wall/i,
    /これは心腔であって/,
    /切るべき心筋壁はありません/,
    /心筋の自由壁が別部位として収録されていない/,
  ];
  for (const text of strings.filter(Boolean)) {
    for (const pattern of retracted) {
      assert.doesNotMatch(text, pattern, `a withdrawn claim survives in: ${text.slice(0, 80)}…`);
    }
  }
});

test('heart: sharing a group does not share a meaning', () => {
  // B4-R1. The septum is filed with the chambers so a reader can find it, and
  // it is not a chamber. A group is a place to look; the description is what a
  // thing is. The septum keeps its ordinary anatomical description — it is the
  // muscular wall between the ventricles — without that settling what any other
  // surface in the file represents (B4-G1 removed the "the one part that is a
  // wall" phrasing, which did settle it).
  const septum = heartStructureInfo('VH_M_interventricular_septum');
  assert.equal(heartPartById('VH_M_interventricular_septum').group, 'chamber', 'still grouped for navigation');
  assert.match(septum.description, /wall between the two ventricles/);
  assert.doesNotMatch(
    septum.description,
    /the source recorded under this chamber's name/,
    'the chambers\' sentence must not be applied to the septum'
  );
  assert.doesNotMatch(septum.description, /\bthe one part\b/, 'and it must not settle what the rest of the file is');
  assert.match(septum.descriptionJa, /筋性の壁/);
  assert.doesNotMatch(septum.descriptionJa, /唯一/);

  // And the group's own name no longer says "chambers" about a set that
  // contains something else.
  assert.match(septum.region, /septum/i);
  assert.match(septum.regionJa, /中隔/);
});

test('heart: the brachiocephalic veins are not branches of the aortic arch', () => {
  // B4-R1. They were grouped with the arch's branches — the two are alike only
  // in being long and out of the chest — and inherited a description saying
  // they join the arch. The left and right brachiocephalic veins unite to form
  // the superior vena cava.
  for (const id of ['VH_M_brachiocephalic_vein_L', 'VH_M_brachiocephalic_vein_R']) {
    const info = heartStructureInfo(id);
    assert.equal(info.category, 'cavalTributary', id);
    assert.match(info.description, /unite to form the superior vena cava/);
    assert.match(info.description, /not branches of the aortic arch/);
    assert.match(info.descriptionJa, /上大静脈になります/);
    assert.doesNotMatch(info.description, /A branch of the aortic arch/);
  }
  // The arch's arterial branches keep their own description and say nothing
  // about veins.
  const carotid = heartStructureInfo('VH_M_left_common_carotid_artery');
  assert.equal(carotid.category, 'archBranch');
  assert.match(carotid.description, /arterial branch of the aortic arch/);
  assert.doesNotMatch(carotid.description, /vein/i);
});

test('heart: a description never contradicts the surface state of the row it describes', () => {
  // B4-R1. The right atrium is an open surface in the source, and its
  // description used to open with "A closed surface".
  for (const entry of HEART_PARTS) {
    const info = heartStructureInfo(entry.id);
    if (entry.closed === false) {
      assert.doesNotMatch(info.description, /\bclosed surface\b/, `${entry.id}: says closed, note says open`);
      assert.doesNotMatch(info.descriptionJa, /閉じた面/, entry.id);
      assert.match(info.note, /open surface/);
    }
  }
  const atrium = heartStructureInfo('VH_M_right_cardiac_atrium');
  assert.equal(heartPartById('VH_M_right_cardiac_atrium').closed, false);
  assert.match(atrium.note, /open surface/);
});

test('heart: the vessels claim neither a lumen nor an absent wall (B4-R2, B4-N1)', () => {
  // Two withdrawn claims, and this test exists so neither comes back.
  //
  // First they were "lumen surfaces", which nobody had measured. Then they were
  // "single surfaces with no modelled wall thickness", which had been measured
  // with an instrument that cannot tell those apart: a ray cast outward from
  // inside a shape crosses one surface if the shape is solid and two if it is a
  // shell, so "two, not four" is what a thick shell gives too.
  //
  // What is left is the confidence the evidence supports. When the instrument
  // in `scripts/lib/mesh-metrics.mjs` establishes something, this test is where
  // the stronger wording has to be argued for.
  for (const entry of HEART_VESSELS) {
    const info = heartStructureInfo(entry.id);
    assert.match(info.description, /still being checked/i, `${entry.id}: says the question is open`);
    assert.match(info.descriptionJa, /確認中/, entry.id);

    // The lumen claim.
    assert.doesNotMatch(info.description, /It is a lumen surface|is a lumen\b/i, entry.id);
    assert.doesNotMatch(info.descriptionJa, /内腔の面です/, entry.id);
    // The absent-wall claim, in every form it has taken.
    assert.doesNotMatch(info.description, /no modelled wall thickness|single surface with no/i, entry.id);
    assert.doesNotMatch(info.descriptionJa, /壁の厚みを持たない/, entry.id);
    // And no "measured"/"実測" anywhere near either of them.
    assert.doesNotMatch(info.description, /Measured here/i, entry.id);
    assert.doesNotMatch(info.descriptionJa, /実測では/, entry.id);
  }
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

test('heart: the source stayed pinned when the derivative was adopted', () => {
  // This test used to end "and the release gate is shut on it", which was the
  // truth until 2026-09-15. The half worth keeping is the half about the
  // *source*: adopting a file derived from it must not delete the record of
  // what was examined, or the repair stops being reproducible and the
  // provenance chain loses its first link.
  const candidate = devAssetById('hubmap-vh-m-heart');
  assert.ok(candidate, 'the source is still pinned');
  assert.match(candidate.url, /^https:\/\/raw\.githubusercontent\.com\/hubmapconsortium\/ccf-releases\/[0-9a-f]{40}\//);
  assert.match(candidate.sha256, /^[0-9a-f]{64}$/);

  // What ships is a different file, and the manifest records it as one: same
  // asset id, a source hash that is the pinned candidate's, and an output hash
  // that is not.
  const shipped = assetById('hubmap-vh-m-heart');
  assert.ok(shipped, 'the adopted asset is in the manifest of what ships');
  assert.equal(shipped.sources[0].sha256, candidate.sha256, 'the manifest points back at the pinned source');
  assert.notEqual(shipped.output.sha256, candidate.sha256, 'and what ships is the repaired file, not the source');

  assert.deepEqual(betaPublicationProblems('heart-anatomy'), [], 'the gate is open');
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
    // The one mesh whose source records disagree with each other.
    VH_M_left_anterior_descending_artery: [-0.95, 0.05, 0.4],
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
  // By id, not by position: this scene offers several ways of looking now, and
  // which one is first is a presentation order rather than a fact to assert.
  const recipe = built.getDisplayRecipes().find((entry) => entry.id === 'inside-the-chambers');
  assert.ok(recipe, 'the scene still offers the interior view');
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

  // What it observed, split three ways. `anchorsClear` is a prediction about
  // one anchor point from one viewpoint — not a count of what is on screen —
  // and anything the ray could not answer is its own bucket rather than a
  // success.
  assert.ok(result.anchorsClear.length > 0, 'something is actually unobstructed');
  for (const id of result.anchorsClear) {
    assert.ok(recipe.shows.includes(id));
    assert.equal(built.isStructureVisible(id), true);
  }
  assert.deepEqual(
    [...result.anchorsClear, ...result.anchorsBlocked, ...result.anchorsUnmeasured].sort(),
    [...recipe.shows].sort(),
    'every structure it names lands in exactly one bucket'
  );
  assert.equal(
    new Set([...result.anchorsClear, ...result.anchorsBlocked, ...result.anchorsUnmeasured]).size,
    recipe.shows.length,
    'and in only one'
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

// ---------------------------------------------------------------------------
// B4-R3 — the way back is available on every path that changed the display

test('heart: a recipe that only ends an isolation is still undoable', () => {
  // The exact sequence the review named: the four chambers already hidden by
  // hand, the viewpoint already the one the recipe wants, one structure
  // isolated. The recipe then hides nothing and turns nothing — and ends the
  // isolation, which is a change to the display like any other.
  const built = pair();
  for (const id of [
    'VH_M_heart_left_ventricle',
    'VH_M_heart_right_ventricle',
    'VH_M_left_cardiac_atrium',
    'VH_M_right_cardiac_atrium',
  ]) built.setStructureHidden(id, true);
  built.setAnatomyView('anterior');
  built.isolateStructure('VH_M_mitral_valve');
  assert.equal(built.canRestoreDisplay(), false, 'nothing to undo yet');

  const result = built.applyDisplayRecipe('inside-the-chambers');
  assert.equal(result.ok, true);
  assert.deepEqual(result.hid, [], 'it hid nothing — everything was already hidden');
  assert.equal(result.view, 'anterior', 'and it turned nothing');
  assert.equal(built.getAnatomyIsolation(), null, 'but it ended the isolation');
  assert.equal(built.canRestoreDisplay(), true, 'so there is a way back');

  built.restoreDisplay();
  assert.equal(built.getAnatomyIsolation(), 'VH_M_mitral_valve', 'and it goes back');
  built.dispose();
});

test('heart: a recipe that changes nothing at all leaves the previous way back alone', () => {
  const built = pair();
  // One reveal to put a snapshot on the stack.
  built.setStructureHidden('VH_M_left_cardiac_atrium', true);
  built.revealStructure('VH_M_left_cardiac_atrium');
  assert.equal(built.canRestoreDisplay(), true);

  // Then the recipe, twice. The first run changes things; the second cannot,
  // and must not overwrite the snapshot with the state the first one produced.
  built.applyDisplayRecipe('inside-the-chambers');
  const afterFirst = built.getAnatomyVisibility().hidden.slice().sort();
  const second = built.applyDisplayRecipe('inside-the-chambers');
  assert.deepEqual(second.hid, [], 'the second run has nothing left to hide');
  assert.deepEqual(built.getAnatomyVisibility().hidden.slice().sort(), afterFirst, 'and changes nothing');

  built.restoreDisplay();
  assert.ok(
    !built.getAnatomyVisibility().hidden.includes('VH_M_heart_left_ventricle'),
    'the way back is to before the first run, not to between the two'
  );
  built.dispose();
});

test('heart: every path that changes the display records the way back', () => {
  const paths = [
    ['a hide the recipe adds', (scene) => { scene.setAnatomyView('anterior'); }],
    ['a turn the recipe makes', (scene) => {
      scene.setAnatomyView('posterior');
      for (const id of ['VH_M_heart_left_ventricle', 'VH_M_heart_right_ventricle', 'VH_M_left_cardiac_atrium', 'VH_M_right_cardiac_atrium']) {
        scene.setStructureHidden(id, true);
      }
    }],
    ['an isolation the recipe ends', (scene) => {
      scene.setAnatomyView('anterior');
      for (const id of ['VH_M_heart_left_ventricle', 'VH_M_heart_right_ventricle', 'VH_M_left_cardiac_atrium', 'VH_M_right_cardiac_atrium']) {
        scene.setStructureHidden(id, true);
      }
      scene.isolateStructure('VH_M_aortic_valve');
    }],
  ];
  for (const [what, arrange] of paths) {
    const built = pair();
    arrange(built);
    assert.equal(built.canRestoreDisplay(), false, `${what}: nothing recorded before the recipe`);
    built.applyDisplayRecipe('inside-the-chambers');
    assert.equal(built.canRestoreDisplay(), true, `${what}: the way back is recorded`);
    built.dispose();
  }
});

// ---------------------------------------------------------------------------
// B4-R4 — "visible" says what was measured, and unmeasurable is not a success

test('heart: an anchor check that cannot be made is not counted as a success', () => {
  const built = pair();
  const id = 'VH_M_aortic_valve';
  assert.equal(built._anchorClearFromView(id, 'anterior'), true, 'a real viewpoint answers');
  assert.equal(built._anchorClearFromView(id, 'no-such-viewpoint'), null, 'and an unknown one does not');
  assert.notEqual(built._anchorClearFromView(id, 'no-such-viewpoint'), true, 'never "yes" by default');

  // A structure that is not drawn at all is a plain no, not a non-answer.
  built.setStructureHidden(id, true);
  assert.equal(built._anchorClearFromView(id, 'anterior'), false);
  built.dispose();
});

test('heart: the prediction from a viewpoint and the answer from the camera are two questions', () => {
  const built = pair();
  const id = 'VH_M_left_cardiac_atrium';

  // No camera in this harness, so "now" cannot be answered — and says so rather
  // than borrowing the viewpoint's answer.
  assert.equal(built.isAnchorClearNow(id), null);

  built.viewer = { camera: new THREE.PerspectiveCamera(45, 1, 0.1, 100) };
  const anchor = built.getStructureAnnotation(id).position;
  built.viewer.camera.position.copy(anchor).multiplyScalar(3);
  built.viewer.camera.lookAt(0, 0, 0);
  assert.equal(built.isAnchorClearNow(id), true, 'from in front of it');

  built.viewer.camera.position.copy(anchor).multiplyScalar(-3);
  built.viewer.camera.lookAt(0, 0, 0);
  assert.equal(built.isAnchorClearNow(id), false, 'and from behind the heart');

  // The viewpoint prediction is unaffected by where the camera went: they are
  // answers to different questions and neither is rewritten by the other.
  assert.equal(built._anchorClearFromView(id, 'posterior'), built._anchorClearFromView(id, 'posterior'));
  built.dispose();
});

test('heart: "show it" is offered from what is in front of the reader now', () => {
  const built = pair();
  const id = 'VH_M_papillary_muscle_of_heart_anterolateral';
  built.viewer = { camera: new THREE.PerspectiveCamera(45, 1, 0.1, 100) };
  const anchor = built.getStructureAnnotation(id).position;
  built.viewer.camera.position.copy(anchor).multiplyScalar(4);
  built.viewer.camera.lookAt(0, 0, 0);
  assert.equal(built.isStructureObscured(id), true, 'the ventricle is in the way from here');

  // Hidden is a different state and a different button; obscured is about
  // something being in front, not about being switched off.
  built.setStructureHidden(id, true);
  assert.equal(built.isStructureObscured(id), false);
  built.dispose();
});

// ---------------------------------------------------------------------------
// B4-R5 — a name the source is not consistent about says so where it is shown

test('heart: an unsettled name is marked wherever the structure is named', () => {
  const info = heartStructureInfo('VH_M_left_anterior_descending_artery');

  // The source's own records are kept exactly as they are. Nothing here decides
  // which of them is right.
  assert.equal(info.atlasName ?? 'VH_M_left_anterior_descending_artery', 'VH_M_left_anterior_descending_artery');
  assert.equal(info.sourceLabel, 'Anterior descending branch of left pulmonary artery');
  assert.equal(info.ontologyId, 'FMA:8636');

  // And the state travels with the structure, in both languages and short
  // enough for a heading, a result row or a label.
  assert.equal(info.identity, 'source-conflict');
  assert.equal(info.identityNote, 'name unverified');
  assert.equal(info.identityNoteJa, '名称要確認');
  assert.ok(info.identityNote.length < 24 && info.identityNoteJa.length < 12, 'short enough to sit beside a name');
  assert.match(info.note, /neither is corrected/);

  // It is the only one, and every other structure is explicitly settled rather
  // than merely missing the field.
  for (const entry of HEART_STRUCTURES) {
    const other = heartStructureInfo(entry.id);
    if (entry.id === 'VH_M_left_anterior_descending_artery') continue;
    assert.equal(other.identity, null, entry.id);
    assert.equal(other.identityNote, null, entry.id);
  }
});

test('heart: the label for an unsettled name carries the mark, not the paragraph', () => {
  const built = pair();
  const label = built.getStructureAnnotation('VH_M_left_anterior_descending_artery');
  assert.equal(label.text, 'Left anterior descending artery');
  assert.equal(label.flag, 'name unverified');
  assert.equal(label.flagJa, '名称要確認');
  assert.ok(!label.flag.includes('ontology'), 'the whole story stays in the detail tab');

  const settled = built.getStructureAnnotation('VH_M_ascending_aorta');
  assert.equal(settled.flag, null);
  assert.equal(settled.flagJa, null);
  built.dispose();
});

test('the label layer draws a scene\'s mark and nothing when there is none', () => {
  const source = readFileSync(new URL('../src/components/LabelLayer.js', import.meta.url), 'utf8');
  assert.match(source, /annotation\.flag \|\| annotation\.flagJa/);
  assert.match(source, /class: 'label-flag'/);
});

test('the recipe report is cleared by the reader moving the view, not by the app applying one', () => {
  // Applying a viewpoint tweens the camera, and OrbitControls fires `change`
  // for that as well as for a drag — so listening on `change` cleared the very
  // report that applying the recipe's own viewpoint had just produced. `start`
  // fires when the reader begins a drag, a pinch or a wheel, which is the event
  // this rule is actually about.
  const app = readFileSync(new URL('../src/app/App.js', import.meta.url), 'utf8');
  assert.match(app, /addEventListener\?\.\('start', \(\) => anatomyPanel\?\.noteDisplayChanged\?\.\(\)\)/);
  assert.doesNotMatch(app, /addEventListener\?\.\('change', \(\) => anatomyPanel\?\.noteDisplayChanged/);

  // And a resize counts too: the bands the frame is fitted to have moved.
  assert.match(app, /anatomyPanel\?\.noteDisplayChanged\?\.\(\);\n  \}\);/);

  const panel = readFileSync(new URL('../src/components/AnatomyPanel.js', import.meta.url), 'utf8');
  // Any repaint clears it, with one repaint's grace for the run that wrote it.
  assert.match(panel, /if \(recipeList\) clearRecipeStatus\(\);/);
  assert.match(panel, /recipeLatch = true;/);
});

test('the junction figures are described as the sampled-vertex distance they are', () => {
  // The measuring script computes `nearestSampledVertexMm`: the smallest
  // distance between a de-duplicated *vertex* of one mesh and a vertex of the
  // other. The documents around it had drifted into calling that a
  // "nearest-point distance" between surfaces, and into saying the two files
  // "touch where they should" — which a vertex sample cannot establish, since
  // two meshes can interpenetrate with no shared vertex and two surfaces
  // meeting along a face can have their nearest vertices far apart.
  //
  // Two documents also still said no junction had been measured at all, in the
  // same breath as printing the figures. This test holds both halves apart:
  // the quantity is named, and what it does not settle is stated.
  const docs = {
    card: readFileSync(new URL('../docs/model-cards/heart-anatomy.md', import.meta.url), 'utf8'),
    dossier: readFileSync(new URL('../docs/model-evidence/heart-anatomy.md', import.meta.url), 'utf8'),
    assetQa: readFileSync(
      new URL('../docs/asset-qa/heart-hubmap-vh-m-blood-vasculature.md', import.meta.url),
      'utf8'
    ),
  };

  // Matched against whitespace-normalised text: these are wrapped prose files,
  // and a phrase that happens to straddle a line break is the same phrase.
  for (const [name, raw] of Object.entries(docs)) {
    const text = raw.replace(/\s+/g, ' ');
    assert.match(text, /sampled[- ]?vertex/i, `${name}: names the quantity that is actually computed`);
    assert.match(
      text,
      /joined, continuous or watertight/,
      `${name}: says what the number does not settle`
    );
    // The withdrawn readings. Allowed only where the text marks them as
    // withdrawn, which is why the card is checked for the retraction sentence
    // rather than for the absence of the phrase.
    assert.doesNotMatch(text, /Nearest-point distance between/, `${name}`);
    assert.doesNotMatch(
      text,
      /\*\*The two files touch where they should\.\*\*/,
      `${name}: a vertex sample cannot establish touching`
    );
    // And no document may still claim the measurement was never taken while
    // printing its results.
    assert.doesNotMatch(
      text,
      /no (?:distance between a vessel's cut end and a chamber|junction between a vessel and a chamber) (?:is|has been) measured/,
      `${name}: this contradicts the figures in the same document`
    );
  }

  // The script's own header is the source of the definition, so the documents
  // are describing something that exists.
  const script = readFileSync(new URL('../scripts/measure-candidate-surfaces.mjs', import.meta.url), 'utf8');
  assert.match(script, /nearestSampledVertexMm/);
  assert.match(script, /NOT a surface distance/);
});

test('heart: the ways of looking are destinations, and every one of them names real structures', () => {
  // The reader's path is: the whole heart, pick something, clear what is in
  // front of it, look inside, come back. Each recipe is a place to arrive at,
  // not a step that composes with the last one — otherwise "coronary vessels"
  // after "inside the chambers" would leave the chambers hidden and show the
  // union of two requests instead of the one that was made.
  const known = new Set(HEART_STRUCTURES.map((entry) => entry.id));
  assert.deepEqual(
    HEART_RECIPES.map((recipe) => recipe.id),
    ['whole-heart', 'great-vessels', 'coronary-vessels', 'inside-the-chambers']
  );

  for (const recipe of HEART_RECIPES) {
    assert.equal(recipe.resets, true, `${recipe.id}: starts from the scene's own display`);
    assert.ok(recipe.label && recipe.labelJa, `${recipe.id}: named in both languages`);
    assert.ok(recipe.summary && recipe.summaryJa, `${recipe.id}: described in both languages`);
    assert.ok(recipe.view, `${recipe.id}: arrives somewhere`);

    // **Nothing is invented to make a view tidy.** Every structure a recipe
    // hides or claims to show has to be one the source contains and this scene
    // draws, or the view is a promise about geometry that is not there.
    for (const id of [...recipe.hide, ...recipe.shows]) {
      assert.ok(known.has(id), `${recipe.id}: "${id}" is not a structure in this model`);
    }
    // And a recipe must not claim to show something it just hid.
    for (const id of recipe.shows) {
      assert.ok(!recipe.hide.includes(id), `${recipe.id}: "${id}" is both hidden and shown`);
    }
  }

  // The two "clear what is in front" views are complements: what one hides to
  // reveal the surface vessels is what the other shows, and the other way
  // round. If that stops being true, one of them is hiding something for a
  // reason that is no longer the stated one.
  const great = HEART_RECIPES.find((r) => r.id === 'great-vessels');
  const coronary = HEART_RECIPES.find((r) => r.id === 'coronary-vessels');
  for (const id of coronary.shows) {
    assert.ok(great.hide.includes(id), `great-vessels should clear "${id}" away`);
  }
  for (const id of great.shows.filter((v) => coronary.hide.includes(v))) {
    assert.ok(!coronary.shows.includes(id), `coronary-vessels hides "${id}", so it cannot show it`);
  }

  // The whole-heart view hides nothing: it is the way back.
  const whole = HEART_RECIPES.find((r) => r.id === 'whole-heart');
  assert.deepEqual([...whole.hide], [], 'the way back hides nothing');
  assert.ok(whole.shows.length > 0, 'and it still says what a reader should then see');
});

test('heart: the reader can walk the whole path and come back to where they started', () => {
  // Whole → pick → clear what is in front → look inside → back to whole.
  // This is the path the scene is for, run end to end against the model.
  const built = pair();
  const opening = built.getAnatomyVisibility().hidden.slice().sort();

  // 1. The whole heart. Everything the scene draws, from the front.
  const whole = built.applyDisplayRecipe('whole-heart');
  assert.equal(whole.ok, true);
  assert.deepEqual(built.getAnatomyVisibility().hidden.slice().sort(), opening,
    'the whole view is the display the scene opens with');

  // 2. Pick a major structure. The selection is the reader's, and every later
  //    step has to leave it alone.
  built.selectStructure('VH_M_left_coronary_artery');
  assert.equal(built.getAnatomySelection()?.id, 'VH_M_left_coronary_artery');

  // 3. Clear what is in front of it. The great vessels stand over the coronary
  //    arteries from the front, so this view takes them away.
  const coronary = built.applyDisplayRecipe('coronary-vessels');
  assert.equal(coronary.ok, true);
  const afterCoronary = new Set(built.getAnatomyVisibility().hidden);
  assert.ok(afterCoronary.has('VH_M_ascending_aorta'), 'the aorta is out of the way');
  assert.ok(!afterCoronary.has('VH_M_left_coronary_artery'), 'and what was picked is still drawn');
  assert.equal(built.getAnatomySelection()?.id, 'VH_M_left_coronary_artery',
    'a way of looking does not change what is selected');

  // 4. Look inside. This is a destination, not a step on top of the last one:
  //    the great vessels the previous view hid come back, and only the chambers
  //    go away.
  const inside = built.applyDisplayRecipe('inside-the-chambers');
  assert.equal(inside.ok, true);
  const afterInside = new Set(built.getAnatomyVisibility().hidden);
  assert.ok(afterInside.has('VH_M_heart_left_ventricle'), 'the chambers are open');
  assert.ok(!afterInside.has('VH_M_ascending_aorta'),
    'and the previous view is not still in force underneath this one');

  // 5. Back to the whole heart, which is exactly where step 1 was.
  built.applyDisplayRecipe('whole-heart');
  assert.deepEqual(built.getAnatomyVisibility().hidden.slice().sort(), opening,
    'the way back returns to the opening display');
  assert.equal(built.getAnatomySelection()?.id, 'VH_M_left_coronary_artery',
    'and still without disturbing the selection');

  built.dispose();
});

test('heart: a hand-hidden structure is cleared by choosing a way of looking', () => {
  // The reader hides something themselves, then asks for a named view. The view
  // is a destination, so it decides what is on screen — otherwise the hide
  // silently outlives the request and the view is wrong in a way nothing says.
  const built = pair();
  built.setStructureHidden('VH_M_mitral_valve', true);
  assert.ok(built.getAnatomyVisibility().hidden.includes('VH_M_mitral_valve'));

  const result = built.applyDisplayRecipe('inside-the-chambers');
  assert.ok(!built.getAnatomyVisibility().hidden.includes('VH_M_mitral_valve'),
    'the interior view shows the valves, including one the reader had hidden');
  assert.ok(result.shown?.includes?.('VH_M_mitral_valve') ?? true);

  // And the way back still goes back to before the view was chosen.
  assert.equal(built.canRestoreDisplay(), true);
  built.restoreDisplay();
  assert.ok(built.getAnatomyVisibility().hidden.includes('VH_M_mitral_valve'),
    'restoring returns the reader to their own hide');
  built.dispose();
});

test('heart: the camera frames the organ, not the vessels running out of shot', () => {
  // `getSubjectBounds` decides what "show me the heart" means. It used to test
  // for `meshNames`, which marks only the five vessels the source splits in two
  // — so the other thirty-two counted as heart, and the frame was fitted to a
  // 51 cm vascular subtree to show a 10 cm organ.
  const built = pair();
  const span = (bounds) => {
    const ys = bounds.corners.map((corner) => corner.y);
    return Math.max(...ys) - Math.min(...ys);
  };
  const subject = built.getSubjectBounds();
  assert.ok(subject?.corners?.length, 'the scene says what it is framing');

  // Everything drawn, including the vessels that leave the chest.
  const everything = new THREE.Box3();
  for (const mesh of built.selectables.filter((mesh) => mesh.visible)) everything.expandByObject(mesh);
  const drawnSpan = everything.max.y - everything.min.y;

  assert.ok(
    span(subject) < drawnSpan,
    `the framed subject (${span(subject).toFixed(3)}) is smaller than everything drawn (${drawnSpan.toFixed(3)})`
  );

  // And it really is the organ: each chamber sits inside the framed box.
  const ys = subject.corners.map((corner) => corner.y);
  const [low, high] = [Math.min(...ys), Math.max(...ys)];
  for (const id of ['VH_M_heart_left_ventricle', 'VH_M_right_cardiac_atrium']) {
    const box = built.getStructureBounds(id);
    const partYs = box.corners.map((corner) => corner.y);
    assert.ok(
      Math.min(...partYs) >= low - 1e-6 && Math.max(...partYs) <= high + 1e-6,
      `${id} is inside what the camera frames`
    );
  }
  built.dispose();
});

test('heart: the shared orbit floor stood between the framing and the camera', () => {
  // The framing works out where the camera should be; `OrbitControls.update()`
  // decides whether it may be there, every frame, after the fact. The shared
  // floor is five world units, set for a scene whose ventricle is about that
  // size — and this heart is not. Both numbers below are measured from the
  // built scene, so if the model is rebuilt at a different scale this test says
  // so rather than going quietly stale.
  const built = pair();
  const bounds = built.getSubjectBounds();
  const aspect = 1280 / 720;
  const fovDegrees = 42;
  // A wide window with the panel docked right and the console along the bottom.
  const insets = { right: 0.27, top: 0.09, bottom: 0.29 };
  const anterior = {
    position: new THREE.Vector3(0, 0.1, 5.4),
    target: new THREE.Vector3(0, 0, 0),
  };

  const fitted = fitPoseToSafeArea(anterior, { bounds, aspect, fovDegrees, insets });
  const wanted = fitted.position.distanceTo(fitted.target);
  const shared = { minDistance: 5, maxDistance: 55 };
  // The whole organ asks for five and a whisker, having asked for 4.86 while
  // the fit was an orthographic sum. It is not asserted against the floor —
  // the two are within a hundredth of each other, and a test that turns on
  // that is measuring arithmetic, not the defect. It is the close-up below
  // that shows the floor in the way, and the floor is in the way of both.
  assert.ok(wanted > 4 && wanted < 6, `the whole organ asks for about five (${wanted.toFixed(2)})`);

  // Measured from the subject instead, the floor is out of the way — of the
  // whole organ, and of one named structure, which is nearer still.
  const limits = orbitLimitsForSubject(bounds, shared);
  assert.ok(limits.minDistance < wanted, `${limits.minDistance.toFixed(2)} < ${wanted.toFixed(2)}`);

  const artery = built.getStructureBounds('VH_M_left_coronary_artery');
  const closeUp = fitPoseToSafeArea(anterior, { bounds: artery, aspect, fovDegrees, insets, coverage: 0.5 });
  const near = closeUp.position.distanceTo(closeUp.target);
  // Which is the whole defect: with the shared limits the camera sits at five
  // whatever the framing said, so "take me to this artery" stopped a long way
  // short of the artery.
  assert.ok(near < 5, `the fit asks for a camera nearer than the shared floor (${near.toFixed(2)} < 5)`);
  assert.equal(Math.max(shared.minDistance, near), 5, 'the shared floor overrules it');
  assert.ok(
    limits.minDistance < near,
    `and out of the way of one structure too (${limits.minDistance.toFixed(2)} < ${near.toFixed(2)})`
  );

  // It is a floor, not an invitation: the camera can never reach the centre.
  assert.ok(limits.minDistance > 0, 'the floor is still a floor');
  // Nothing is ever tightened — a scene with a larger subject keeps the shared
  // limits it had.
  assert.ok(limits.minDistance <= shared.minDistance && limits.maxDistance >= shared.maxDistance);
  built.dispose();
});

test('heart: a portrait frame gets more of the band, because the organ is wider than it is tall', () => {
  // Measured at 375x667: at the wide-frame share the organ sat across 74% of
  // the width and 35% of the height, with empty bands above and below it — a
  // phone has no side panel taking the width, so what ran out first was the
  // subject's own shape. This holds the rule, not the numbers: a taller-than-
  // wide frame asks for more of the band than a wider one, and the wide value
  // is unchanged.
  const built = pair();
  const camera = { aspect: 1280 / 720 };
  built.viewer = { camera };
  const wide = built.getSubjectBounds().coverage;
  camera.aspect = 375 / 667;
  const portrait = built.getSubjectBounds().coverage;
  camera.aspect = 844 / 390;
  const landscapePhone = built.getSubjectBounds().coverage;

  assert.ok(portrait > wide, `a portrait frame takes more of the band (${portrait} > ${wide})`);
  assert.equal(landscapePhone, wide, 'a wide phone is a wide frame');
  assert.ok(wide > 0 && portrait < 1, 'both are a share of the band, not a distance');

  // A scene that has no viewer yet still answers, and answers the wide value:
  // an unknown frame is not a portrait one.
  built.viewer = null;
  assert.equal(built.getSubjectBounds().coverage, wide);
  built.dispose();
});

test('heart: the opening view does not call itself the whole heart', () => {
  // It is not. This model has no myocardial free wall as a named part, no
  // chordae, no pericardium and no conduction system, and the view keeps two
  // vessel groups out of the way — so a name promising the whole organ is a
  // claim the model cannot meet.
  const opening = HEART_RECIPES.find((recipe) => recipe.id === 'whole-heart');
  assert.ok(opening, 'the opening view is still there');
  assert.doesNotMatch(opening.label, /whole heart/i);
  assert.doesNotMatch(opening.labelJa, /心臓全体/);
  for (const text of [opening.note, opening.noteJa]) {
    assert.doesNotMatch(text, /whole heart|心臓全体/i, 'and nothing under it says it either');
  }
  // Still names what it shows, in both languages.
  assert.ok(opening.label.length > 3 && opening.labelJa.length > 1);
});

test('heart: the model can be asked what is at a point, without a pointer', () => {
  // The landing hero binds Enter to this, through an optional call, so a scene
  // without the method fails silently. The heart published and joined the hero
  // rotation on the same day while missing it — see the method's own comment.
  // `tests/organ-anatomy-scenes.test.js` holds the same line for the thirty-nine
  // scenes built on OrganAnatomyScene; this is the heart's own.
  assert.equal(
    typeof HeartAnatomyScene.prototype.selectAtCanvasPoint,
    'function',
    'the heart cannot be asked what is at a point, so the hero keyboard does nothing on its day'
  );
});
