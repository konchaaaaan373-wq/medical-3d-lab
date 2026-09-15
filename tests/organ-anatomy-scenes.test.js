import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { LungAnatomyScene } from '../src/scenes/respiratory/scenes/lungAnatomy/LungAnatomyScene.js';
import { LiverAnatomyScene } from '../src/scenes/hepatobiliary/scenes/liverAnatomy/LiverAnatomyScene.js';
import { KidneyAnatomyScene } from '../src/scenes/renal/scenes/kidneyAnatomy/KidneyAnatomyScene.js';
import { StomachAnatomyScene } from '../src/scenes/gastrointestinal/scenes/stomachAnatomy/StomachAnatomyScene.js';
import { IntestineAnatomyScene } from '../src/scenes/gastrointestinal/scenes/intestineAnatomy/IntestineAnatomyScene.js';
import { PancreasAnatomyScene } from '../src/scenes/hepatobiliary/scenes/pancreasAnatomy/PancreasAnatomyScene.js';
import { ThyroidAnatomyScene } from '../src/scenes/endocrine/scenes/thyroidAnatomy/ThyroidAnatomyScene.js';
import { SpleenAnatomyScene } from '../src/scenes/hematologic/scenes/spleenAnatomy/SpleenAnatomyScene.js';
import { BladderAnatomyScene } from '../src/scenes/renal/scenes/bladderAnatomy/BladderAnatomyScene.js';
import { BiliaryAnatomyScene } from '../src/scenes/hepatobiliary/scenes/biliaryAnatomy/BiliaryAnatomyScene.js';
import { EsophagusAnatomyScene } from '../src/scenes/gastrointestinal/scenes/esophagusAnatomy/EsophagusAnatomyScene.js';
import { AdrenalAnatomyScene } from '../src/scenes/endocrine/scenes/adrenalAnatomy/AdrenalAnatomyScene.js';
import { UterusAnatomyScene } from '../src/scenes/reproductive/scenes/uterusAnatomy/UterusAnatomyScene.js';
import { ProstateAnatomyScene } from '../src/scenes/reproductive/scenes/prostateAnatomy/ProstateAnatomyScene.js';
import { MaleTractAnatomyScene } from '../src/scenes/reproductive/scenes/maleTractAnatomy/MaleTractAnatomyScene.js';
import { KneeAnatomyScene } from '../src/scenes/musculoskeletal/scenes/kneeAnatomy/KneeAnatomyScene.js';
import { ShoulderAnatomyScene } from '../src/scenes/musculoskeletal/scenes/shoulderAnatomy/ShoulderAnatomyScene.js';
import { HipAnatomyScene } from '../src/scenes/musculoskeletal/scenes/hipAnatomy/HipAnatomyScene.js';
import { PelvisAnatomyScene } from '../src/scenes/regional/scenes/pelvisAnatomy/PelvisAnatomyScene.js';
import { AbdomenAnatomyScene } from '../src/scenes/regional/scenes/abdomenAnatomy/AbdomenAnatomyScene.js';
import { ThoraxAnatomyScene } from '../src/scenes/regional/scenes/thoraxAnatomy/ThoraxAnatomyScene.js';
import { ElbowAnatomyScene } from '../src/scenes/musculoskeletal/scenes/elbowAnatomy/ElbowAnatomyScene.js';
import { NeckAnatomyScene } from '../src/scenes/regional/scenes/neckAnatomy/NeckAnatomyScene.js';
import { SkeletonOverviewScene } from '../src/scenes/musculoskeletal/scenes/skeletonOverview/SkeletonOverviewScene.js';
import { FootAnatomyScene } from '../src/scenes/musculoskeletal/scenes/footAnatomy/FootAnatomyScene.js';
import { HandAnatomyScene } from '../src/scenes/musculoskeletal/scenes/handAnatomy/HandAnatomyScene.js';
import { PelvicFloorAnatomyScene } from '../src/scenes/musculoskeletal/scenes/pelvicFloorAnatomy/PelvicFloorAnatomyScene.js';
import { OralAnatomyScene } from '../src/scenes/gastrointestinal/scenes/oralAnatomy/OralAnatomyScene.js';
import { LarynxAnatomyScene } from '../src/scenes/respiratory/scenes/larynxAnatomy/LarynxAnatomyScene.js';
import { NoseAnatomyScene } from '../src/scenes/respiratory/scenes/noseAnatomy/NoseAnatomyScene.js';
import { SpineAnatomyScene } from '../src/scenes/musculoskeletal/scenes/spineAnatomy/SpineAnatomyScene.js';
import { BreastAnatomyScene } from '../src/scenes/reproductive/scenes/breastAnatomy/BreastAnatomyScene.js';
import { LymphaticDrainageScene } from '../src/scenes/hematologic/scenes/lymphaticDrainage/LymphaticDrainageScene.js';
import { LymphNodeAnatomyScene } from '../src/scenes/hematologic/scenes/lymphNodeAnatomy/LymphNodeAnatomyScene.js';
import { SkinAnatomyScene } from '../src/scenes/integumentary/scenes/skinAnatomy/SkinAnatomyScene.js';
import { EarAnatomyScene } from '../src/scenes/sensory/scenes/earAnatomy/EarAnatomyScene.js';
import { EyeAnatomyScene } from '../src/scenes/sensory/scenes/eyeAnatomy/EyeAnatomyScene.js';
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
  { id: 'lung-anatomy', Scene: LungAnatomyScene, minimum: 60 },
  { id: 'liver-anatomy', Scene: LiverAnatomyScene, minimum: 20 },
  { id: 'kidney-anatomy', Scene: KidneyAnatomyScene, minimum: 25 },
  { id: 'stomach-anatomy', Scene: StomachAnatomyScene, minimum: 7 },
  { id: 'intestine-anatomy', Scene: IntestineAnatomyScene, minimum: 8 },
  { id: 'pancreas-anatomy', Scene: PancreasAnatomyScene, minimum: 6 },
  { id: 'thyroid-anatomy', Scene: ThyroidAnatomyScene, minimum: 10 },
  { id: 'spleen-anatomy', Scene: SpleenAnatomyScene, minimum: 6 },
  { id: 'bladder-anatomy', Scene: BladderAnatomyScene, minimum: 9 },
  { id: 'biliary-anatomy', Scene: BiliaryAnatomyScene, minimum: 10 },
  { id: 'esophagus-anatomy', Scene: EsophagusAnatomyScene, minimum: 10 },
  { id: 'adrenal-anatomy', Scene: AdrenalAnatomyScene, minimum: 9 },
  { id: 'uterus-anatomy', Scene: UterusAnatomyScene, minimum: 10 },
  { id: 'prostate-anatomy', Scene: ProstateAnatomyScene, minimum: 12 },
  { id: 'male-tract-anatomy', Scene: MaleTractAnatomyScene, minimum: 12 },
  { id: 'knee-anatomy', Scene: KneeAnatomyScene, minimum: 15 },
  { id: 'shoulder-anatomy', Scene: ShoulderAnatomyScene, minimum: 18 },
  { id: 'hip-anatomy', Scene: HipAnatomyScene, minimum: 13 },
  { id: 'pelvis-anatomy', Scene: PelvisAnatomyScene, minimum: 16 },
  { id: 'abdomen-anatomy', Scene: AbdomenAnatomyScene, minimum: 18 },
  { id: 'thorax-anatomy', Scene: ThoraxAnatomyScene, minimum: 18 },
  { id: 'elbow-anatomy', Scene: ElbowAnatomyScene, minimum: 16 },
  { id: 'neck-anatomy', Scene: NeckAnatomyScene, minimum: 18 },
  { id: 'skeleton-overview', Scene: SkeletonOverviewScene, minimum: 16 },
  { id: 'foot-anatomy', Scene: FootAnatomyScene, minimum: 18 },
  { id: 'hand-anatomy', Scene: HandAnatomyScene, minimum: 19 },
  { id: 'pelvic-floor-anatomy', Scene: PelvicFloorAnatomyScene, minimum: 15 },
  { id: 'oral-anatomy', Scene: OralAnatomyScene, minimum: 17 },
  { id: 'larynx-anatomy', Scene: LarynxAnatomyScene, minimum: 17 },
  { id: 'nose-anatomy', Scene: NoseAnatomyScene, minimum: 17 },
  { id: 'spine-anatomy', Scene: SpineAnatomyScene, minimum: 13 },
  { id: 'breast-anatomy', Scene: BreastAnatomyScene, minimum: 9 },
  { id: 'lymphatic-drainage', Scene: LymphaticDrainageScene, minimum: 8 },
  { id: 'lymph-node-anatomy', Scene: LymphNodeAnatomyScene, minimum: 6 },
  { id: 'skin-anatomy', Scene: SkinAnatomyScene, minimum: 9 },
  { id: 'ear-anatomy', Scene: EarAnatomyScene, minimum: 10 },
  { id: 'eye-anatomy', Scene: EyeAnatomyScene, minimum: 15 },
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
    // Every scene has something that gets out of the way. Not every scene has
    // something underneath it: a stomach has no second layer in this model, and
    // there the slider's job is to let the reader see through the wall to the
    // outlet behind it rather than to reveal a structure that was not there.
    assert.ok(outer.length > 0, `${entry.id}: something has to get out of the way`);

    // Measured against each structure's own resting opacity rather than against
    // 1. Not every outer layer is opaque to begin with — a body silhouette
    // drawn for scale is a ghost at rest and still has to get out of the way —
    // and the invariant worth holding is that the slider moves a layer *from*
    // where it sits *towards* transparent, not that it started solid.
    settle(scene, 0);
    for (const structure of outer) {
      assert.ok(
        structure.currentOpacity > structure.baseOpacity * 0.85,
        `${entry.id}/${structure.id} starts at its resting opacity`
      );
    }
    for (const structure of inner) assert.ok(structure.currentOpacity < 0.05, `${entry.id}/${structure.id} starts hidden`);

    settle(scene, 1);
    for (const structure of outer) {
      assert.ok(
        structure.currentOpacity < structure.baseOpacity * 0.35,
        `${entry.id}/${structure.id} steps back`
      );
    }
    for (const structure of inner) {
      assert.ok(
        structure.currentOpacity > structure.baseOpacity * 0.6,
        `${entry.id}/${structure.id} comes up`
      );
    }

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

test('a lung segment and the bronchus that ventilates it are two structures', () => {
  const scene = sceneFor(SCENES[0]);
  // The failure this guards: offering the segmental bronchus and calling it the
  // segment. A reader who asks for S3 is asking for lung, not for a tube.
  const parenchyma = scene.structures.filter((structure) => structure.id.startsWith('segment:'));
  const bronchi = scene.structures.filter((structure) => /segmental-bronchus$/.test(structure.id));
  assert.equal(parenchyma.length, 18, 'eighteen segments');
  assert.equal(bronchi.length, 18, 'and eighteen segmental bronchi');

  for (const segment of parenchyma) {
    const id = segment.id.slice('segment:'.length);
    const bronchus = bronchi.find((entry) => entry.id === `airway:${id}-segmental-bronchus`);
    assert.ok(bronchus, `${id} has a bronchus of its own`);
    assert.notEqual(segment.name, bronchus.name, `${id}: the segment and its bronchus are named apart`);
    assert.ok(segment.meshes[0] !== bronchus.meshes[0], `${id}: and they are different meshes`);
    assert.ok(
      segment.hierarchy.includes('Bronchopulmonary segments'),
      `${id}: the parenchyma is filed as a segment`
    );
    assert.ok(bronchus.hierarchy[0] === 'Airways', `${id}: the bronchus is filed as an airway`);
  }

  // And they are on different layers, so the two never compete for one click.
  settle(scene, 0.45);
  assert.ok(parenchyma[0].currentOpacity > 0.8, 'the segments are what the middle of the slider shows');
  assert.ok(bronchi[0].currentOpacity < 0.05, 'and the bronchi are not there yet');
  settle(scene, 0);
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

test('a scene can say what it is about, which is not everything it draws', () => {
  for (const entry of SCENES) {
    const scene = sceneFor(entry);
    const subject = scene.getSubjectBounds();
    assert.ok(!subject.isEmpty(), `${entry.id}: has a subject`);
    const size = subject.getSize(new THREE.Vector3());
    assert.ok(size.x > 0 && size.y > 0 && size.z > 0, `${entry.id}: with an extent`);

    // Measured in world space, not in whatever local frame the meshes were
    // built in: an organ placed away from the origin has to come back where it
    // was put, and `Box3.expandByObject` does not refresh its parents.
    const everything = scene.getSubjectBounds({ excludeTags: [] });
    assert.ok(everything.containsBox(subject), `${entry.id}: the subject is part of the scene`);
  }

  // The kidney is the one that has to narrow: it draws the whole tract, and a
  // frame that fits the bladder makes the organ it is named after too small.
  const kidney = sceneFor(SCENES.find((entry) => entry.id === 'kidney-anatomy'));
  const subject = kidney.getSubjectBounds().getSize(new THREE.Vector3());
  const everything = kidney.getSubjectBounds({ excludeTags: [] }).getSize(new THREE.Vector3());
  assert.ok(subject.y < everything.y * 0.6, 'the kidney subject is much shorter than the tract it drains into');
});

/**
 * Viewpoints that are close-ups of one structure rather than views of the
 * organ. They crop by design, so they are not what a whole-organ frame is
 * measured against — `#/kidney-anatomy` opening on one hilum would be the
 * scene failing, not the framing succeeding.
 */
const DETAIL_VIEWS = new Set([
  'kidney-anatomy:left-kidney',
  'kidney-anatomy:left-hilum',
  'kidney-anatomy:coronal-section',
  'stomach-anatomy:outlet',
  'pancreas-anatomy:head',
  'thyroid-anatomy:right-lobe',
  'biliary-anatomy:confluence',
  'biliary-anatomy:outlet',
  'adrenal-anatomy:right-gland',
  'adrenal-anatomy:left-gland',
  'esophagus-anatomy:crossing',
  'esophagus-anatomy:hiatus',
  'uterus-anatomy:adnexa',
  'prostate-anatomy:vesicles',
  'male-tract-anatomy:testis',
  'male-tract-anatomy:junction',
  // The bones are hidden in one and cut away in the other, so neither is
  // showing the whole joint.
  'knee-anatomy:ligaments-only',
  'knee-anatomy:plateau-from-above',
  // The humerus is hidden in one and every bone in the other; neither shows
  // the whole joint.
  'shoulder-anatomy:socket',
  'shoulder-anatomy:cuff-only',
  'shoulder-anatomy:arch',
  // Cut open in one, the femur hidden in another, every bone gone in the third.
  'hip-anatomy:coronal-section',
  'hip-anatomy:socket',
  'hip-anatomy:ligaments-only',
  'pelvis-anatomy:floor',
  'pelvis-anatomy:pouch',
  'pelvis-anatomy:bridge',
  'abdomen-anatomy:transpyloric',
  'abdomen-anatomy:great-vessels',
  'abdomen-anatomy:wall',
  'thorax-anatomy:hilum',
  'thorax-anatomy:recess',
  'thorax-anatomy:mediastinum',
  'elbow-anatomy:medial',
  'elbow-anatomy:lateral',
  'elbow-anatomy:hinge',
  'elbow-anatomy:cubital-fossa',
  'elbow-anatomy:sagittal',
  'neck-anatomy:recurrent-nerves',
  'neck-anatomy:thyroid-bed',
  'neck-anatomy:sheath',
  'neck-anatomy:sagittal',
  'skeleton-overview:shoulder-join',
  'skeleton-overview:pelvic-join',
  'foot-anatomy:the-arch',
  'foot-anatomy:the-ankle',
  'foot-anatomy:ligaments',
  'hand-anatomy:carpus',
  'hand-anatomy:across-the-tunnel',
  'hand-anatomy:through-the-tunnel',
  'pelvic-floor-anatomy:the-sling',
  'pelvic-floor-anatomy:the-gap',
  'oral-anatomy:underneath',
  'oral-anatomy:glands',
  'larynx-anatomy:from-above',
  'larynx-anatomy:front-of-neck',
  'nose-anatomy:turbinates',
  'nose-anatomy:drainage',
  'nose-anatomy:coronal',
  'nose-anatomy:airway',
  'spine-anatomy:segment',
  'spine-anatomy:arch',
  'spine-anatomy:canal',
  'breast-anatomy:ducts',
  'breast-anatomy:axilla',
  'breast-anatomy:lateral',
  'lymphatic-drainage:venous-angles',
  'lymphatic-drainage:routes-only',
  'lymph-node-anatomy:hilum',
  'lymph-node-anatomy:section',
  'skin-anatomy:surface',
  'skin-anatomy:follicle',
  'skin-anatomy:contents',
  'ear-anatomy:middle-ear',
  'ear-anatomy:inner-ear',
  'ear-anatomy:ossicles',
  'ear-anatomy:outer-ear',
  'eye-anatomy:fundus',
  // Down the axis from behind: it sees the length of the nerve rather than the
  // eye, and measuring the reserve against it makes every other view tiny.
  'eye-anatomy:posterior',
  'eye-anatomy:sagittal-section',
  'eye-anatomy:muscles',
]);

/**
 * The aspect at which `view` fills the frame's width with `box`, at the
 * distance the view itself authored. Above it the subject fits; below it the
 * frame is cutting the organ off at the sides.
 */
function widthAspect(box, view, fovDegrees = 42) {
  const eye = new THREE.Vector3().fromArray(view.position);
  const target = new THREE.Vector3().fromArray(view.target);
  const camera = new THREE.PerspectiveCamera(fovDegrees, 1.6, 0.1, 100);
  camera.position.copy(eye);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  const toCamera = new THREE.Matrix4().copy(camera.matrixWorld).invert();
  const corner = new THREE.Vector3();
  let halfWidth = 0;
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        corner.set(x, y, z).applyMatrix4(toCamera);
        halfWidth = Math.max(halfWidth, Math.abs(corner.x));
      }
    }
  }
  const tanVertical = Math.tan((fovDegrees * Math.PI) / 180 / 2);
  return halfWidth / (eye.distanceTo(target) * tanVertical);
}

test('the width a scene reserves is the width its subject actually needs', () => {
  // `minHorizontalAspect` is a measurement of the subject, not a hand-set
  // number that happens to look right on one window — and not a stand-in for
  // the parts panel, which covers the same slice of the canvas at every aspect.
  // What is checked is that every whole-organ view still fits inside what the
  // scene declares, and that the declaration is not inflated far past it.
  for (const entry of SCENES) {
    const scene = sceneFor(entry);
    const reserve = entry.Scene.framing?.minHorizontalAspect;
    assert.ok(reserve, `${entry.id}: declares the frame shape it needs`);
    const box = scene.getSubjectBounds();

    // Close-ups crop on purpose; the reserve is measured against the views that
    // are meant to show the whole organ, which are the ones the scene opens on.
    const wide = (entry.Scene.views ?? []).filter((view) => view.position && !DETAIL_VIEWS.has(`${entry.id}:${view.id}`));
    assert.ok(wide.length >= 2, `${entry.id}: has whole-organ views to measure`);
    let widest = widthAspect(box, {
      position: entry.Scene.cameraPose.position.toArray(),
      target: entry.Scene.cameraPose.target.toArray(),
    });
    for (const view of wide) widest = Math.max(widest, widthAspect(box, view));

    assert.ok(widest <= reserve, `${entry.id}: reserves at least what it needs (${widest.toFixed(2)} > ${reserve})`);
    assert.ok(
      reserve <= widest * 1.35,
      `${entry.id}: and not far more than it needs (${reserve} vs ${widest.toFixed(2)})`
    );
  }
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

test('a reader can take a structure out of the way, on every organ', () => {
  // Until F-119 these scenes had isolation, viewpoint tags, cuts and the layer
  // slider, and no hiding at all — so "show me only this" was possible on all
  // thirty-nine and "take this out of the way and let me see behind it" was
  // possible on none. The panel drew a Hide button anyway and its press reached
  // an optional call that was skipped, so the control did nothing.
  for (const entry of SCENES) {
    const scene = sceneFor(entry);
    scene.showAllHiddenStructures();
    const target = scene.structures.find((structure) => structure.revealAt === 0);
    assert.ok(target, `${entry.id}: no structure the slider is already showing`);

    assert.equal(scene.setStructureHidden(target.id, true), true, entry.id);
    assert.deepEqual(scene.getAnatomyVisibility().hidden, [target.id], entry.id);
    assert.equal(target.currentOpacity, 0, `${entry.id}: a hidden structure is still drawn`);
    for (const mesh of target.meshes) {
      assert.equal(mesh.visible, false, `${entry.id}: a hidden mesh is still drawn`);
      // The same trap isolation has: a ray does not know a mesh is invisible.
      assert.equal(scene._isPickable(mesh), false, `${entry.id}: a hidden mesh is still pickable`);
    }
    // Hidden is not gone: the structure keeps its name and its place.
    assert.equal(scene.selectStructure(target.id), true, `${entry.id}: a hidden structure lost its name`);

    assert.equal(scene.setStructureHidden(target.id, false), true, entry.id);
    assert.equal(target.currentOpacity > 0, true, `${entry.id}: unhiding did not bring it back`);
    assert.deepEqual(scene.getAnatomyVisibility().hidden, [], entry.id);
  }
});

test('a branch comes off in one change, and Unhide all brings it back', () => {
  for (const entry of SCENES) {
    const scene = sceneFor(entry);
    scene.showAllHiddenStructures();
    const ids = scene.structures.filter((structure) => structure.revealAt === 0).map((s) => s.id);
    assert.ok(ids.length > 0, entry.id);

    let announcements = 0;
    const stop = scene.onAnatomyVisibility(() => { announcements += 1; });
    assert.equal(scene.setStructuresHidden(ids, true), true, entry.id);
    // One pass and one announcement for the whole set — the reason the batch
    // setter exists rather than a loop over the single one.
    assert.equal(announcements, 1, `${entry.id}: announced once per structure`);
    assert.deepEqual(
      [...scene.getAnatomyVisibility().hidden].sort(),
      [...ids].sort(),
      entry.id
    );

    assert.equal(scene.showAllHiddenStructures(), true, entry.id);
    assert.deepEqual(scene.getAnatomyVisibility().hidden, [], entry.id);
    assert.equal(scene.showAllHiddenStructures(), false, `${entry.id}: nothing hidden is not a change`);
    stop();
  }
});

test('hiding the isolated structure ends the isolation and says so', () => {
  for (const entry of SCENES) {
    const scene = sceneFor(entry);
    scene.showAllHiddenStructures();
    const target = scene.structures.find((structure) => structure.revealAt === 0);
    scene.isolateStructure(target.id);
    assert.equal(scene.getAnatomyIsolation(), target.id, entry.id);

    let announced = 'unset';
    const stop = scene.onAnatomyIsolation((value) => { announced = value; });
    scene.setStructureHidden(target.id, true);
    // "Only this one" and "not this one" cannot both be true, and the part tree
    // learns about isolation from this event and nowhere else.
    assert.equal(scene.getAnatomyIsolation(), null, `${entry.id}: the isolation survived the hide`);
    assert.equal(announced, null, `${entry.id}: the isolation ended without saying so`);
    stop();
    scene.showAllHiddenStructures();
  }
});
