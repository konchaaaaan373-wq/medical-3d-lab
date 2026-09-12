import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { buildStomachParts } from '../src/scenes/gastrointestinal/organs/stomachParts.js';
import { buildStomach, buildEsophagus } from '../src/scenes/gastrointestinal/organs/stomach.js';
import { buildColonParts } from '../src/scenes/gastrointestinal/organs/colonParts.js';
import { buildColon } from '../src/scenes/gastrointestinal/organs/intestine.js';
import { buildPancreasParts } from '../src/scenes/hepatobiliary/organs/pancreasParts.js';
import { buildDuodenum } from '../src/scenes/gastrointestinal/organs/intestine.js';
import { buildThyroidParts } from '../src/scenes/endocrine/organs/thyroidAnatomy.js';
import { buildSpleen } from '../src/scenes/hematologic/organs/spleen.js';
import { SEGMENT_PLANE_Y, buildSpleenParts } from '../src/scenes/hematologic/organs/spleenParts.js';
import { TRIGONE_CORNERS, buildBladderParts } from '../src/scenes/renal/organs/bladderParts.js';
import { buildBiliaryTree } from '../src/scenes/hepatobiliary/organs/biliaryTree.js';
import {
  CONSTRICTIONS,
  buildEsophagusParts,
  esophagusCalibre,
} from '../src/scenes/gastrointestinal/organs/esophagusParts.js';
import { CORTEX_SHARE_OF_GLAND, ZONE_DISPLAY_BANDS, ADRENAL_SITES, buildAdrenalParts } from '../src/scenes/endocrine/organs/adrenalAnatomy.js';
import { CAVITY_CORNERS, buildUterusParts } from '../src/scenes/reproductive/organs/uterusParts.js';
import { UterusAnatomyScene } from '../src/scenes/reproductive/scenes/uterusAnatomy/UterusAnatomyScene.js';
import { buildProstateZones } from '../src/scenes/reproductive/organs/prostateAnatomy.js';
import { buildMaleTract } from '../src/scenes/reproductive/organs/maleTract.js';
import { ATTACHMENTS, MEDIAL, buildKneeJoint } from '../src/scenes/musculoskeletal/organs/kneeJoint.js';
import { MEDIAL as SHOULDER_MEDIAL, buildShoulderJoint } from '../src/scenes/musculoskeletal/organs/shoulderJoint.js';
import { MEDIAL as HIP_MEDIAL, buildHipJoint } from '../src/scenes/musculoskeletal/organs/hipJoint.js';
import { NASAL as EYE_NASAL, buildEyeball } from '../src/scenes/sensory/organs/eyeball.js';
import { MEDIAL as EAR_MEDIAL, buildEar } from '../src/scenes/sensory/organs/ear.js';
import {
  LAYER_DISPLAY_THICKNESS as SKIN_LAYERS,
  reteWave as SKIN_RETE,
  buildSkinBlock,
} from '../src/scenes/integumentary/organs/skinBlock.js';
import {
  DISPLAY as NECK_DISPLAY,
  LEFT as NECK_LEFT,
  LEVELS as NECK_LEVELS,
  SHEATH as NECK_SHEATH,
  WORLD_SCALE as NECK_SCALE,
  airwayAt,
  buildNeck,
  grooveAt,
  oesophagusAt,
  sheathAt,
  sheathContentAt,
} from '../src/scenes/regional/organs/neck.js';
import {
  HINGE as ELBOW_HINGE,
  MEDIAL as ELBOW_MEDIAL,
  buildElbowJoint,
  collateralOrigin,
  trochleaRadiusAt,
} from '../src/scenes/musculoskeletal/organs/elbowJoint.js';
import {
  AIRWAY,
  LEFT as THORAX_LEFT,
  LEVELS as THORAX_LEVELS,
  WORLD_SCALE as THORAX_SCALE,
  bronchusPath,
  buildThorax,
  mediastinumSection,
  ribPath,
} from '../src/scenes/regional/organs/thorax.js';
import {
  LEFT as ABDOMEN_LEFT,
  LEVELS as ABDOMEN_LEVELS,
  WORLD_SCALE as ABDOMEN_SCALE,
  aortaAt,
  buildAbdomen,
  cavaAt,
  isRetroperitoneal,
  kidneyAt,
  peritoneumBackAt,
  psoasAt,
} from '../src/scenes/regional/organs/abdomen.js';
import {
  FEMALE_SET as PELVIS_FEMALE_SET,
  LEFT as PELVIS_LEFT,
  LEVELS as PELVIS_LEVELS,
  MALE_SET as PELVIS_MALE_SET,
  UNDER_THE_BRIDGE,
  WORLD_SCALE as PELVIS_SCALE,
  bridgeAt,
  buildPelvis,
  edgeOfHiatus,
  floorAt,
  inHiatus,
  pelvisSection,
} from '../src/scenes/regional/organs/pelvis.js';
import { buildLymphNode } from '../src/scenes/hematologic/organs/lymphNode.js';
import { LEFT as LYMPH_LEFT, buildLymphaticRoutes } from '../src/scenes/hematologic/organs/lymphaticRoutes.js';
import { MEDIAL as BREAST_MEDIAL, buildBreast } from '../src/scenes/reproductive/organs/breast.js';
import {
  FORWARD as SPINE_FORWARD,
  spineAt as SPINE_AT,
  buildSpine,
} from '../src/scenes/musculoskeletal/organs/spine.js';
import {
  LEVELS as BODY_LEVELS,
  buildSkeleton,
} from '../src/scenes/musculoskeletal/organs/skeleton.js';
import {
  ARCH,
  MEDIAL as FOOT_MEDIAL,
  RAYS as FOOT_RAYS,
  raySegment as footSegment,
  buildFoot,
} from '../src/scenes/musculoskeletal/organs/foot.js';
import {
  CARPALS,
  RADIAL as HAND_RADIAL,
  RAYS,
  TUNNEL,
  raySegment,
  buildHand,
} from '../src/scenes/musculoskeletal/organs/hand.js';
import {
  HIATUS_BACK_T,
  levatorOrigin,
  buildPelvicFloor,
} from '../src/scenes/musculoskeletal/organs/pelvicFloor.js';
import {
  JAW_DISPLAY_OPENING,
  LEVELS as ORAL_LEVELS,
  SULCUS_Z,
  buildOralCavity,
} from '../src/scenes/gastrointestinal/organs/oralCavity.js';
import {
  GLOTTIS_DISPLAY_GAP,
  LEVELS as LARYNX_LEVELS,
  pharynxFrontAt,
  buildLarynx,
} from '../src/scenes/respiratory/organs/larynx.js';
import {
  CAVITY as NOSE_CAVITY,
  MEDIAL as NOSE_MEDIAL,
  TURBINATES as NOSE_TURBINATES,
  turbinateEdge as noseTurbinateEdge,
  turbinateSurface as noseTurbinateSurface,
  buildNose,
} from '../src/scenes/respiratory/organs/nose.js';

/**
 * The three organs that were one tube each, now cut into named parts.
 *
 * What is checked here is what makes a division a division rather than a
 * label: that the parts run in the order the names do, that between them they
 * cover the organ once, that each one is where its name says it is, and that
 * the cut organ is still the organ that was there before.
 *
 * Frontal view throughout, so screen-right (`+x`) is the patient's **left**.
 * Every side assertion below goes through `patientSide` rather than reading a
 * sign, because that is the rule the whole repository shares and guessing at it
 * is how a mirrored organ passes a test.
 */
const patientSide = (point) => (point.x > 0 ? 'left' : 'right');

/** The parts cover the organ once: contiguous, in order, from end to end. */
function assertPartition(parts, label) {
  assert.ok(parts.length > 1, `${label}: more than one part`);
  assert.equal(parts[0].from, 0, `${label}: the first part starts at the beginning`);
  assert.equal(parts.at(-1).to, 1, `${label}: the last part ends at the end`);
  for (const [index, part] of parts.entries()) {
    assert.ok(part.to > part.from, `${label}/${part.id} covers something`);
    if (index === 0) continue;
    assert.ok(
      Math.abs(part.from - parts[index - 1].to) < 1e-9,
      `${label}: ${parts[index - 1].id} and ${part.id} leave a gap or overlap`
    );
  }
}

const centre = (mesh) => new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());

// --- stomach ---------------------------------------------------------------

test('the stomach is cut into its named regions, in order, covering it once', () => {
  const stomach = buildStomachParts();
  assert.deepEqual(
    stomach.parts.map((part) => part.id),
    ['fundus', 'cardia', 'body', 'antrum', 'pyloric-canal']
  );
  assertPartition(stomach.parts, 'stomach');
});

test('the fundus is the dome above the opening, and the pylorus is on the right', () => {
  const stomach = buildStomachParts();
  const at = (id) => centre(stomach.part(id).mesh);
  assert.ok(at('fundus').y > at('cardia').y, 'the fundus is above the cardia');
  assert.ok(at('cardia').y > at('body').y, 'and the cardia above the body');
  assert.ok(at('body').y > at('antrum').y, 'and the body above the antrum');
  // The stomach runs from the patient's left across to the right, which is why
  // an inhaled meal leaves towards the midline rather than back the way it came.
  assert.equal(patientSide(at('fundus')), 'left', 'the fundus');
  assert.equal(patientSide(at('pyloric-canal')), 'right', 'the pyloric canal');
});

test('the cardia is where the oesophagus actually ends, not a number beside it', () => {
  const stomach = buildStomachParts();
  const oesophagus = buildEsophagus();
  const end = oesophagus.curve.getPointAt(1);

  const cardia = stomach.part('cardia');
  assert.ok(
    cardia.from <= stomach.cardiaAt && stomach.cardiaAt <= cardia.to,
    'the junction falls inside the part named for it'
  );
  // And the part is actually there: its box contains the point the oesophagus
  // stops at, which is the claim the derivation exists to make.
  const box = new THREE.Box3().setFromObject(cardia.mesh);
  assert.ok(box.distanceToPoint(end) < 0.08, `the cardia is ${box.distanceToPoint(end).toFixed(3)} from the junction`);
  oesophagus.dispose();
});

test('cutting the stomach up leaves the same stomach', () => {
  const whole = buildStomach();
  const parts = buildStomachParts();
  const wholeBox = new THREE.Box3().setFromObject(whole.object);
  const partsBox = new THREE.Box3();
  for (const part of parts.parts) partsBox.expandByObject(part.mesh);
  // The parts are the wall, so they sit inside the whole stomach's extent (the
  // whole includes the sphincter ring) and reach nearly all of it.
  for (const axis of ['x', 'y', 'z']) {
    assert.ok(
      partsBox.min[axis] >= wholeBox.min[axis] - 0.02 && partsBox.max[axis] <= wholeBox.max[axis] + 0.02,
      `the cut stomach stays inside the whole one on ${axis}`
    );
    const wholeSpan = wholeBox.max[axis] - wholeBox.min[axis];
    const partSpan = partsBox.max[axis] - partsBox.min[axis];
    assert.ok(partSpan > wholeSpan * 0.85, `and still spans it on ${axis}`);
  }
  whole.dispose();
});

// --- colon -----------------------------------------------------------------

test('the colon is cut into its named parts, in order, covering it once', () => {
  const colon = buildColonParts();
  assert.deepEqual(
    colon.parts.map((part) => part.id),
    [
      'caecum',
      'ascending-colon',
      'right-colic-flexure',
      'transverse-colon',
      'left-colic-flexure',
      'descending-colon',
      'sigmoid-colon',
    ]
  );
  assertPartition(colon.parts, 'colon');
});

test('each part of the colon is on the side and at the height its name says', () => {
  const colon = buildColonParts();
  const at = (id) => centre(colon.part(id).mesh);

  assert.equal(patientSide(at('caecum')), 'right', 'the caecum');
  assert.equal(patientSide(at('ascending-colon')), 'right', 'the ascending colon');
  assert.equal(patientSide(at('right-colic-flexure')), 'right', 'the hepatic flexure');
  assert.equal(patientSide(at('left-colic-flexure')), 'left', 'the splenic flexure');
  assert.equal(patientSide(at('descending-colon')), 'left', 'the descending colon');

  assert.ok(at('ascending-colon').y > at('caecum').y, 'the ascending colon is above the caecum');
  assert.ok(at('right-colic-flexure').y > at('ascending-colon').y, 'and the flexure above that');
  assert.ok(at('sigmoid-colon').y < at('descending-colon').y, 'the sigmoid is below the descending colon');
});

test('the splenic flexure is the higher of the two', () => {
  // The relation, and it was the wrong way round: the spleen sits higher than
  // the liver's inferior surface, so the colon turns down from further up on
  // the left than it turned across on the right. It is why the splenic flexure
  // is the more acute of the two and the harder one to get an endoscope round.
  const colon = buildColonParts();
  const left = centre(colon.part('left-colic-flexure').mesh);
  const right = centre(colon.part('right-colic-flexure').mesh);
  assert.ok(left.y > right.y, `splenic ${left.y.toFixed(2)} is not above hepatic ${right.y.toFixed(2)}`);
});

test('the colon\'s parts come in the order of length every description agrees on', () => {
  // The *order*, not the ratios. The abdomen this colon is drawn in is a fixed
  // frame, so a transverse colon twice the descending — which is the figure
  // texts give — is not reachable without stretching the frame; here it is
  // about 1.1 times. What is reachable, and what was wrong, is the order: the
  // transverse was drawn as a shallow bridge and the sigmoid as a short
  // diagonal, which made them the two *shortest* named lengths instead of the
  // two longest. Do not read these numbers as a claim about length.
  const colon = buildColonParts();
  const length = (id) => {
    const part = colon.part(id);
    let total = 0;
    let previous = colon.curve.getPointAt(part.from);
    for (let i = 1; i <= 200; i += 1) {
      const point = colon.curve.getPointAt(part.from + (part.to - part.from) * (i / 200));
      total += point.distanceTo(previous);
      previous = point;
    }
    return total;
  };
  const order = ['transverse-colon', 'sigmoid-colon', 'descending-colon', 'ascending-colon', 'caecum'];
  const measured = order.map(length);
  for (let i = 1; i < order.length; i += 1) {
    assert.ok(
      measured[i - 1] > measured[i],
      `${order[i - 1]} (${measured[i - 1].toFixed(2)}) should be longer than ${order[i]} (${measured[i].toFixed(2)})`
    );
  }
});

test('the transverse colon is the part that crosses, and it sags between the flexures', () => {
  const colon = buildColonParts();
  // Its *width*, not its length: what this one claims is the direction each
  // part runs in. The lengths are the test above.
  const width = (id) => new THREE.Box3().setFromObject(colon.part(id).mesh).getSize(new THREE.Vector3()).x;
  for (const id of ['ascending-colon', 'descending-colon', 'sigmoid-colon', 'caecum']) {
    assert.ok(width('transverse-colon') > width(id), `the transverse colon crosses further than the ${id}`);
  }
  const mid = colon.curve.getPointAt((colon.landmarksAt.transverse + colon.landmarksAt.leftColicFlexure) / 2);
  const left = centre(colon.part('left-colic-flexure').mesh);
  assert.ok(mid.y < left.y, 'the middle of the transverse colon hangs below the splenic flexure');
});

test('the offset moves the parts and the curve together', () => {
  const colon = buildColonParts({ offset: [0, 0, -0.55] });
  const plain = buildColonParts();
  const moved = centre(colon.part('caecum').mesh);
  const still = centre(plain.part('caecum').mesh);
  assert.ok(Math.abs(moved.z - (still.z - 0.55)) < 1e-6, 'the mesh moved');
  assert.ok(Math.abs(colon.curve.getPointAt(0).z - (plain.curve.getPointAt(0).z - 0.55)) < 1e-6, 'and so did the curve');
});

// --- pancreas --------------------------------------------------------------

test('the pancreas is cut into head, neck, body and tail, covering it once', () => {
  const pancreas = buildPancreasParts();
  assert.deepEqual(pancreas.parts.map((part) => part.id), ['head', 'neck', 'body', 'tail']);
  assertPartition(pancreas.parts, 'pancreas');
});

test('the head is the bulkiest part and the neck the narrowest', () => {
  const pancreas = buildPancreasParts();
  const thickness = (id) => {
    const size = new THREE.Box3().setFromObject(pancreas.part(id).mesh).getSize(new THREE.Vector3());
    // Across the axis, not along it: the body is the longest part and that says
    // nothing about how thick it is.
    return Math.min(size.y, size.z);
  };
  assert.ok(thickness('head') > thickness('neck'), 'the head is thicker than the neck');
  assert.ok(thickness('head') > thickness('body'), 'and than the body');
  assert.ok(thickness('body') > thickness('tail'), 'and the tail is the thinnest');
});

test('the pancreas runs from a head on the right to a tail on the left', () => {
  const pancreas = buildPancreasParts();
  const at = (id) => centre(pancreas.part(id).mesh);
  assert.equal(patientSide(at('head')), 'right', 'the head');
  assert.equal(patientSide(at('tail')), 'left', 'the tail');
  assert.ok(at('head').x < at('neck').x, 'head, neck, body and tail run in that order');
  assert.ok(at('neck').x < at('body').x);
  assert.ok(at('body').x < at('tail').x);
});

test('the pancreatic head sits inside the duodenal C', () => {
  // The relationship most of the head's position means: a mass here obstructs
  // the bile duct and the duodenum before it does anything else.
  const pancreas = buildPancreasParts();
  const duodenum = buildDuodenum();
  const head = centre(pancreas.part('head').mesh);

  // "Inside the C" is about *wrapping*, not about distance: the loop has to come
  // round the head rather than lie beside it. Measured as the angle the loop
  // covers about the head in the coronal plane — a distance threshold says the
  // same thing only for one particular size of head, and stopped being true
  // when the head's free end was rounded off.
  const probe = new THREE.Vector3();
  const angles = [];
  let nearest = Infinity;
  for (let i = 0; i <= 90; i += 1) {
    duodenum.curve.getPointAt(i / 90, probe);
    nearest = Math.min(nearest, probe.distanceTo(head));
    angles.push(Math.atan2(probe.y - head.y, probe.x - head.x));
  }
  angles.sort((a, b) => a - b);
  // The widest gap between neighbouring directions, wrapped: what the loop does
  // *not* cover. A C is open on one side, so a gap is expected — but a small one.
  let gap = angles[0] + 2 * Math.PI - angles.at(-1);
  for (let i = 1; i < angles.length; i += 1) gap = Math.max(gap, angles[i] - angles[i - 1]);
  const covered = ((2 * Math.PI - gap) * 180) / Math.PI;

  assert.ok(nearest < 0.9, `the duodenum comes within ${nearest.toFixed(2)} of the head`);
  assert.ok(covered > 180, `the loop only comes ${covered.toFixed(0)}° round the head`);
  duodenum.dispose();
});

test('the duct runs the whole length of the gland, inside it', () => {
  const pancreas = buildPancreasParts();
  const duct = new THREE.Box3().setFromObject(pancreas.duct);
  const gland = new THREE.Box3();
  for (const part of pancreas.parts) gland.expandByObject(part.mesh);

  assert.ok(duct.min.x >= gland.min.x - 1e-6 && duct.max.x <= gland.max.x + 1e-6, 'the duct stays within the gland');
  const ductSpan = duct.max.x - duct.min.x;
  const glandSpan = gland.max.x - gland.min.x;
  // Not quite all of it: the gland's two ends are domes, and a duct drawn to
  // the very tip of the tail comes out of the organ. What has to be true is
  // that it runs the gland rather than a stretch of it.
  assert.ok(ductSpan > glandSpan * 0.85, `the duct covers ${((ductSpan / glandSpan) * 100).toFixed(0)}% of the gland`);
});

test('the islets are scattered along the gland rather than gathered in one part', () => {
  const pancreas = buildPancreasParts();
  const xs = pancreas.islets.children.map((islet) => islet.position.x);
  assert.ok(xs.length >= 10, 'there are enough of them to say "scattered"');
  const spread = Math.max(...xs) - Math.min(...xs);
  const gland = new THREE.Box3();
  for (const part of pancreas.parts) gland.expandByObject(part.mesh);
  assert.ok(spread > (gland.max.x - gland.min.x) * 0.5, 'and they reach across the gland');
});

// --- thyroid ---------------------------------------------------------------

test('the thyroid is in front of the trachea and everything that matters is behind it', () => {
  // The arrangement is the whole claim of that scene: from in front there is a
  // gland, and the two things a thyroid operation is careful about are on the
  // other side of it. Depth, not size — no dimension in that model is measured.
  const thyroid = buildThyroidParts();
  const at = (id) => centre(thyroid.mesh(id));
  const trachea = at('trachea');
  const oesophagus = at('oesophagus');

  assert.ok(at('isthmus').z > trachea.z, 'the isthmus crosses in front of the trachea');
  assert.ok(oesophagus.z < trachea.z, 'the oesophagus is behind the trachea');
  assert.equal(patientSide(at('left-lobe')), 'left', 'the left lobe');
  assert.equal(patientSide(at('right-lobe')), 'right', 'the right lobe');

  for (const side of ['right', 'left']) {
    const nerve = at(`${side}-recurrent-laryngeal-nerve`);
    assert.equal(patientSide(nerve), side, `the ${side} recurrent laryngeal nerve is on its own side`);
    // In the groove: behind the trachea's centre, in front of the oesophagus's.
    assert.ok(nerve.z < trachea.z, `the ${side} nerve is behind the trachea`);
    assert.ok(nerve.z > oesophagus.z, `the ${side} nerve is in front of the oesophagus`);
    assert.ok(nerve.z < at(`${side}-lobe`).z, `the ${side} nerve is behind its own lobe`);

    const superior = at(`${side}-superior-parathyroid`);
    const inferior = at(`${side}-inferior-parathyroid`);
    assert.ok(superior.z < at(`${side}-lobe`).z, `the ${side} superior parathyroid is behind the gland`);
    assert.ok(inferior.z < at(`${side}-lobe`).z, `the ${side} inferior parathyroid is behind the gland`);
    assert.ok(superior.y > inferior.y, `the ${side} superior parathyroid is above the inferior one`);
    assert.equal(patientSide(superior), side, `the ${side} superior parathyroid is on its own side`);
  }
});

// --- spleen ----------------------------------------------------------------

test('the spleen is two arterial territories, divided where the artery divides', () => {
  const spleen = buildSpleenParts();
  const superior = new THREE.Box3().setFromObject(spleen.mesh('superior-segment'));
  const inferior = new THREE.Box3().setFromObject(spleen.mesh('inferior-segment'));

  // They meet at the plane and do not overlap across it.
  assert.ok(superior.min.y >= SEGMENT_PLANE_Y - 0.05, 'the superior segment is above the plane');
  assert.ok(inferior.max.y <= SEGMENT_PLANE_Y + 0.05, 'the inferior segment is below it');
  // Between them they are the organ: as tall as the whole spleen was.
  const whole = new THREE.Box3().setFromObject(buildSpleen({ detail: 7 }).object);
  const height = superior.max.y - inferior.min.y;
  assert.ok(
    Math.abs(height - (whole.max.y - whole.min.y)) < 0.08,
    `the two segments are as tall as the spleen (${height.toFixed(2)})`
  );

  // The division happens outside the organ, which is what makes the two
  // territories separable at all.
  const artery = new THREE.Box3().setFromObject(spleen.mesh('splenic-artery'));
  const parenchyma = new THREE.Box3().union(superior).union(inferior);
  const medial = Math.sign(spleen.hilum.x) || -1;
  assert.ok(
    medial < 0 ? artery.min.x < parenchyma.min.x : artery.max.x > parenchyma.max.x,
    'the splenic artery reaches the organ from outside it'
  );
  // Each branch ends in the segment it is named for.
  assert.ok(centre(spleen.mesh('superior-terminal-branch')).y > SEGMENT_PLANE_Y, 'the superior branch runs up');
  assert.ok(centre(spleen.mesh('inferior-terminal-branch')).y < SEGMENT_PLANE_Y, 'the inferior branch runs down');
  // And the vein leaves behind the artery.
  assert.ok(centre(spleen.mesh('splenic-vein')).z < centre(spleen.mesh('splenic-artery')).z, 'the vein is posterior');
});

// --- bladder ---------------------------------------------------------------

test('the bladder’s trigone has an opening at each of its three corners', () => {
  const bladder = buildBladderParts();
  const at = (id) => centre(bladder.mesh(id));

  // The wall, in order, top to bottom and back to front.
  assert.ok(at('apex').y > at('body').y, 'the apex is above the body');
  assert.ok(at('body').y > at('neck').y, 'the neck is below the body');
  assert.ok(at('fundus').z < at('body').z, 'the fundus is the posterior wall');

  // Every corner of the patch is an orifice, and every orifice is at a corner.
  const patch = new THREE.Box3().setFromObject(bladder.mesh('trigone'));
  for (const id of Object.keys(TRIGONE_CORNERS)) {
    const point = at(id);
    assert.ok(
      patch.distanceToPoint(point) < 0.08,
      `${id} sits on the trigone (${patch.distanceToPoint(point).toFixed(3)} away)`
    );
  }
  assert.ok(at('right-ureteric-orifice').y > at('internal-urethral-orifice').y, 'the ureters enter above the way out');
  assert.equal(patientSide(at('left-ureteric-orifice')), 'left', 'the left ureteric orifice');
  assert.equal(patientSide(at('right-ureteric-orifice')), 'right', 'the right ureteric orifice');

  // Each tube meets the opening it belongs to rather than somewhere near it.
  const meets = (tube, orifice) => {
    const box = new THREE.Box3().setFromObject(bladder.mesh(tube));
    return box.distanceToPoint(at(orifice));
  };
  assert.ok(meets('right-ureter', 'right-ureteric-orifice') < 0.06, 'the right ureter ends at its orifice');
  assert.ok(meets('left-ureter', 'left-ureteric-orifice') < 0.06, 'the left ureter ends at its orifice');
  assert.ok(meets('urethra', 'internal-urethral-orifice') < 0.06, 'the urethra begins at the internal orifice');
});

// --- biliary tree ----------------------------------------------------------

test('the bile ducts join in the order that decides what an obstruction does', () => {
  // The order is the whole content of that scene, and it is the only thing in
  // it that is a claim: calibres, lengths and angles are drawn to be legible.
  const tree = buildBiliaryTree();
  const reaches = (id, point) =>
    new THREE.Box3().setFromObject(tree.mesh(id)).distanceToPoint(point) < 0.09;

  const { confluence, cystic, papilla } = tree.junctions;

  assert.ok(reaches('right-hepatic-duct', confluence), 'the right hepatic duct reaches the confluence');
  assert.ok(reaches('left-hepatic-duct', confluence), 'the left hepatic duct reaches the confluence');
  assert.ok(reaches('common-hepatic-duct', confluence), 'the common hepatic duct starts at the confluence');
  assert.ok(reaches('common-hepatic-duct', cystic), 'and runs to the cystic junction');
  assert.ok(reaches('cystic-duct', cystic), 'the cystic duct reaches the same junction');
  assert.ok(reaches('cystic-duct', tree.gallbladderCurve.getPointAt(1)), 'and leaves the gallbladder’s neck');
  assert.ok(reaches('common-bile-duct', cystic), 'the common bile duct begins there');
  assert.ok(reaches('common-bile-duct', papilla), 'and ends at the papilla');
  assert.ok(reaches('pancreatic-duct', papilla), 'the pancreatic duct ends at the same papilla');

  // Downstream is downstream: each junction is below the one above it.
  assert.ok(confluence.y > cystic.y, 'the cystic junction is below the confluence');
  assert.ok(cystic.y > papilla.y, 'the papilla is below the cystic junction');

  // The duct is where it is, not where it is easy to see. Both of these were
  // wrong on purpose once — the duct ran in front of the bowel and the gland so
  // that it could be clicked on — and both are what the arrangement explains.
  const sample = (id, count = 60) => {
    const mesh = tree.mesh(id);
    const position = mesh.geometry.attributes.position;
    const points = [];
    const point = new THREE.Vector3();
    for (let i = 0; i < position.count; i += Math.max(1, Math.floor(position.count / count))) {
      points.push(point.fromBufferAttribute(position, i).clone());
    }
    return points;
  };
  const bowel = new THREE.Box3().setFromObject(tree.mesh('pancreatic-head'));
  const duct = sample('common-bile-duct');
  // Through the back of the pancreatic head: some of its course is inside it.
  assert.ok(
    duct.some((point) => bowel.containsPoint(point)),
    'the common bile duct passes through the pancreatic head'
  );
  // And through its posterior half. Measured on the duct's axis rather than on
  // its surface: a tube of this calibre straddles any plane its centre is near.
  const inside = duct.filter((point) => bowel.containsPoint(point));
  const headCentre = centre(tree.mesh('pancreatic-head'));
  const axisZ = inside.reduce((total, point) => total + point.z, 0) / inside.length;
  assert.ok(
    axisZ < headCentre.z,
    `and through its posterior half rather than its front (${axisZ.toFixed(3)} vs ${headCentre.z.toFixed(3)})`
  );

  // The papilla opens on the wall of the descending limb that faces the
  // pancreatic head, which is the side the duct arrives from.
  assert.ok(
    papilla.x > tree.sites.descendingLimb.x,
    'the papilla is on the wall facing the midline and the pancreatic head'
  );
  assert.ok(
    Math.abs(papilla.distanceTo(tree.sites.descendingLimb) - tree.sites.descendingLimbRadius) < 1e-6,
    'and it is on that wall rather than inside the lumen'
  );

  // The gallbladder runs fundus to neck, and the neck is its narrowest part.
  const parts = ['gallbladder-fundus', 'gallbladder-body', 'gallbladder-neck'];
  const widths = parts.map((id) => new THREE.Box3().setFromObject(tree.mesh(id)).getSize(new THREE.Vector3()).z);
  assert.ok(widths[0] > widths[1] && widths[1] > widths[2], `the gallbladder narrows towards the neck (${widths.map((w) => w.toFixed(2))})`);
  assert.equal(patientSide(centre(tree.mesh('gallbladder-fundus'))), 'right', 'the gallbladder is on the right');
  // The fundus is the free end: it is further from the neck than the body is.
  const neck = centre(tree.mesh('gallbladder-neck'));
  assert.ok(
    centre(tree.mesh('gallbladder-fundus')).distanceTo(neck) > centre(tree.mesh('gallbladder-body')).distanceTo(neck),
    'the fundus is the far end'
  );
});

// --- oesophagus -------------------------------------------------------------

test('the oesophagus is narrow in three places, and something makes each one narrow', () => {
  const esophagus = buildEsophagusParts();
  assert.deepEqual(esophagus.parts.map((part) => part.id), ['cervical', 'thoracic', 'abdominal']);
  assertPartition(esophagus.parts, 'oesophagus');

  // The narrowing is in the calibre, and the calibre is what the tube is built
  // from — so this measures the profile rather than the rings drawn on it.
  const calibre = esophagusCalibre();
  const between = [0.25, 0.68, 0.97].map(calibre);
  for (const { at, id } of CONSTRICTIONS) {
    const here = calibre(at);
    for (const wide of between) {
      assert.ok(here < wide * 0.95, `${id} is narrower than the tube between the narrowings`);
    }
  }

  // Each ring is on the curve at its own fraction, not near it.
  for (const { id, at } of CONSTRICTIONS) {
    const ring = centre(esophagus.mesh(id));
    assert.ok(
      ring.distanceTo(esophagus.curve.getPointAt(at)) < 0.02,
      `${id} sits on the tube at its own fraction`
    );
  }

  // And each is narrow for its own reason, drawn beside it.
  const middle = esophagus.constrictionAt('aortobronchial-constriction');
  assert.ok(centre(esophagus.mesh('aortic-arch')).z < middle.z, 'the arch crosses behind the oesophagus');
  assert.ok(centre(esophagus.mesh('left-main-bronchus')).z > middle.z, 'the bronchus crosses in front of it');
  assert.equal(patientSide(centre(esophagus.mesh('aortic-arch'))), 'left', 'the arch goes to the patient’s left');

  const hiatus = esophagus.constrictionAt('diaphragmatic-constriction');
  const sheet = new THREE.Box3().setFromObject(esophagus.mesh('diaphragm'));
  assert.ok(sheet.containsPoint(hiatus), 'the lowest narrowing is inside the diaphragm’s ring');
  assert.ok(centre(esophagus.mesh('trachea')).z > centre(esophagus.mesh('cervical')).z, 'the trachea is in front');
});

// --- adrenal ---------------------------------------------------------------

test('each adrenal layer encloses the next, and the two glands are not mirror images', () => {
  const glands = buildAdrenalParts();
  glands.object.updateMatrixWorld(true);
  const box = (id) => new THREE.Box3().setFromObject(glands.mesh(id));

  for (const { side } of ADRENAL_SITES) {
    const boxes = ZONE_DISPLAY_BANDS.map((layer) => box(`${side}-${layer.id}`));
    for (let i = 1; i < boxes.length; i += 1) {
      assert.ok(
        boxes[i - 1].containsBox(boxes[i]),
        `${side}: ${ZONE_DISPLAY_BANDS[i - 1].id} encloses ${ZONE_DISPLAY_BANDS[i].id}`
      );
    }
    // The one that is not cortex is inside all three that are.
    const medulla = box(`${side}-adrenal-medulla`);
    for (const zone of ZONE_DISPLAY_BANDS.slice(0, 3)) {
      assert.ok(box(`${side}-${zone.id}`).containsBox(medulla), `${side}: the medulla is inside ${zone.id}`);
    }
  }

  // Each gland is on its own side and above its own kidney.
  for (const { side } of ADRENAL_SITES) {
    const gland = centre(glands.mesh(`${side}-zona-glomerulosa`));
    const kidney = centre(glands.mesh(`${side}-kidney`));
    assert.equal(patientSide(gland), side, `the ${side} gland is on the ${side}`);
    assert.ok(gland.y > kidney.y, `the ${side} gland is above its kidney`);
  }

  // Not mirrored, and the difference has to be legible from the front: the
  // right is a cap on its kidney and pyramidal, the left lies along its
  // kidney's medial border and is a crescent — longer, flatter, scooped
  // underneath. Measured on the silhouette, which is what a reader sees.
  const right = box('right-zona-glomerulosa').getSize(new THREE.Vector3());
  const left = box('left-zona-glomerulosa').getSize(new THREE.Vector3());
  assert.ok(left.y < right.y * 0.8, `the left gland is clearly the flatter (${left.y.toFixed(2)} vs ${right.y.toFixed(2)})`);
  assert.ok(left.x > right.x, `and the wider (${left.x.toFixed(2)} vs ${right.x.toFixed(2)})`);

  // The display bands are not the proportions, and are not pretending to be.
  // The cortex is about nine tenths of the gland; the bands give it a bit over
  // half the radius, which is a visual emphasis and is named as one.
  const cortexBand = 1 - ZONE_DISPLAY_BANDS.at(-1).to;
  assert.ok(
    cortexBand < CORTEX_SHARE_OF_GLAND * 0.75,
    `the display bands are visibly not the real proportions (${cortexBand.toFixed(2)} vs ${CORTEX_SHARE_OF_GLAND})`
  );
});

// --- uterus ----------------------------------------------------------------

test('the uterine cavity is a triangle whose corners are the openings into it', () => {
  const uterus = buildUterusParts();
  const at = (id) => centre(uterus.mesh(id));

  // The wall, in order from the top, narrowing to the cervix.
  assert.ok(at('fundus').y > at('body').y, 'the fundus is above the body');
  assert.ok(at('body').y > at('isthmus').y, 'the isthmus is below the body');
  assert.ok(at('isthmus').y > at('cervix').y, 'the cervix is below the isthmus');
  const width = (id) => new THREE.Box3().setFromObject(uterus.mesh(id)).getSize(new THREE.Vector3()).x;
  assert.ok(width('cervix') < width('fundus'), 'the cervix is narrower than the fundus');

  // Every corner of the patch is an opening, and every opening is at a corner.
  const patch = new THREE.Box3().setFromObject(uterus.mesh('uterine-cavity'));
  for (const [id, corner] of Object.entries(CAVITY_CORNERS)) {
    const point = new THREE.Vector3(...corner);
    assert.ok(patch.distanceToPoint(point) < 0.02, `${id} is a corner of the cavity`);
  }
  assert.equal(patientSide(new THREE.Vector3(...CAVITY_CORNERS['left-tubal-ostium'])), 'left', 'the left ostium');

  const reaches = (id, corner) =>
    new THREE.Box3().setFromObject(uterus.mesh(id)).distanceToPoint(new THREE.Vector3(...CAVITY_CORNERS[corner]));
  assert.ok(reaches('right-fallopian-tube', 'right-tubal-ostium') < 0.05, 'the right tube starts at its own corner');
  assert.ok(reaches('left-fallopian-tube', 'left-tubal-ostium') < 0.05, 'the left tube starts at its own corner');
  assert.ok(reaches('cervical-canal', 'internal-os') < 0.05, 'the cervical canal starts at the lower corner');

  for (const side of ['right', 'left']) {
    // The tube is widest between its ends, which is where fertilisation and an
    // ectopic pregnancy happen — so it is the one thing about its shape that is
    // worth checking.
    const tube = uterus.mesh(`${side}-fallopian-tube`);
    const position = tube.geometry.attributes.position;
    const vertex = new THREE.Vector3();
    const spread = new Map();
    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i);
      const key = Math.round(Math.abs(vertex.x) * 10);
      spread.set(key, Math.max(spread.get(key) ?? 0, Math.abs(vertex.z)));
    }
    const bands = [...spread.entries()].sort((a, b) => a[0] - b[0]).map(([, value]) => value);
    const widest = bands.indexOf(Math.max(...bands));
    assert.ok(widest > 0 && widest < bands.length - 1, `the ${side} tube is widest between its ends`);

    // And the ovary it reaches towards is not joined to it. Measured between
    // the two surfaces, not between their bounding boxes: two boxes overlap
    // whenever one object reaches past another, which says nothing about
    // whether they touch.
    const ovaryMesh = uterus.mesh(`${side}-ovary`);
    ovaryMesh.updateMatrixWorld(true);
    const ovaryCentre = centre(ovaryMesh);
    const ovaryPosition = ovaryMesh.geometry.attributes.position;
    let ovaryRadius = 0;
    for (let i = 0; i < ovaryPosition.count; i += 1) {
      ovaryRadius = Math.max(ovaryRadius, vertex.fromBufferAttribute(ovaryPosition, i).add(ovaryMesh.position).distanceTo(ovaryCentre));
    }
    let nearest = Infinity;
    for (let i = 0; i < position.count; i += 1) {
      nearest = Math.min(nearest, vertex.fromBufferAttribute(position, i).distanceTo(ovaryCentre));
    }
    const gap = nearest - ovaryRadius;
    assert.ok(gap > 0.01, `the ${side} ovary is near its tube but not joined to it (gap ${gap.toFixed(3)})`);
    assert.ok(gap < 0.6, `the ${side} ovary is still near its tube (gap ${gap.toFixed(3)})`);
  }
});

// --- how the uterus is shown ------------------------------------------------

test('the uterus is shown leaning forward over the bladder, not standing upright', () => {
  // §7 of the working rules, and the reason this test is here rather than in
  // the builder: the organ is *built* upright, because its own boundaries are
  // horizontal planes in its own frame, and it is *shown* anteverted. The
  // orientation is a property of the scene, so the scene is what is checked.
  const scene = new UterusAnatomyScene({});
  scene.build();
  scene.root.updateMatrixWorld(true);
  const at = (id) => new THREE.Box3().setFromObject(scene.byId.get(id).meshes[0]).getCenter(new THREE.Vector3());

  const fundus = at('fundus');
  const cervix = at('cervix');
  assert.ok(fundus.y > cervix.y, 'the fundus is still the top');
  assert.ok(fundus.z > cervix.z + 0.5, `the fundus leans forward of the cervix (${(fundus.z - cervix.z).toFixed(2)})`);
  assert.ok(at('vagina').z < cervix.z, 'and the vagina runs down and back from it');

  // And it leans over something: the bladder in front, the rectum behind.
  assert.ok(at('bladder').z > fundus.z, 'the bladder is in front of the uterus');
  assert.ok(at('rectum').z < cervix.z, 'the rectum is behind it');
  scene.dispose();
});

// --- prostate ---------------------------------------------------------------

test('the prostate’s peripheral zone is the outside and the other two are the inside', () => {
  // The division prostate disease turns on. Cancer arises mostly in the zone a
  // finger reaches; benign enlargement in the zone round the urethra. Nothing
  // about the outside of the gland tells them apart, so the arrangement is the
  // whole claim — and the proportions deliberately are not.
  const prostate = buildProstateZones();
  prostate.object.updateMatrixWorld(true);
  const box = (id) => new THREE.Box3().setFromObject(prostate.mesh(id));
  const at = (id) => box(id).getCenter(new THREE.Vector3());

  const peripheral = box('peripheral-zone');
  // The gland is the four together; the two inner zones are inside that, and
  // the peripheral zone reaches further out than either in every direction it
  // covers. It does *not* enclose them in front, because in front of them is
  // the anterior stroma — which is the arrangement, not a gap.
  const gland = new THREE.Box3().union(peripheral).union(box('anterior-fibromuscular-stroma'));
  for (const inner of ['transition-zone', 'central-zone']) {
    assert.ok(gland.containsBox(box(inner)), `the ${inner} is inside the gland`);
    assert.ok(peripheral.min.z < box(inner).min.z, `the peripheral zone is behind the ${inner}`);
    assert.ok(peripheral.min.x < box(inner).min.x, `and lateral to it`);
    assert.ok(peripheral.min.y < box(inner).min.y, `and below it`);
  }
  // And it is the zone on the rectal side.
  const rectum = at('rectum');
  for (const other of ['transition-zone', 'central-zone', 'anterior-fibromuscular-stroma']) {
    assert.ok(
      peripheral.min.z < box(other).min.z,
      `the peripheral zone reaches nearer the rectum than the ${other}`
    );
  }
  assert.ok(rectum.z < peripheral.min.z, 'and the rectum is behind all of it');
  assert.ok(at('bladder-neck').y > peripheral.max.y - 0.2, 'the bladder neck sits on top of the gland');

  // The stroma is the front, and it is the only zone in front of the plane.
  assert.ok(at('anterior-fibromuscular-stroma').z > at('peripheral-zone').z, 'the stroma is anterior');

  // Inside: transition in front of and below central, which is what puts the
  // one that enlarges against the urethra and the other around the ducts.
  assert.ok(at('transition-zone').z > at('central-zone').z, 'the transition zone is in front of the central');
  assert.ok(at('transition-zone').y < at('central-zone').y, 'and below it');

  // The urethra goes through the gland, not past it.
  const urethra = box('prostatic-urethra');
  assert.ok(urethra.min.y < peripheral.min.y && urethra.max.y > peripheral.max.y, 'the urethra spans the gland');
  assert.ok(box('transition-zone').containsPoint(prostate.urethraCurve.getPointAt(0.45)), 'and through the transition zone');

  // Both ejaculatory ducts end on the verumontanum, inside the central zone.
  const verumontanum = prostate.anchorPoints.verumontanum;
  for (const side of ['right', 'left']) {
    const duct = box(`${side}-ejaculatory-duct`);
    assert.ok(duct.distanceToPoint(verumontanum) < 0.05, `the ${side} ejaculatory duct ends at the verumontanum`);
    assert.ok(duct.intersectsBox(box('central-zone')), `and runs inside the central zone`);
    // Formed where the vas meets the vesicle, above and behind the gland.
    assert.ok(
      box(`${side}-vas-deferens`).intersectsBox(duct),
      `the ${side} vas deferens reaches the duct it forms`
    );
    assert.equal(patientSide(at(`${side}-seminal-vesicle`)), side, `the ${side} seminal vesicle`);
    assert.ok(at(`${side}-seminal-vesicle`).y > peripheral.max.y, `and it sits above the gland`);
  }
});

// --- the male genital tract -------------------------------------------------

test('the male tract is one chain, and every link in it meets the next', () => {
  // The whole claim of that scene. Each segment's curve starts where the last
  // one ends, so this walks the declared route and checks the geometry agrees.
  const tract = buildMaleTract();
  tract.object.updateMatrixWorld(true);
  const box = (id) => new THREE.Box3().setFromObject(tract.mesh(id));

  for (let i = 1; i < tract.route.length; i += 1) {
    assert.ok(
      box(tract.route[i - 1]).intersectsBox(box(tract.route[i])),
      `${tract.route[i - 1]} meets ${tract.route[i]}`
    );
  }

  // The epididymis is on the back of the testis, not beside it.
  const testis = box('testis');
  const epididymis = box('epididymis');
  assert.ok(epididymis.getCenter(new THREE.Vector3()).z < testis.getCenter(new THREE.Vector3()).z, 'the epididymis is posterior');
  assert.ok(epididymis.min.y < testis.min.y, 'and it reaches below the lower pole, where it turns into the vas');

  // The genital route ends inside the gland; the urinary one starts above it.
  const prostate = box('prostate');
  assert.ok(prostate.containsPoint(tract.anchorPoints.verumontanum), 'the ejaculatory duct ends inside the prostate');
  const prostatic = box('prostatic-urethra');
  assert.ok(prostatic.max.y > prostate.max.y - 0.1, 'the prostatic urethra begins at the top of the gland');
  assert.ok(prostatic.min.y < prostate.min.y + 0.15, 'and reaches its apex');

  // The membranous part is the shortest of the three lengths.
  const span = (id) => {
    const size = box(id).getSize(new THREE.Vector3());
    return Math.max(size.x, size.y, size.z);
  };
  assert.ok(
    span('membranous-urethra') < span('prostatic-urethra') && span('membranous-urethra') < span('spongy-urethra'),
    'the membranous urethra is the shortest of the three'
  );

  // And the spongy part runs inside the column named for carrying it.
  assert.ok(box('corpus-spongiosum').containsBox(box('spongy-urethra')), 'the spongy urethra is inside the spongiosum');
  for (const side of ['right', 'left']) {
    assert.ok(
      !box(`${side}-corpus-cavernosum`).containsBox(box('spongy-urethra')),
      `and not inside the ${side} cavernosum`
    );
  }
});

// --- the knee ---------------------------------------------------------------

test('the knee’s ligaments each run between the two things they hold together', () => {
  // A joint is a set of relations, so the arrangement *is* the model. What is
  // checked is which structure runs between which two points: the cruciates
  // inside the notch and crossing, the collaterals outside on their own sides,
  // each meniscus between its own pair of surfaces, and the extensor mechanism
  // as one chain with a bone in the middle of it.
  const knee = buildKneeJoint();
  knee.object.updateMatrixWorld(true);
  const box = (id) => new THREE.Box3().setFromObject(knee.mesh(id));
  const at = (id) => box(id).getCenter(new THREE.Vector3());

  // A right knee, so medial points towards the patient's left. Every side below
  // goes through `MEDIAL`; nothing here reads a sign of its own.
  assert.equal(patientSide(at('medial-femoral-condyle')), 'left', 'a right knee: medial is the patient’s left');
  assert.equal(patientSide(at('lateral-femoral-condyle')), 'right', 'and lateral the patient’s right');
  assert.ok(at('fibula').x * MEDIAL < 0, 'the fibula is on the lateral side');

  // The notch is the gap between the two condyles, and it is where both
  // cruciates are. That is why it is not drawn as a structure.
  //
  // And it is only behind: in front the two condyles run together into the
  // surface the patella slides on, so the gap cannot be read off a bounding box.
  const innerEdge = (side, within) => {
    const mesh = knee.mesh(`${side}-femoral-condyle`);
    const position = mesh.geometry.attributes.position;
    const vertex = new THREE.Vector3();
    let edge = null;
    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i).add(mesh.position);
      if (!within(vertex)) continue;
      const towardsMidline = vertex.x * (side === 'medial' ? MEDIAL : -MEDIAL);
      if (edge === null || towardsMidline < edge) edge = towardsMidline;
    }
    assert.ok(edge !== null, `the ${side} condyle has a surface there at all`);
    return edge;
  };
  const behind = (vertex) => vertex.z < -0.3;
  // In front of the notch, but not at the very front: the groove the patella
  // runs in is a dip *between* the two condyles, so the most anterior surface
  // of each is again its own.
  const inFront = (vertex) => vertex.z > 0.1;
  assert.ok(
    innerEdge('medial', behind) > 0.05 && innerEdge('lateral', behind) > 0.05,
    'behind, the two condyles stand apart: the gap between them is the notch'
  );
  assert.ok(
    innerEdge('medial', inFront) <= 0 && innerEdge('lateral', inFront) <= 0,
    'in front they meet, which is the surface the patella runs on — not a hole'
  );
  for (const id of ['anterior-cruciate-ligament', 'posterior-cruciate-ligament']) {
    const middle = at(id);
    assert.ok(
      Math.abs(middle.x) < innerEdge('medial', behind) + 0.2,
      `the ${id} runs in the notch between the condyles`
    );
    assert.ok(box(id).min.z < -0.3, `and the ${id} reaches back into it`);
  }

  // Cruciate means crossing: the ACL comes off the *lateral* condyle and runs
  // forward as it descends, the PCL off the *medial* one and runs backwards.
  const attachment = (id) => new THREE.Vector3(...ATTACHMENTS[id]);
  assert.ok(attachment('aclFemoral').x * MEDIAL < 0, 'the ACL starts on the lateral condyle’s inner wall');
  assert.ok(attachment('pclFemoral').x * MEDIAL > 0, 'the PCL starts on the medial condyle’s inner wall');
  for (const [femoral, tibial] of [['aclFemoral', 'aclTibial'], ['pclFemoral', 'pclTibial']]) {
    assert.ok(attachment(tibial).y < attachment(femoral).y, `${femoral} → ${tibial} descends`);
  }
  assert.ok(attachment('aclTibial').z > attachment('aclFemoral').z, 'the ACL runs forward as it descends');
  assert.ok(attachment('pclTibial').z < attachment('pclFemoral').z, 'the PCL runs backwards as it descends');
  assert.ok(attachment('aclTibial').z > attachment('pclTibial').z, 'so at the tibia the ACL is the anterior one');
  assert.ok(attachment('aclFemoral').z < attachment('pclFemoral').z, 'and at the femur it is the posterior one — they cross');

  // The collaterals are outside, one down each side, and only one of them ends
  // on the fibula. That is the whole of why the lateral meniscus is mobile.
  const mcl = box('medial-collateral-ligament');
  const lcl = box('lateral-collateral-ligament');
  assert.ok(mcl.min.x * MEDIAL > at('medial-femoral-condyle').x * MEDIAL, 'the MCL lies outside the medial condyle');
  assert.ok(lcl.max.x * MEDIAL < at('lateral-femoral-condyle').x * MEDIAL, 'the LCL lies outside the lateral condyle');
  assert.ok(lcl.intersectsBox(box('fibula')), 'the LCL ends on the head of the fibula');
  assert.ok(!mcl.intersectsBox(box('fibula')), 'and the MCL does not');
  assert.ok(mcl.min.y < box('medial-tibial-plateau').min.y, 'the MCL reaches well below the joint line');

  // Each meniscus is between its own condyle and its own plateau.
  for (const side of ['medial', 'lateral']) {
    const meniscus = at(`${side}-meniscus`);
    assert.equal(patientSide(meniscus), patientSide(at(`${side}-femoral-condyle`)), `the ${side} meniscus is on its own side`);
    assert.ok(meniscus.y < at(`${side}-femoral-condyle`).y, `and below the ${side} condyle`);
    assert.ok(meniscus.y > at(`${side}-tibial-plateau`).y, `and above the ${side} plateau`);
  }

  // The two bones never touch: one structure, four meshes, each of them
  // standing off the surface it covers.
  // It stands off the surfaces that meet — distal and posterior on a condyle,
  // the top of a plateau — and nowhere else: a layer that enclosed the whole
  // bone would be a coat of paint, and it would hide the bone it covers.
  const cartilage = new Map(knee.cartilageMeshes.map((mesh) => [mesh.name, new THREE.Box3().setFromObject(mesh)]));
  for (const side of ['medial', 'lateral']) {
    const condyle = box(`${side}-femoral-condyle`);
    const overCondyle = cartilage.get(`${side}-condylar-cartilage`);
    assert.ok(overCondyle.min.y < condyle.min.y, `the ${side} condyle's cartilage covers its distal surface`);
    assert.ok(overCondyle.min.z < condyle.min.z, 'and its posterior surface');
    assert.ok(overCondyle.max.y <= condyle.max.y + 1e-6, 'and does not climb the shaft above it');

    const plateau = box(`${side}-tibial-plateau`);
    const overPlateau = cartilage.get(`${side}-plateau-cartilage`);
    assert.ok(overPlateau.max.y > plateau.max.y, `the ${side} plateau's cartilage covers its top`);
    assert.ok(overPlateau.min.y >= plateau.min.y - 1e-6, 'and not its underside, which meets nothing');
  }

  // The extensor mechanism is one chain from thigh to shin with the patella in
  // the middle of it, not two tendons that happen to point the same way.
  const patella = box('patella');
  assert.ok(patella.getCenter(new THREE.Vector3()).z > at('medial-femoral-condyle').z, 'the patella is in front of the condyles');
  const quadriceps = box('quadriceps-tendon');
  const patellar = box('patellar-tendon');
  assert.ok(quadriceps.max.y > patella.max.y && quadriceps.intersectsBox(patella), 'the quadriceps tendon arrives on top of the patella');
  assert.ok(patellar.min.y < patella.min.y && patellar.intersectsBox(patella), 'and the patellar tendon leaves from below it');
  assert.ok(patellar.distanceToPoint(attachment('tibialTuberosity')) < 0.02, 'ending at the tibial tuberosity');
  assert.ok(attachment('tibialTuberosity').y < box('medial-tibial-plateau').min.y, 'which is below the joint line');
});

// --- the shoulder -----------------------------------------------------------

test('the shoulder’s socket is small, and four tendons make up for it', () => {
  // The opposite problem from the knee. A knee is held by its ligaments; a
  // shoulder is barely held by its bones at all, so what is checked here is the
  // sleeve: which tendon arrives from which direction, and which of the two
  // tubercles each one ends on.
  const shoulder = buildShoulderJoint();
  shoulder.object.updateMatrixWorld(true);
  const box = (id) => new THREE.Box3().setFromObject(shoulder.mesh(id));
  const at = (id) => box(id).getCenter(new THREE.Vector3());
  const size = (id) => box(id).getSize(new THREE.Vector3());
  const lateralOf = (a, b) => at(a).x * SHOULDER_MEDIAL < at(b).x * SHOULDER_MEDIAL;

  // A right shoulder: the scapula is medial, the humerus lateral.
  assert.ok(lateralOf('humeral-head', 'glenoid'), 'the head sits lateral to the socket');
  assert.ok(lateralOf('humeral-head', 'scapula'), 'and the whole humerus is lateral to the scapula');

  // The claim the scene is built on: the socket is a fraction of the head.
  // Not an assertion that it is a third — that is a fact about contact arcs,
  // stated in the copy and not built into this geometry. What the geometry has
  // to be is a face smaller than the ball on it, in both directions and by a
  // long way in area.
  const socket = size('glenoid');
  const head = size('humeral-head');
  assert.ok(socket.y < head.y * 0.9, 'the glenoid is shorter than the head it faces');
  assert.ok(socket.z < head.z * 0.75, 'and much shallower front to back');
  assert.ok(socket.y * socket.z < head.y * head.z * 0.6, 'so its face is a fraction of the head’s');

  // The labrum is a rim *around* the socket, so it reaches past it on all sides.
  const labrum = box('glenoid-labrum');
  const glenoid = box('glenoid');
  assert.ok(labrum.min.y < glenoid.min.y && labrum.max.y > glenoid.max.y, 'the labrum rims the socket top and bottom');
  assert.ok(labrum.min.z < glenoid.min.z && labrum.max.z > glenoid.max.z, 'and front and back');

  // Three of the four cuff tendons end on the greater tubercle; subscapularis,
  // the only one in front, ends on the lesser. That is the whole of why it
  // rotates the arm the other way.
  const greater = box('greater-tubercle');
  const lesser = box('lesser-tubercle');
  for (const id of ['supraspinatus-tendon', 'infraspinatus-tendon', 'teres-minor-tendon']) {
    assert.ok(box(id).intersectsBox(greater), `${id} ends on the greater tubercle`);
    assert.ok(!box(id).intersectsBox(lesser), `${id} does not reach the lesser tubercle`);
  }
  assert.ok(box('subscapularis-tendon').intersectsBox(lesser), 'subscapularis ends on the lesser tubercle');
  assert.ok(!box('subscapularis-tendon').intersectsBox(greater), 'and not on the greater');

  // And they arrive from four different directions round the head.
  const centre = at('humeral-head');
  assert.ok(at('supraspinatus-tendon').y > centre.y, 'supraspinatus comes over the top');
  assert.ok(at('infraspinatus-tendon').z < centre.z, 'infraspinatus from behind');
  assert.ok(at('teres-minor-tendon').z < centre.z, 'teres minor from behind');
  assert.ok(at('teres-minor-tendon').y < at('infraspinatus-tendon').y, 'and below infraspinatus');
  assert.ok(at('subscapularis-tendon').z > centre.z, 'subscapularis from in front');

  // Supraspinatus passes *under* the acromion — which is why it is the cuff
  // tendon with a bony shelf over it. Measured where the two actually overlap:
  // a bounding box cannot say this, because the acromion runs away medially
  // and downwards to the spine it comes from.
  const extreme = (id, within, pick) => {
    const mesh = shoulder.mesh(id);
    const position = mesh.geometry.attributes.position;
    const vertex = new THREE.Vector3();
    let found = null;
    for (let i = 0; i < position.count; i += 1) {
      vertex.fromBufferAttribute(position, i).add(mesh.position);
      if (!within(vertex)) continue;
      found = found === null ? vertex.y : pick(found, vertex.y);
    }
    assert.ok(found !== null, `${id} has a surface over the joint at all`);
    return found;
  };
  const overTheJoint = (vertex) => vertex.x * SHOULDER_MEDIAL > -0.35 && vertex.x * SHOULDER_MEDIAL < 0.3;
  const roof = extreme('acromion', overTheJoint, Math.min);
  const tendon = extreme('supraspinatus-tendon', overTheJoint, Math.max);
  assert.ok(roof > tendon, 'the acromion is above the supraspinatus tendon, not through it');
  assert.ok(at('supraspinatus-tendon').y > centre.y, 'and the tendon is above the middle of the head');
  assert.ok(box('coracoacromial-ligament').intersectsBox(box('coracoid-process')), 'the arch reaches the coracoid');

  // The biceps tendon starts inside the joint and runs down between the two
  // tubercles. Nothing else in the body does that.
  const biceps = box('long-head-of-biceps-tendon');
  assert.ok(biceps.intersectsBox(labrum), 'the long head of biceps begins at the rim of the socket');
  assert.ok(biceps.min.y < Math.min(greater.min.y, lesser.min.y), 'and ends below both tubercles');
  const groove = shoulder.anchorPoints.bicipitalGroove;
  assert.ok(biceps.containsPoint(groove), 'passing through the groove');
  const between = [at('greater-tubercle').x, at('lesser-tubercle').x].sort((a, b) => a - b);
  assert.ok(groove.x > between[0] && groove.x < between[1], 'which is between the two tubercles');

  // The arm hangs from the clavicle, and two ligaments are how.
  assert.ok(box('clavicle').intersectsBox(box('acromion')), 'the clavicle reaches the acromion');
  assert.ok(box('acromioclavicular-ligament').intersectsBox(box('clavicle')), 'the AC ligament spans that joint');
  const coracoclavicular = box('coracoclavicular-ligament');
  assert.ok(coracoclavicular.intersectsBox(box('coracoid-process')), 'the CC ligament reaches the coracoid');
  assert.ok(coracoclavicular.intersectsBox(box('clavicle')), 'and the clavicle');

  // The cartilage covers the part of the head that faces the socket, and not
  // the lateral side of it, where nothing articulates.
  const cartilage = new Map(shoulder.cartilageMeshes.map((mesh) => [mesh.name, new THREE.Box3().setFromObject(mesh)]));
  const glaze = cartilage.get('humeral-cartilage');
  const headBox = box('humeral-head');
  assert.ok(glaze.max.x * SHOULDER_MEDIAL > headBox.max.x * SHOULDER_MEDIAL, 'the glaze stands off the head on the socket side');
  assert.ok(glaze.min.x * SHOULDER_MEDIAL >= headBox.min.x * SHOULDER_MEDIAL, 'and not on the side away from it');

  // And the sling under the head runs from the socket to the humerus.
  const sling = box('inferior-glenohumeral-ligament');
  assert.ok(sling.max.y < centre.y, 'the inferior glenohumeral ligament is below the head');
  assert.ok(sling.intersectsBox(labrum), 'reaching the lower rim of the socket');
  assert.ok(sling.intersectsBox(box('humeral-shaft')) || sling.intersectsBox(headBox), 'and the neck of the humerus');
});

// --- the hip ----------------------------------------------------------------

test('the hip’s socket grips past the widest part of the head', () => {
  // The claim the whole scene is built on, and the one thing that separates
  // this joint from the shoulder. A dish cradles a ball; a cup holds it.
  const hip = buildHipJoint();
  hip.object.updateMatrixWorld(true);
  const box = (id) => new THREE.Box3().setFromObject(hip.mesh(id));
  const at = (id) => box(id).getCenter(new THREE.Vector3());
  // How far out towards the leg a point is. Medial is +x here, so lateral is
  // the other way, and a sign read the wrong way round makes every one of the
  // assertions below quietly true of a mirrored hip.
  const outward = (point) => -point.x * HIP_MEDIAL;

  const head = box('femoral-head');
  const socket = box('acetabulum');
  const centre = hip.anchorPoints.femoralHead;

  // Head and socket share a centre — that is what a congruent ball-and-socket
  // joint is, and it is why the hip turns in every direction about one point.
  assert.ok(
    hip.anchorPoints.acetabulum.distanceTo(centre) < 1e-9,
    'the ball and the cup are drawn about the same point'
  );

  // The rim reaches past the equator: the most lateral part of the socket is
  // lateral of the centre of the head, so the head cannot come straight out.
  const rim = box('acetabular-labrum');
  const rimReach = Math.max(outward(rim.min), outward(rim.max));
  assert.ok(rimReach > outward(centre), 'the rim reaches past the middle of the head — a cup, not a dish');
  assert.ok(
    rimReach < Math.max(outward(head.min), outward(head.max)),
    'and not so far that it swallows the head the neck has to come out of'
  );

  // And the labrum rings the mouth of the cup rather than sitting beside it.
  const rimSize = rim.getSize(new THREE.Vector3());
  assert.ok(rimSize.y > 0.6 && rimSize.z > 0.6, 'the labrum is a ring, not a patch');
  assert.ok(rimSize.x < rimSize.y * 0.4, 'lying in the plane of the socket’s mouth');

  // The neck holds the head out to the side of the shaft. Nothing about the
  // hip's weak point makes sense until that is true.
  const neck = at('femoral-neck');
  const shaft = at('femoral-shaft');
  const trochanter = at('greater-trochanter');
  assert.ok(outward(centre) < outward(neck) && outward(neck) < outward(trochanter), 'head, then neck, then trochanter, going outwards');
  assert.ok(centre.y > shaft.y, 'and the head is above the shaft it hands the load to');
  assert.ok(box('femoral-neck').intersectsBox(head), 'the neck meets the head');
  assert.ok(box('femoral-neck').intersectsBox(box('greater-trochanter')), 'and the trochanter at the other end');
  assert.ok(at('lesser-trochanter').y < trochanter.y, 'the lesser trochanter is the lower of the two');
  assert.ok(at('lesser-trochanter').z < trochanter.z, 'and lies behind it');

  // Two tendons, two trochanters, and they are not interchangeable.
  assert.ok(box('gluteus-medius-tendon').intersectsBox(box('greater-trochanter')), 'gluteus medius ends on the greater trochanter');
  assert.ok(!box('gluteus-medius-tendon').intersectsBox(box('lesser-trochanter')), 'and not on the lesser');
  assert.ok(box('iliopsoas-tendon').intersectsBox(box('lesser-trochanter')), 'iliopsoas ends on the lesser trochanter');

  // The three capsular ligaments come from three different parts of the hip
  // bone and cross the joint on three different sides.
  assert.ok(at('iliofemoral-ligament').z > centre.z, 'the iliofemoral ligament crosses the front');
  assert.ok(at('pubofemoral-ligament').z > centre.z, 'the pubofemoral ligament crosses the front, below');
  assert.ok(at('pubofemoral-ligament').y < at('iliofemoral-ligament').y, 'below the iliofemoral');
  assert.ok(at('ischiofemoral-ligament').z < centre.z, 'the ischiofemoral ligament crosses behind');
  for (const id of ['iliofemoral-ligament', 'pubofemoral-ligament', 'ischiofemoral-ligament']) {
    const band = box(id);
    assert.ok(outward(band.min) > outward(centre), `the ${id} reaches the femur`);
    assert.ok(outward(band.max) < outward(centre), `and comes from the hip bone`);
  }

  // The ligament of the head is the one inside: it stays within the socket.
  const inside = box('ligament-of-the-head');
  assert.ok(socket.containsBox(inside), 'the ligament of the head is inside the socket');
  assert.ok(inside.intersectsBox(head), 'and reaches the head it is named for');

  // The cartilage lines both surfaces: the ball nearly all over, the cup on the
  // inside. The two layers are between the two bones and nowhere else.
  const cartilage = new Map(hip.cartilageMeshes.map((mesh) => [mesh.name, new THREE.Box3().setFromObject(mesh)]));
  const glaze = cartilage.get('femoral-cartilage');
  assert.ok(glaze.containsBox(head), 'the head is glazed all over — it lives inside a cup');
  const lining = cartilage.get('acetabular-cartilage');
  assert.ok(socket.containsBox(lining), 'and the cup is lined on its inside, not coated on its outside');

  // The socket is cut into the hip bone rather than sitting next to it.
  assert.ok(box('hip-bone').intersectsBox(socket), 'the acetabulum is part of the hip bone');
  assert.ok(at('hip-bone').y > centre.y, 'whose weight comes down from above');
});

// --- the eye ----------------------------------------------------------------

test('the eye is three coats around three transparent things', () => {
  // A globe is easy to draw and hard to make useful, because everything worth
  // pointing at is inside it. What is checked is the order things come in along
  // the axis, and the two fundus landmarks whose relation says which eye it is.
  const eye = buildEyeball();
  eye.object.updateMatrixWorld(true);
  const box = (id) => new THREE.Box3().setFromObject(eye.mesh(id));
  const at = (id) => box(id).getCenter(new THREE.Vector3());
  /** Towards the nose. A sign read the wrong way round mirrors the fundus. */
  const nasal = (point) => point.x * EYE_NASAL;

  // Outside in, and no two coats touching: coincident shells speckle along
  // every rim, and a reader cannot tell three layers from one.
  const sclera = box('sclera');
  const choroid = box('choroid');
  const retina = box('retina');
  assert.ok(sclera.containsBox(choroid), 'the choroid is inside the sclera');
  assert.ok(choroid.containsBox(retina), 'and the retina inside the choroid');
  const radius = (b) => Math.max(b.max.x, -b.min.x);
  assert.ok(radius(sclera) > radius(choroid) + 0.02, 'with a gap between sclera and choroid');
  assert.ok(radius(choroid) > radius(retina) + 0.01, 'and between choroid and retina');

  // The cornea is a steeper dome than the globe: it bulges past the front of a
  // sphere whose radius is bigger than its own.
  const cornea = box('cornea');
  assert.ok(cornea.max.z > sclera.max.z, 'the cornea stands proud of the globe');
  assert.ok(radius(cornea) < radius(sclera), 'and is narrower than it — a steeper curve, not a bigger one');
  assert.ok(cornea.intersectsBox(sclera), 'meeting the sclera at the limbus');

  // Along the axis, front to back: cornea, chamber, iris and pupil, lens,
  // vitreous. Any two of these out of order is a different organ.
  const iris = box('iris');
  const lens = box('lens');
  const chamber = box('anterior-chamber');
  const vitreous = box('vitreous-body');
  assert.ok(chamber.min.z >= iris.max.z - 1e-6, 'the anterior chamber is in front of the iris');
  assert.ok(chamber.max.z <= cornea.max.z, 'and behind the front of the cornea');
  assert.ok(lens.max.z <= iris.min.z, 'the lens sits behind the iris, never through it');
  assert.ok(radius(lens) > radius(box('pupil')), 'and is wider than the pupil it is seen through');
  // A ring and the thing it surrounds share a bounding box, so the claim has to
  // be made about radius: the ciliary body lies outside the lens's edge, which
  // is what "the lens hangs from it" means.
  assert.ok(radius(box('ciliary-body')) > radius(lens), 'the ciliary ring lies outside the edge of the lens it hangs');
  assert.ok(vitreous.max.z < iris.min.z, 'the vitreous fills the eye behind the lens');
  assert.ok(retina.containsBox(vitreous) === false && vitreous.min.z > retina.min.z, 'and lies inside the retina');

  // The fundus, and the one relation it is read by: disc nasal, macula
  // temporal, and the macula on the axis at the back.
  const disc = at('optic-disc');
  const macula = at('macula');
  assert.ok(nasal(disc) > nasal(macula), 'the optic disc is nasal to the macula');
  assert.ok(Math.abs(macula.x) < Math.abs(disc.x), 'and the macula is the one on the axis');
  assert.ok(macula.z < 0 && disc.z < 0, 'both are at the back of the eye');
  assert.ok(box('macula').min.z <= box('optic-disc').min.z, 'the macula sits at the posterior pole');

  // The nerve leaves at the disc, and goes back and towards the midline.
  const nerve = box('optic-nerve');
  assert.ok(nerve.intersectsBox(box('optic-disc')), 'the optic nerve leaves at the disc');
  assert.ok(nerve.min.z < retina.min.z, 'running back out of the globe');
  assert.ok(nasal(nerve.max) > nasal(box('optic-disc').max), 'and towards the midline as it goes');

  // Four muscles, four directions, each reaching the globe in front of its
  // widest point.
  assert.ok(at('superior-rectus').y > 0, 'superior rectus runs along the top');
  assert.ok(at('inferior-rectus').y < 0, 'inferior rectus along the bottom');
  assert.ok(nasal(at('medial-rectus')) > 0, 'medial rectus along the nasal side');
  assert.ok(nasal(at('lateral-rectus')) < 0, 'lateral rectus along the temporal side');
  for (const id of ['superior-rectus', 'inferior-rectus', 'medial-rectus', 'lateral-rectus']) {
    assert.ok(box(id).intersectsBox(sclera), `${id} reaches the sclera`);
    assert.ok(box(id).min.z < -1.5, `and comes from behind the eye`);
    assert.ok(box(id).max.z < sclera.max.z, 'inserting behind the front of the globe');
  }
});

// --- the ear ----------------------------------------------------------------

test('the ear is one chain: air, then bone, then fluid', () => {
  // An ear is a route, so what is checked is the order along it and the three
  // joins that make it a chain rather than three collections of parts.
  const ear = buildEar();
  ear.object.updateMatrixWorld(true);
  const box = (id) => new THREE.Box3().setFromObject(ear.mesh(id));
  const at = (id) => box(id).getCenter(new THREE.Vector3());
  /** Into the head. Read the wrong way round, the ear is inside out. */
  const inwards = (point) => point.x * EAR_MEDIAL;

  // The route, outside in. Every step is further in than the one before it.
  const route = [
    'auricle',
    'external-auditory-canal',
    'tympanic-membrane',
    'middle-ear-cavity',
    'vestibule',
    'vestibulocochlear-nerve',
  ];
  for (let i = 1; i < route.length; i += 1) {
    assert.ok(
      inwards(at(route[i])) > inwards(at(route[i - 1])),
      `${route[i]} is deeper than ${route[i - 1]}`
    );
  }

  // The canal ends at the drum, and the drum is drawn inwards at its centre —
  // which is what makes the umbo a landmark and not just a word.
  const canal = box('external-auditory-canal');
  const drum = box('tympanic-membrane');
  assert.ok(canal.intersectsBox(drum) || Math.abs(inwards(canal.max) - inwards(drum.min)) < 0.1, 'the canal ends at the drum');
  const umbo = ear.anchorPoints.umbo;
  assert.ok(Math.abs(inwards(umbo) - inwards(drum.max)) < 0.05, 'the umbo is the drum’s most medial point');

  // Three bones, meeting in order, and only the last of them in the window.
  assert.ok(box('malleus').intersectsBox(drum), 'the malleus is attached to the drum');
  assert.ok(box('malleus').intersectsBox(box('incus')), 'the malleus meets the incus');
  assert.ok(box('incus').intersectsBox(box('stapes')), 'the incus meets the stapes');
  assert.ok(!box('malleus').intersectsBox(box('stapes')), 'and the malleus does not reach the stapes');
  const window_ = ear.anchorPoints.ovalWindow;
  assert.ok(box('stapes').distanceToPoint(window_) < 0.06, 'the stapes sits in the oval window');
  assert.ok(box('malleus').distanceToPoint(window_) > 0.1, 'and nothing else does');
  const cavity = box('middle-ear-cavity');
  for (const id of ['malleus', 'incus', 'stapes']) {
    assert.ok(cavity.intersectsBox(box(id)), `the ${id} crosses the air space`);
  }

  // The tube leaves the cavity forwards, downwards and inwards — which is the
  // whole of why a throat and an ear are connected.
  const tube = box('eustachian-tube');
  assert.ok(tube.min.y < cavity.min.y, 'the Eustachian tube runs down from the cavity');
  assert.ok(tube.max.z > cavity.max.z, 'and forwards');
  assert.ok(inwards(tube.max) > inwards(cavity.max), 'and towards the midline');

  // The inner ear: a spiral that tapers, and three loops in three planes.
  const cochlea = box('cochlea');
  assert.ok(inwards(at('cochlea')) > inwards(at('vestibule')), 'the cochlea is deeper than the vestibule');
  const spiral = cochlea.getSize(new THREE.Vector3());
  assert.ok(spiral.y > 0.6 && spiral.z > 0.6, 'the cochlea is a coil and not a straight tube');

  assert.equal(ear.canalMeshes.length, 3, 'three canals, drawn as one structure');
  const planes = ear.canalMeshes.map((mesh) => {
    const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3());
    // The axis a loop turns about is the one it is thinnest along.
    return [size.x, size.y, size.z].indexOf(Math.min(size.x, size.y, size.z));
  });
  assert.equal(new Set(planes).size, 3, 'and each of the three lies in a different plane');
});

// --- skin -------------------------------------------------------------------

test('skin is three layers, and what goes through them has two ways out', () => {
  // Skin is a sheet with a thickness rather than a thing with a shape, so every
  // claim here is about depth: which layer a structure is in, and which of the
  // two routes to the surface it takes.
  const skin = buildSkinBlock();
  skin.object.updateMatrixWorld(true);
  const box = (id) => new THREE.Box3().setFromObject(skin.mesh(id));
  const L = SKIN_LAYERS;

  // The three stack, in order, without a gap: each layer's floor is the next
  // one's roof, and they are built from the same function rather than from two
  // that happen to agree.
  const epidermis = box('epidermis');
  const dermis = box('dermis');
  const subcutis = box('subcutaneous-tissue');
  assert.ok(epidermis.min.y > dermis.min.y, 'the epidermis is above the dermis');
  assert.ok(dermis.min.y > subcutis.min.y, 'and the dermis above the subcutis');
  assert.ok(epidermis.min.y < dermis.max.y, 'epidermis and dermis meet, with no gap between them');
  assert.ok(dermis.min.y < subcutis.max.y, 'and so do dermis and subcutis');

  // And the join between the first two is not flat. A flat junction is the one
  // thing about skin this model would be wrong to say.
  const flat = SKIN_RETE(0, 0);
  let lowest = Infinity;
  let highest = -Infinity;
  for (let i = 0; i < 40; i += 1) {
    const x = -1.5 + (i / 39) * 3;
    for (let j = 0; j < 40; j += 1) {
      const z = -1.5 + (j / 39) * 3;
      const h = SKIN_RETE(x, z);
      lowest = Math.min(lowest, h);
      highest = Math.max(highest, h);
    }
  }
  assert.ok(highest - lowest > 0.08, 'the dermo-epidermal junction interlocks rather than lying flat');
  assert.ok(Number.isFinite(flat));

  // A follicle is a tube of surface that has grown down: it starts at the top
  // and finishes below the dermis, in the fat.
  const follicle = new THREE.Box3();
  for (const mesh of skin.follicleMeshes) follicle.union(new THREE.Box3().setFromObject(mesh));
  assert.ok(follicle.max.y > L.surface, 'the hair reaches above the surface');
  assert.ok(follicle.min.y < L.dermisFloor, 'and the follicle reaches below the dermis, into the fat');

  // The sebaceous gland opens into the follicle. It does not reach the surface,
  // and that is the whole relation.
  const sebaceous = box('sebaceous-gland');
  assert.ok(sebaceous.intersectsBox(box('hair-follicle')), 'the sebaceous gland opens into the follicle');
  assert.ok(sebaceous.max.y < L.epidermisFloor, 'and never reaches the surface itself');

  // The sweat gland takes the other route: its duct opens on the surface, well
  // away from the hair.
  const sweat = new THREE.Box3();
  for (const mesh of skin.sweatMeshes) sweat.union(new THREE.Box3().setFromObject(mesh));
  assert.ok(sweat.max.y >= L.surface - 0.06, 'the sweat duct reaches the surface');
  assert.ok(sweat.min.y < L.dermisFloor + 0.3, 'from a coil deep in the skin');
  const pore = skin.anchorPoints.sweatPore;
  const mouth = skin.anchorPoints.follicleMouth;
  assert.ok(pore.distanceTo(mouth) > 0.8, 'and it opens nowhere near the hair');

  // Nothing that carries blood is in the epidermis. It is fed across the join,
  // which is why it can be peeled off and live.
  for (const id of ['arteriole', 'venule']) {
    assert.ok(box(id).max.y < L.epidermisFloor, `the ${id} stops below the epidermis`);
  }
  assert.ok(box('sensory-nerve').max.y < L.epidermisFloor, 'and so does the nerve');

  // The fat is inside the compartment, not instead of it.
  const fat = new THREE.Box3();
  for (const mesh of skin.lobuleMeshes) fat.union(new THREE.Box3().setFromObject(mesh));
  assert.ok(subcutis.containsBox(fat), 'every fat lobule is inside the subcutaneous compartment');
  assert.ok(skin.lobuleMeshes.length > 6, 'and there is more than one of them');
});

// --- a lymph node -----------------------------------------------------------

test('a lymph node has many ways in and one way out', () => {
  // The whole shape of a node, and the reason it does what it does: lymph
  // cannot go round it. What is checked is the count and the two ends.
  const node = buildLymphNode();
  node.object.updateMatrixWorld(true);
  const box = (id) => new THREE.Box3().setFromObject(node.mesh(id));
  const at = (id) => box(id).getCenter(new THREE.Vector3());

  // Three depths of one outline, nesting without touching.
  const capsule = box('capsule');
  const cortex = box('cortex');
  const medulla = box('medulla');
  assert.ok(capsule.containsBox(cortex), 'the cortex is inside the capsule');
  assert.ok(cortex.containsBox(medulla), 'and the medulla inside the cortex');

  // The follicles are in the cortex and not in the medulla — which is what
  // makes "the cortex enlarges first" a statement about a place.
  const follicles = new THREE.Box3();
  for (const mesh of node.follicleMeshes) follicles.union(new THREE.Box3().setFromObject(mesh));
  assert.ok(cortex.containsBox(follicles), 'the follicles lie inside the cortex');
  assert.ok(node.follicleMeshes.length > 4, 'and there is more than one of them');

  // Many in, one out. The count is the claim.
  assert.ok(node.afferentMeshes.length >= 3, 'several afferent vessels arrive');
  const afferents = new THREE.Box3();
  for (const mesh of node.afferentMeshes) afferents.union(new THREE.Box3().setFromObject(mesh));
  const efferent = box('efferent-vessel');
  assert.ok(afferents.min.x < capsule.min.x, 'the afferents arrive from outside the node');
  assert.ok(efferent.max.x > capsule.max.x, 'and the efferent leaves it on the other side');
  assert.ok(afferents.max.x < efferent.min.x, 'they are at opposite ends: lymph passes through');

  // Everything that is not lymph uses one door, and the way out is at it.
  const hilum = node.anchorPoints.hilum;
  assert.ok(box('hilum').containsPoint(hilum), 'the hilum marker is at the hilum');
  assert.ok(efferent.distanceToPoint(hilum) < 0.05, 'the efferent vessel leaves at the hilum');
  assert.ok(afferents.distanceToPoint(hilum) > 0.5, 'and no afferent arrives there');
  assert.ok(at('medulla').x > at('cortex').x - 0.3, 'the medulla reaches towards the way out');
});

// --- where lymph drains -----------------------------------------------------

test('lymph does not drain symmetrically', () => {
  // The one fact this scene exists for. Everything else on it — which group is
  // where, which route goes which way — is only useful because of it.
  const routes = buildLymphaticRoutes();
  routes.object.updateMatrixWorld(true);
  const box = (id) => new THREE.Box3().setFromObject(routes.mesh(id));
  /** Towards the patient's left, which is the side the long duct runs up. */
  const left = (point) => point.x * LYMPH_LEFT;

  const thoracic = box('thoracic-duct');
  const right = box('right-lymphatic-duct');
  const span = (b) => b.getSize(new THREE.Vector3()).y;
  assert.ok(span(thoracic) > span(right) * 4, 'the thoracic duct is far longer than the right duct');
  assert.ok(thoracic.min.y < 0, 'it starts in the abdomen');
  assert.ok(left(thoracic.max) > 0, 'and ends on the patient’s left');
  assert.ok(left(right.max) < 0, 'while the right lymphatic duct stays on the patient’s right');
  assert.ok(right.min.y > 0, 'and never leaves the upper body');
  assert.ok(Math.abs(thoracic.max.y - right.max.y) < 0.35, 'both empty at about the same height, at the root of the neck');

  // The sac the long one starts from is at its lower end, not its upper.
  const cistern = routes.anchorPoints.cisternaChyli;
  assert.ok(Math.abs(cistern.y - thoracic.min.y) < 0.35, 'the cisterna chyli is at the thoracic duct’s lower end');

  // Three groups, each paired about the midline, at three heights.
  const groups = ['cervical', 'axillary', 'inguinal'].map((name) => {
    const meshes = routes.groupMeshes[name];
    const bounds = new THREE.Box3();
    for (const mesh of meshes) bounds.union(new THREE.Box3().setFromObject(mesh));
    return { name, meshes, bounds, centre: bounds.getCenter(new THREE.Vector3()) };
  });
  for (const group of groups) {
    assert.ok(group.meshes.length >= 8, `${group.name}: a group is more than one node`);
    assert.ok(group.bounds.min.x < 0 && group.bounds.max.x > 0, `${group.name}: drawn on both sides`);
  }
  const [cervical, axillary, inguinal] = groups;
  assert.ok(cervical.centre.y > axillary.centre.y, 'the neck groups are above the armpit ones');
  assert.ok(axillary.centre.y > inguinal.centre.y, 'and the armpit ones above the groin ones');
  assert.ok(
    Math.abs(axillary.bounds.max.x) > Math.abs(cervical.bounds.max.x),
    'the armpit groups are further out from the midline than the neck ones'
  );
});

// --- the breast -------------------------------------------------------------

test('every duct in a breast ends at one place, and the lobules do not', () => {
  // The division the whole subject is built on: a thing is ductal or it is
  // lobular, and which it is is a question about where along a tree it sits.
  const breast = buildBreast();
  breast.object.updateMatrixWorld(true);
  const box = (id) => new THREE.Box3().setFromObject(breast.mesh(id));
  /** Towards the armpit. Read the wrong way round, the drainage is mirrored. */
  const lateral = (point) => -point.x * BREAST_MEDIAL;

  const nipple = breast.anchorPoints.nipple;
  assert.ok(breast.ductMeshes.length >= 6, 'several duct systems are drawn');
  for (const mesh of breast.ductMeshes) {
    const duct = new THREE.Box3().setFromObject(mesh);
    assert.ok(duct.distanceToPoint(nipple) < 0.12, 'every duct reaches the nipple');
  }
  // And the lobules are at the far end of them, not at the nipple.
  assert.ok(breast.lobuleMeshes.length >= breast.ductMeshes.length, 'each duct ends in lobules');
  for (const mesh of breast.lobuleMeshes) {
    const lobule = new THREE.Box3().setFromObject(mesh);
    assert.ok(lobule.distanceToPoint(nipple) > 0.5, 'no lobule sits at the nipple');
  }
  const ducts = new THREE.Box3();
  for (const mesh of breast.ductMeshes) ducts.union(new THREE.Box3().setFromObject(mesh));
  const lobules = new THREE.Box3();
  for (const mesh of breast.lobuleMeshes) lobules.union(new THREE.Box3().setFromObject(mesh));
  assert.ok(lobules.max.z < ducts.max.z, 'the lobules lie deeper than the ducts’ near ends');

  // Depth: skin outside, fat under it, gland in the fat, muscle behind all of
  // it — and the gland does not enter the muscle.
  const skin = box('skin');
  const fat = box('adipose-tissue');
  const muscle = box('pectoralis-major');
  assert.ok(skin.max.z > fat.max.z, 'the skin is outside the fat');
  assert.ok(fat.containsBox(lobules), 'the gland is inside the fat');
  assert.ok(muscle.max.z <= fat.min.z + 0.2, 'the muscle is behind the gland');
  assert.ok(lobules.min.z > muscle.max.z, 'and nothing glandular is inside it');

  // The ligaments reach the skin. That is why a tethered one shows on it.
  const coopers = new THREE.Box3();
  for (const mesh of breast.cooperMeshes) coopers.union(new THREE.Box3().setFromObject(mesh));
  assert.ok(coopers.max.z > fat.max.z - 0.3, 'Cooper’s ligaments reach out to the skin');
  assert.ok(coopers.min.z < 0, 'and back towards the chest wall');

  // The tail runs out towards the armpit, and the nodes are beyond it.
  const tail = box('axillary-tail');
  const nodes = new THREE.Box3();
  for (const mesh of breast.nodeMeshes) nodes.union(new THREE.Box3().setFromObject(mesh));
  assert.ok(lateral(tail.getCenter(new THREE.Vector3())) > 0, 'the tail runs towards the armpit');
  assert.ok(tail.max.y > 0, 'from the upper part of the gland');
  assert.ok(lateral(nodes.min) > lateral(tail.max) - 0.4, 'and the nodes are beyond it');
  assert.ok(nodes.min.y > fat.getCenter(new THREE.Vector3()).y, 'up in the armpit, not beside the breast');
});

// --- the spine --------------------------------------------------------------

test('the spine curves three ways, and the cord stops before the column does', () => {
  // Two claims, and everything a spine is asked about rests on one of them:
  // which region, and what one segment is made of.
  const spine = buildSpine();
  spine.object.updateMatrixWorld(true);
  const box = (id) => new THREE.Box3().setFromObject(spine.mesh(id));
  const bounds = (meshes) => {
    const b = new THREE.Box3();
    for (const mesh of meshes) b.union(new THREE.Box3().setFromObject(mesh));
    return b;
  };

  // Four regions, stacked in order.
  const cervical = bounds(spine.regionMeshes.cervical);
  const thoracic = bounds(spine.regionMeshes.thoracic);
  const lumbar = bounds(spine.regionMeshes.lumbar);
  const sacrum = box('sacrum');
  assert.ok(cervical.min.y > thoracic.max.y - 0.3, 'the cervical spine is above the thoracic');
  assert.ok(thoracic.min.y > lumbar.max.y - 0.3, 'the thoracic above the lumbar');
  assert.ok(lumbar.min.y > sacrum.max.y - 0.3, 'and the lumbar above the sacrum');
  assert.ok(spine.regionMeshes.cervical.length === 7, 'seven cervical vertebrae');
  assert.ok(spine.regionMeshes.thoracic.length === 12, 'twelve thoracic');

  // Three curves, alternating. A spine drawn straight is a stick.
  const forward = (y) => SPINE_AT(y) * SPINE_FORWARD;
  assert.ok(forward(4.0) > 0.1, 'the neck curves forward');
  assert.ok(forward(1.5) < -0.1, 'the chest curves back');
  assert.ok(forward(-1.0) > 0.1, 'and the low back forward again');

  // The canal runs behind the bodies, the whole way down.
  const canal = box('spinal-canal');
  const body = box('vertebral-body');
  assert.ok(canal.max.z < body.min.z + 0.15, 'the canal is behind the vertebral bodies');
  assert.ok(canal.getSize(new THREE.Vector3()).y > 5, 'and runs most of the column');

  // The cord stops partway down; roots continue below it. That single fact is
  // why a needle low down is a different proposition.
  const cord = box('spinal-cord');
  const cauda = bounds(spine.caudaMeshes);
  assert.ok(cord.min.y > canal.min.y + 1.0, 'the cord stops well above the bottom of the canal');
  assert.ok(cauda.min.y < cord.min.y, 'and the cauda equina continues below it');
  assert.ok(cauda.max.y <= cord.min.y + 0.3, 'taking over where the cord ends');
  assert.ok(spine.caudaMeshes.length > 3, 'as a bundle of strands rather than one structure');

  // The disc is below the body, not inside it, and the nucleus is inside the
  // annulus: two tissues, and the difference between them is the whole subject.
  const annulus = box('annulus-fibrosus');
  const nucleus = box('nucleus-pulposus');
  assert.ok(annulus.max.y <= body.min.y + 1e-6, 'the disc sits below the vertebral body');
  assert.ok(annulus.containsBox(nucleus), 'and the nucleus is inside the annulus');

  // The arch: pedicles from the body back, laminae closing it, facets on the
  // sides, roots leaving underneath.
  const pedicles = bounds(spine.pedicleMeshes);
  const laminae = bounds(spine.laminaMeshes);
  const roots = bounds(spine.rootMeshes);
  assert.ok(pedicles.max.z < body.max.z, 'the pedicles run back from the body');
  assert.ok(laminae.max.z < pedicles.min.z + 0.1, 'the laminae close the arch behind them');
  assert.ok(box('spinous-process').min.z < laminae.min.z + 0.1, 'and the spinous process is behind those');
  assert.ok(roots.max.x > pedicles.max.x, 'the roots leave laterally');
  assert.ok(roots.min.y < pedicles.min.y, 'passing out beneath the pedicles');
});

// --- the nose and the paranasal sinuses -------------------------------------

test('the nose is three shelves, three gutters, and what opens into each', () => {
  // Every claim this scene makes is about *which gutter* a thing arrives in, so
  // that is what is measured: the order of the shelves, the space under each
  // one, and the two openings that a reader is told apart by where they end.
  const nose = buildNose();
  nose.object.updateMatrixWorld(true);
  const box = (id) => new THREE.Box3().setFromObject(nose.mesh(id));
  const at = (id) => box(id).getCenter(new THREE.Vector3());
  /** Towards the septum. Read the wrong way round, the cavity is inside out. */
  const medially = (point) => point.x * NOSE_MEDIAL;

  // Three shelves, in order, all on the one wall and none of them reaching the
  // septum — a turbinate that touched the midline would have closed the cavity.
  const shelves = ['inferior-turbinate', 'middle-turbinate', 'superior-turbinate'];
  for (let i = 1; i < shelves.length; i += 1) {
    assert.ok(at(shelves[i]).y > at(shelves[i - 1]).y, `the ${shelves[i]} sits above the ${shelves[i - 1]}`);
  }
  const wall = box('lateral-nasal-wall');
  const septum = box('nasal-septum');
  for (const id of shelves) {
    assert.ok(box(id).intersectsBox(wall), `the ${id} hangs off the lateral wall`);
    assert.ok(!box(id).intersectsBox(septum), `and the ${id} does not reach the septum`);
    // The free edge hangs below the attachment: that curl is what makes a
    // shelf into a roof over the gutter under it.
    const level = NOSE_TURBINATES[id.split('-')[0]];
    const edge = noseTurbinateSurface(level, NOSE_CAVITY.lateralWall + NOSE_MEDIAL * level.reach);
    assert.ok(edge < level.attachY - 0.05, `and the ${id} curls downwards away from the wall`);
  }

  // Each gutter is the space under the shelf it is named for, and above the
  // next structure down. They are built from one surface function, and this is
  // the check that the function is the one being used.
  const pairs = [
    ['inferior-meatus', NOSE_TURBINATES.inferior, null],
    ['middle-meatus', NOSE_TURBINATES.middle, NOSE_TURBINATES.inferior],
    ['superior-meatus', NOSE_TURBINATES.superior, NOSE_TURBINATES.middle],
  ];
  for (const [id, above, below] of pairs) {
    const gutter = box(id);
    assert.ok(gutter.max.y <= above.attachY + 1e-6, `the ${id} is under the ${above.id} turbinate`);
    // The lowest the gutter's floor gets is at its medial edge, where the
    // turbinate below it has curled furthest down. Nothing about the gutter may
    // sink below that, or the space would be inside the shelf under it.
    const floor = below
      ? noseTurbinateSurface(below, noseTurbinateEdge(above)) + below.thickness
      : NOSE_CAVITY.floor;
    assert.ok(gutter.min.y >= floor - 1e-6, `and the ${id} is above what is below it`);
    assert.ok(
      medially(gutter.max) <= medially(new THREE.Vector3(noseTurbinateEdge(above), 0, 0)) + 1e-6,
      `and does not reach past the free edge of the ${above.id} turbinate`
    );
  }
  assert.ok(!box('inferior-meatus').intersectsBox(box('middle-meatus')), 'the gutters are three spaces, not one');
  assert.ok(!box('middle-meatus').intersectsBox(box('superior-meatus')), 'and the upper two are separate too');

  // The fact the scene exists for: the maxillary sinus lets go near its roof.
  const sinus = box('maxillary-sinus');
  const ostium = box('maxillary-ostium');
  const height = sinus.max.y - sinus.min.y;
  assert.ok(ostium.min.y > sinus.min.y + 0.6 * height, 'the maxillary ostium is near the roof of the sinus, not its floor');
  assert.ok(ostium.intersectsBox(sinus), 'it starts inside the sinus');
  assert.ok(ostium.intersectsBox(box('middle-meatus')), 'and ends in the middle meatus');
  assert.ok(!ostium.intersectsBox(box('inferior-meatus')), 'and nowhere else');
  assert.ok(!ostium.intersectsBox(box('superior-meatus')), 'and nowhere else above either');

  // The one thing that does open into the lowest gutter, and it is not a sinus.
  // Measured at the opening rather than over the whole tube: the duct descends
  // through the wall right past the middle meatus, so the claim is about where
  // it *ends*, not about what it goes near.
  const opening = nose.anchorPoints.nasolacrimalOpening;
  assert.ok(box('nasolacrimal-duct').distanceToPoint(opening) < 1e-6, 'the tear duct reaches its opening');
  assert.ok(box('inferior-meatus').containsPoint(opening), 'and the opening is in the inferior meatus');
  assert.ok(!box('middle-meatus').containsPoint(opening), 'and not in the middle one');
  for (const id of ['maxillary-sinus', 'frontal-sinus', 'sphenoid-sinus']) {
    assert.ok(!box(id).intersectsBox(box('inferior-meatus')), `no sinus opens into the inferior meatus (${id})`);
  }

  // Smell is a small patch, high up and out of the way.
  const olfactory = new THREE.Box3();
  for (const mesh of nose.olfactoryParts) olfactory.union(new THREE.Box3().setFromObject(mesh));
  for (const id of shelves) {
    assert.ok(olfactory.min.y > box(id).max.y, `the olfactory patch is above the ${id}`);
  }
  assert.ok(olfactory.max.y > NOSE_CAVITY.roof, 'and its filaments leave through the roof');

  // And the cavity runs from the nostril back to the pharynx.
  assert.ok(box('nasal-vestibule').min.z > at('middle-turbinate').z, 'the vestibule is in front of the shelves');
  assert.ok(box('nasopharynx').max.z <= NOSE_CAVITY.choana + 0.1, 'the nasopharynx is behind the choana');
  assert.ok(box('hard-palate').max.y <= NOSE_CAVITY.floor + 0.1, 'and the palate is the floor they all stand on');
});

// --- the larynx and the pharynx ---------------------------------------------

test('the larynx and pharynx sort one shared space back into two', () => {
  // The scene's whole claim is an arrangement, so that is what is measured:
  // what is above what, what is in front of what, and which of the two routes
  // each space belongs to once they have parted again.
  const larynx = buildLarynx();
  larynx.object.updateMatrixWorld(true);
  const box = (id) => {
    const bounds = new THREE.Box3();
    for (const mesh of larynx.meshesFor(id)) bounds.union(new THREE.Box3().setFromObject(mesh));
    return bounds;
  };
  const L = LARYNX_LEVELS;

  // One lumen, three names, stacked at the levels the names come from.
  const lengths = ['nasopharynx', 'oropharynx', 'laryngopharynx'];
  for (let i = 1; i < lengths.length; i += 1) {
    assert.ok(box(lengths[i]).max.y <= box(lengths[i - 1]).min.y + 1e-6, `${lengths[i]} is below ${lengths[i - 1]}`);
  }
  assert.ok(Math.abs(box('nasopharynx').min.y - L.softPalate) < 1e-6, 'the soft palate is where the top one ends');
  assert.ok(Math.abs(box('oropharynx').min.y - L.laryngealInlet) < 1e-6, 'and the inlet where the middle one does');

  // The gutters reach forward past the larynx; the space behind it does not.
  const behind = box('laryngopharynx');
  const gutters = box('piriform-sinus');
  assert.ok(gutters.max.z > behind.max.z + 0.2, 'the piriform gutters reach forward past the laryngopharynx');
  // Measured through the function rather than the bounding box: the lumen
  // leans back as it descends, so its box reaches forward at the top where
  // there is no larynx yet. The claim is about the level of the folds.
  assert.ok(
    pharynxFrontAt(L.vocalFold, 0) < box('cricoid-cartilage').min.z + 0.02,
    'the space behind the larynx stays behind the cricoid'
  );
  assert.ok(pharynxFrontAt(L.vocalFold, 0.95) > 0, 'while beside it the lumen reaches forward past the airway');
  for (const mesh of larynx.meshesFor('piriform-sinus')) {
    const side = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
    assert.ok(Math.abs(side.x) > 0.3, 'and each gutter is off to one side of the midline');
  }
  assert.equal(larynx.meshesFor('piriform-sinus').length, 2, 'there are two of them');

  // Two pairs of folds, and the pocket that proves they are two.
  const vestibular = box('vestibular-fold');
  const ventricle = box('laryngeal-ventricle');
  const vocal = box('vocal-fold');
  assert.ok(ventricle.max.y <= vestibular.min.y + 1e-6, 'the ventricle is below the false folds');
  assert.ok(vocal.max.y <= ventricle.min.y + 1e-6, 'and the true folds below the ventricle');

  // The glottis is a V: the folds meet in front and are apart behind.
  const [left, right] = larynx.meshesFor('vocal-fold').map((mesh) => mesh.geometry.attributes.position);
  /** How close to the midline this fold gets, at the front of the glottis. */
  const freeEdgeAt = (positions, targetZ) => {
    const v = new THREE.Vector3();
    let nearest = Infinity;
    for (let i = 0; i < positions.count; i += 1) {
      v.fromBufferAttribute(positions, i);
      if (Math.abs(v.z - targetZ) < 0.02) nearest = Math.min(nearest, Math.abs(v.x));
    }
    return nearest;
  };
  const frontGap = freeEdgeAt(left, 0.76) + freeEdgeAt(right, 0.76);
  assert.ok(frontGap < 0.08, `the two folds meet at the front (${frontGap.toFixed(3)})`);
  assert.ok(vocal.max.x > GLOTTIS_DISPLAY_GAP, 'and are apart behind by the declared display gap');

  // Each fold is inside the cartilage it is attached to.
  const thyroid = box('thyroid-cartilage');
  assert.ok(vocal.max.x <= thyroid.max.x + 1e-6, 'the folds do not reach past the thyroid cartilage');

  // The one place the airway is under the skin: between the two cartilages,
  // in front of both, and in front of the airway itself.
  const membrane = box('cricothyroid-membrane');
  const cricoid = box('cricoid-cartilage');
  assert.ok(membrane.min.y < thyroid.min.y + 0.1, 'the membrane starts below the thyroid cartilage');
  assert.ok(membrane.max.y > cricoid.max.y - 0.72, 'and reaches up from the cricoid');
  assert.ok(membrane.max.z > box('subglottic-space').max.z, 'with the airway directly behind it');

  // And where the two ways part again.
  const trachea = box('trachea');
  const oesophagus = box('oesophagus');
  assert.ok(oesophagus.max.z < trachea.min.z, 'the oesophagus is wholly behind the trachea');
  const nerves = larynx.meshesFor('recurrent-laryngeal-nerve');
  assert.equal(nerves.length, 2, 'one nerve on each side');
  for (const mesh of nerves) {
    const nerve = new THREE.Box3().setFromObject(mesh);
    assert.ok(nerve.max.z < trachea.min.z && nerve.min.z > oesophagus.max.z - 0.3, 'in the groove between them');
    assert.ok(nerve.max.y > L.vocalFold - 0.2, 'reaching the larynx from below');
    assert.ok(nerve.min.y < L.cricoidBase, 'and coming from below to do it');
  }
});

// --- the mouth and the tongue -----------------------------------------------

test('the tongue is two parts, and a duct opens nowhere near its gland', () => {
  // The scene makes two claims. One is a boundary that nothing on the surface
  // shows except a row of papillae; the other is that three glands outside the
  // mouth deliver into it somewhere else entirely. Both are measured here.
  const mouth = buildOralCavity();
  mouth.object.updateMatrixWorld(true);
  const box = (id) => {
    const bounds = new THREE.Box3();
    for (const mesh of mouth.meshesFor(id)) bounds.union(new THREE.Box3().setFromObject(mesh));
    return bounds;
  };
  const sideBox = (id, side) => new THREE.Box3().setFromObject(mouth.meshesFor(id)[side]);

  // Two parts of one tongue, meeting on one line and not overlapping.
  const front = box('tongue-oral-part');
  const root = box('tongue-root');
  assert.ok(Math.abs(front.min.z - SULCUS_Z) < 1e-6, 'the oral part ends at the sulcus');
  assert.ok(Math.abs(root.max.z - SULCUS_Z) < 1e-6, 'and the root begins there');

  // And the only thing on the surface that marks that line.
  const papillae = box('vallate-papillae');
  assert.ok(papillae.max.z > SULCUS_Z && papillae.min.z < SULCUS_Z + 0.42, 'the papillae lie on the boundary');
  assert.ok(box('lingual-tonsil').max.z < SULCUS_Z, 'the lingual tonsil is behind it, on the root');
  assert.ok(papillae.min.y > front.min.y, 'and the papillae are on the surface, not inside the tongue');

  // The tongue sits between the roof above and the floor below.
  assert.ok(front.max.y < box('hard-palate').min.y, 'the tongue is below the palate');
  assert.ok(front.min.y > box('floor-of-mouth').min.y, 'and above the floor of the mouth');

  // The jaw is drawn open by exactly the amount the constant declares — so the
  // display value cannot drift away from what is drawn.
  const opening = box('upper-teeth').min.y - box('lower-teeth').max.y;
  assert.ok(
    Math.abs(opening - JAW_DISPLAY_OPENING) < 0.1,
    `the two rows are apart by the declared display opening (${opening.toFixed(2)})`
  );
  assert.ok(box('mandible').min.y < box('lower-teeth').min.y, 'the jaw is below the teeth standing in it');
  assert.ok(box('mandible').min.z < box('lower-teeth').min.z - 1, 'and reaches back behind them, as its rami do');
  assert.ok(box('lower-teeth').max.x < box('upper-teeth').max.x, 'and the lower arch is inside the upper one');

  // A doorway, with a tonsil in the bed behind each side of its frame.
  for (const side of [0, 1]) {
    const arch = sideBox('palatoglossal-arch', side);
    const tonsil = sideBox('palatine-tonsil', side);
    assert.ok(arch.max.y > box('soft-palate').min.y, 'the arch starts up under the soft palate');
    assert.ok(arch.min.y < front.max.y, 'and ends down beside the tongue');
    assert.ok(tonsil.max.z < arch.max.z, 'the tonsil is behind its arch');
    assert.ok(Math.sign(tonsil.getCenter(new THREE.Vector3()).x) === Math.sign(arch.getCenter(new THREE.Vector3()).x),
      'and on the same side as it');
  }

  // The claim about the glands: each duct starts in its own gland and ends
  // somewhere else entirely.
  const caruncle = mouth.anchorPoints.caruncle;
  const parotidOpening = mouth.anchorPoints.parotidOpening;
  for (const side of [0, 1]) {
    const submandibular = sideBox('submandibular-gland', side);
    const submandibularDuct = sideBox('submandibular-duct', side);
    assert.ok(submandibularDuct.intersectsBox(submandibular), 'the submandibular duct starts at its gland');
    assert.ok(submandibularDuct.max.z > submandibular.max.z + 2, 'and runs a long way forwards from it');

    const parotid = sideBox('parotid-gland', side);
    const parotidDuct = sideBox('parotid-duct', side);
    assert.ok(parotidDuct.intersectsBox(parotid), 'the parotid duct starts at its gland');
    assert.ok(parotidDuct.max.z > parotid.max.z + 2, 'and runs forwards across the cheek');
    assert.ok(parotid.max.z < box('lower-teeth').min.z, 'the parotid gland itself is behind the teeth');
  }
  // Where each of them arrives.
  assert.ok(
    Math.abs(parotidOpening.y - box('upper-teeth').min.y) < 0.5,
    'the parotid duct opens level with the upper teeth'
  );
  assert.ok(caruncle.y < box('lower-teeth').min.y, 'and the submandibular one under the tongue');
  assert.ok(box('lingual-frenulum').distanceToPoint(caruncle) < 1.1, 'beside the frenulum');
  // The smallest pair is the one that opens where it sits.
  const sublingual = box('sublingual-gland');
  assert.ok(sublingual.distanceToPoint(caruncle) < 1.2, 'the sublingual glands are where their saliva arrives');
});

// --- the pelvic floor -------------------------------------------------------

test('the pelvic floor is a sheet with a real gap in it, and a sling behind the bowel', () => {
  // Two things make this anatomy what it is: a hole in the front of the sheet
  // that nothing closes, and one part of the sheet that is a sling rather than
  // a sheet. Both are measured here, because both are easy to draw away.
  const pelvis = buildPelvicFloor();
  pelvis.object.updateMatrixWorld(true);
  const box = (id) => {
    const bounds = new THREE.Box3();
    for (const mesh of pelvis.meshesFor(id)) bounds.union(new THREE.Box3().setFromObject(mesh));
    return bounds;
  };

  // One sheet, three slices, front to back and not on top of one another.
  const slices = ['pubococcygeus', 'iliococcygeus', 'coccygeus'];
  for (let i = 1; i < slices.length; i += 1) {
    const ahead = box(slices[i - 1]).getCenter(new THREE.Vector3());
    const behind = box(slices[i]).getCenter(new THREE.Vector3());
    assert.ok(behind.z < ahead.z, `${slices[i]} is behind ${slices[i - 1]}`);
  }
  // And all of them hang from the line the tendinous arch is drawn along.
  const arch = box('tendinous-arch');
  for (const id of slices) {
    assert.ok(box(id).intersectsBox(arch) || box(id).max.y > arch.min.y, `${id} reaches the arch it hangs from`);
  }
  const originMid = new THREE.Vector3(...levatorOrigin(0.5, 1));
  assert.ok(arch.distanceToPoint(originMid) < 0.2, 'the arch is drawn along the sheet’s own origin line');

  // The gap. Its edges are the sheet's medial edges, so it cannot be widened
  // without moving the sheet.
  const hiatus = box('urogenital-hiatus');
  const sheet = box('pubococcygeus');
  assert.ok(hiatus.max.x < sheet.max.x, 'the gap is inside the sheet that bounds it');
  assert.ok(HIATUS_BACK_T > 0 && HIATUS_BACK_T < 1, 'and it ends part way back along the sheet');

  // What goes through it, and what does not.
  for (const id of ['urethra', 'vagina']) {
    const viscus = box(id);
    assert.ok(viscus.max.x < hiatus.max.x + 0.05, `the ${id} is within the width of the gap`);
    assert.ok(
      viscus.max.z < hiatus.max.z + 0.05 && viscus.min.z > hiatus.min.z - 0.05,
      `and within its depth`
    );
  }
  assert.ok(box('anal-canal').max.z < hiatus.min.z, 'the bowel does not go through the urogenital gap');

  // A sling, not a ring: behind the bowel, and reaching the pubis on both sides.
  const sling = box('puborectalis');
  const anal = box('anal-canal');
  assert.ok(sling.min.z < anal.min.z, 'the sling passes behind the bowel');
  assert.ok(sling.max.z > box('urogenital-hiatus').max.z - 0.4, 'and comes forward to the pubis');
  assert.ok(sling.max.x > 0.5 && sling.min.x < -0.5, 'on both sides');
  assert.ok(sling.min.y > box('external-anal-sphincter').min.y, 'and it is above the sphincter below it');

  // The knot between the two halves of the perineum.
  const body = pelvis.anchorPoints.perinealBody;
  assert.ok(body.z < box('vagina').min.z, 'the perineal body is behind the vagina');
  assert.ok(body.z > anal.max.z, 'and in front of the anal canal');

  // And the frame the whole thing is slung inside.
  const ring = box('pelvic-ring');
  assert.ok(ring.min.x < sheet.min.x && ring.max.x > sheet.max.x, 'the ring is outside the sheet');
  assert.ok(ring.containsPoint(originMid) || ring.distanceToPoint(originMid) < 0.6, 'which the sheet hangs from');
});

// --- the hand and wrist -----------------------------------------------------

test('the wrist is eight bones in an arch, with a lid and ten things under it', () => {
  // Two claims: the carpus is an arch with a roof, and the five rays are not
  // five of the same thing. Both are the kind of fact a model quietly loses.
  const hand = buildHand();
  hand.object.updateMatrixWorld(true);
  const box = (id) => {
    const bounds = new THREE.Box3();
    for (const mesh of hand.meshesFor(id)) bounds.union(new THREE.Box3().setFromObject(mesh));
    return bounds;
  };
  const at = (id) => box(id).getCenter(new THREE.Vector3());
  /** Towards the thumb. Read the wrong way round, the hand is a left one. */
  const radially = (point) => point.x * HAND_RADIAL;

  // Two rows, the far one further out.
  const proximal = ['scaphoid', 'lunate', 'triquetrum'];
  const distal = ['trapezium', 'trapezoid', 'capitate', 'hamate'];
  for (const far of distal) {
    for (const near of proximal) {
      assert.ok(at(far).y > at(near).y, `the ${far} is distal to the ${near}`);
    }
  }
  // And each row runs from the thumb side across.
  for (const row of [proximal, distal]) {
    for (let i = 1; i < row.length; i += 1) {
      assert.ok(radially(at(row[i])) < radially(at(row[i - 1])), `${row[i]} is ulnar to ${row[i - 1]}`);
    }
  }
  // The pisiform is not a fourth bone in the row: it is on top of one.
  const pisiform = at('pisiform');
  const triquetrum = at('triquetrum');
  assert.ok(pisiform.z > triquetrum.z + 0.4, 'the pisiform sits palmar to the triquetrum');
  assert.ok(Math.abs(pisiform.y - triquetrum.y) < 0.4, 'rather than beyond it');

  // An arch with a lid. The band reaches both pillars, and the space is under
  // it and over the bones.
  const band = box('flexor-retinaculum');
  const tunnel = box('carpal-tunnel');
  for (const pillar of [TUNNEL.radialPillar, TUNNEL.ulnarPillar]) {
    assert.ok(band.distanceToPoint(new THREE.Vector3(...pillar)) < 0.25, 'the band reaches its pillar');
  }
  assert.ok(tunnel.max.z <= band.max.z, 'the tunnel is under the band');
  assert.ok(tunnel.min.z > at('capitate').z, 'and palmar to the bones it arches over');
  // Measured against the band rather than against the tunnel's deepest point:
  // the tunnel's floor rises towards each pillar, so its overall minimum is the
  // middle of the arch and comparing a radial bone against it says nothing.
  for (const id of ['scaphoid', 'lunate', 'capitate', 'hamate']) {
    assert.ok(at(id).z < band.min.z, `the ${id} is under the band, not through it`);
  }

  // The nerve is the most palmar thing in the tunnel.
  const nerve = box('median-nerve');
  const tendons = box('flexor-tendons');
  const inTunnel = (b) => b.min.y < TUNNEL.to && b.max.y > TUNNEL.from;
  assert.ok(inTunnel(nerve) && inTunnel(tendons), 'both run through the tunnel');
  for (const mesh of hand.meshesFor('flexor-tendons')) {
    const tendon = new THREE.Box3().setFromObject(mesh);
    assert.ok(tendon.max.z < nerve.max.z, 'every flexor tendon is deep to the nerve');
  }
  // And the extensors are on the other side of everything.
  assert.ok(box('extensor-tendons').max.z < box('metacarpals').min.z + 0.2, 'the extensors are dorsal to the bones');

  // Five rays, and one of them is a thumb.
  assert.equal(hand.meshesFor('metacarpals').length, 5, 'five metacarpals');
  assert.equal(hand.meshesFor('proximal-phalanges').length, 5, 'five proximal phalanges');
  assert.equal(hand.meshesFor('middle-phalanges').length, 4, 'four middle phalanges — the thumb has none');
  assert.equal(hand.meshesFor('distal-phalanges').length, 5, 'five distal phalanges');
  assert.equal(raySegment(RAYS[0], 'middle'), null, 'and the table is where that is written down');

  // Each ray's bones run in order out along one line.
  for (const ray of RAYS) {
    let previous = null;
    for (const bone of ['metacarpal', 'proximal', 'middle', 'distal']) {
      const segment = raySegment(ray, bone);
      if (!segment) continue;
      if (previous) {
        assert.ok(segment.from[1] > previous[1], `${ray.id}: the ${bone} starts beyond the bone before it`);
      }
      previous = segment.to;
    }
  }
  // The thumb is the one that is set apart from the rest.
  const thumbTip = raySegment(RAYS[0], 'distal').to;
  const middleTip = raySegment(RAYS[2], 'distal').to;
  const spread = (ray) => {
    const tip = raySegment(ray, 'distal').to;
    return Math.hypot(tip[0] - middleTip[0], tip[1] - middleTip[1], tip[2] - middleTip[2]);
  };
  for (const ray of RAYS.slice(1)) {
    if (ray.id === 'middle') continue;
    assert.ok(spread(RAYS[0]) > spread(ray), `the thumb is further from the middle finger than the ${ray.id} is`);
  }
  assert.ok(radially(new THREE.Vector3(...thumbTip)) > 0, 'and it is on the radial side');

  // The bones are where the carpal table says they are.
  for (const [id, spec] of Object.entries(CARPALS)) {
    const centre = at(id);
    assert.ok(centre.distanceTo(new THREE.Vector3(...spec.at)) < 0.08, `${id} is where the table puts it`);
  }
});

// --- the foot and ankle -----------------------------------------------------

test('a foot is an arch with a bowstring under it, and a bone in a socket', () => {
  // The arch is a relationship between bones rather than a bone, so it is the
  // easiest thing in this model to lose without noticing. Everything below is
  // a way of noticing.
  const foot = buildFoot();
  foot.object.updateMatrixWorld(true);
  const box = (id) => {
    const bounds = new THREE.Box3();
    for (const mesh of foot.meshesFor(id)) bounds.union(new THREE.Box3().setFromObject(mesh));
    return bounds;
  };
  const at = (id) => box(id).getCenter(new THREE.Vector3());
  /** Towards the big toe. Read the wrong way round, the foot is a left one. */
  const medially = (point) => point.x * FOOT_MEDIAL;

  // The arch: high on the inside, low on the outside.
  assert.ok(at('navicular').y > at('cuboid').y + 1, 'the navicular rides higher than the cuboid');
  assert.ok(medially(at('navicular')) > medially(at('cuboid')), 'and it is the one on the inside');

  // The bowstring, under the whole of it.
  const fascia = box('plantar-fascia');
  // Measured against the bones rather than against a number: the foot is laid
  // out in centimetres and drawn at `WORLD_SCALE`, so a literal here would be
  // in neither unit.
  assert.ok(fascia.min.z < box('calcaneus').min.z + 2.0, 'the band starts back at the heel');
  assert.ok(fascia.max.z > box('cuneiforms').max.z, 'and runs forward past the tarsus into the forefoot');
  assert.ok(fascia.max.z > box('metatarsals').getCenter(new THREE.Vector3()).z, 'to the heads of the metatarsals');
  assert.ok(fascia.max.y < ARCH.summit[1], 'passing below the summit of the arch the whole way');
  assert.ok(box('spring-ligament').max.y > fascia.max.y, 'and the short sling sits above it');

  // A bone in a socket, with a second joint under it.
  const talus = box('talus');
  assert.ok(talus.min.y > box('calcaneus').max.y - 0.6, 'the talus sits on the heel bone');
  assert.ok(talus.max.y < box('tibia').max.y, 'with the leg above it');
  const ankle = box('ankle-joint');
  const subtalar = box('subtalar-joint');
  assert.ok(ankle.min.y > talus.max.y - 0.3, 'the ankle joint is at the top of the talus');
  assert.ok(subtalar.max.y < talus.min.y + 0.3, 'and the subtalar joint at the bottom of it');
  assert.ok(subtalar.max.y < ankle.min.y, 'one below the other, which is the point of naming both');

  // The two malleoli are not the same length, and that asymmetry is the claim.
  assert.ok(box('fibula').min.y < box('tibia').min.y, 'the lateral malleolus reaches lower than the medial one');
  assert.ok(medially(at('fibula')) < 0, 'and the fibula is the lateral bone');

  // One sheet inside, three bands outside.
  assert.equal(foot.meshesFor('deltoid-ligament').length, 1, 'the deltoid is one sheet');
  assert.equal(foot.meshesFor('lateral-ligaments').length, 3, 'the lateral side is three bands');
  assert.ok(medially(at('deltoid-ligament')) > 0, 'the deltoid is on the inside');
  for (const mesh of foot.meshesFor('lateral-ligaments')) {
    const band = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
    assert.ok(medially(band) < 0, 'and every lateral band is on the outside');
  }

  // Five rays, and one of them is a great toe.
  assert.equal(foot.meshesFor('metatarsals').length, 5, 'five metatarsals');
  assert.equal(foot.meshesFor('proximal-phalanges').length, 5, 'five proximal phalanges');
  assert.equal(foot.meshesFor('middle-phalanges').length, 4, 'four middle phalanges — the great toe has none');
  assert.equal(foot.meshesFor('distal-phalanges').length, 5, 'five distal phalanges');
  assert.equal(footSegment(FOOT_RAYS[0], 'middle'), null, 'and the table is where that is written down');
  for (const ray of FOOT_RAYS) {
    let previous = null;
    for (const bone of ['metatarsal', 'proximal', 'middle', 'distal']) {
      const segment = footSegment(ray, bone);
      if (!segment) continue;
      if (previous) assert.ok(segment.from[2] > previous[2], `${ray.id}: the ${bone} is in front of the one before it`);
      previous = segment.to;
    }
  }
  // And nothing goes through the ground it stands on.
  const all = new THREE.Box3().setFromObject(foot.object);
  assert.ok(all.min.y >= 0, 'the whole foot is above the ground line it stands on');
});

// --- the skeleton, whole ----------------------------------------------------

test('a pelvis is a funnel with one gap, and one crossing that has two names', () => {
  // The scene's subject is a crossing that is the same in both sets of organs,
  // so the test is that the model cannot make the claim for one set and not the
  // other — both crossing structures come from the same point, and the ureter
  // is written under it.
  const pelvis = buildPelvis();
  pelvis.object.updateMatrixWorld(true);
  const box = (id) => {
    const bounds = new THREE.Box3();
    for (const mesh of pelvis.meshesFor(id)) bounds.union(new THREE.Box3().setFromObject(mesh));
    return bounds;
  };
  const points = (id) => {
    const out = [];
    for (const mesh of pelvis.meshesFor(id)) {
      const position = mesh.geometry.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < position.count; i += 1) {
        out.push(mesh.localToWorld(v.fromBufferAttribute(position, i).clone()).divideScalar(PELVIS_SCALE));
      }
    }
    return out;
  };

  // 1. **The crossing.** The ureter passes below the bridge point on each side,
  //    and both crossing structures pass through it.
  for (const side of [PELVIS_LEFT, -PELVIS_LEFT]) {
    const bridge = bridgeAt(side);
    const nearest = (id) =>
      points(id)
        .filter((p) => p.x * side > 0)
        .reduce((best, p) =>
          Math.hypot(p.x - bridge[0], p.z - bridge[2]) < Math.hypot(best.x - bridge[0], best.z - bridge[2])
            ? p
            : best
        );
    assert.ok(
      nearest('ureters').y < bridge[1] - UNDER_THE_BRIDGE * 0.4,
      'the ureter passes under the bridge'
    );
    // Both of them, from the same point — one claim, not two.
    for (const id of ['uterine-artery', 'vas-deferens']) {
      const crossing = nearest(id);
      assert.ok(
        Math.hypot(crossing.x - bridge[0], crossing.y - bridge[1], crossing.z - bridge[2]) < 0.7,
        `the ${id} passes through the bridge point`
      );
      assert.ok(crossing.y > nearest('ureters').y, `and over the ureter, not under it`);
    }
  }

  // 2. **One gap, and only the passages are in it.** Everything else in the
  //    true pelvis rests on the sheet around it.
  const at = pelvisSection(PELVIS_LEVELS.floorLevel);
  for (const id of ['urethra', 'anal-canal', 'vagina']) {
    const low = points(id).reduce((best, p) => (p.y < best.y ? p : best));
    assert.ok(inHiatus(low.x, low.z), `the ${id} passes through the gap`);
  }
  for (const id of ['bladder', 'prostate', 'uterus']) {
    for (const p of points(id)) {
      if (inHiatus(p.x, p.z)) continue;
      assert.ok(p.y >= floorAt(p.x, p.z) - 1e-6, `no part of the ${id} is below the sling`);
    }
  }
  // The gap really is a gap: the sheet starts outside it on every ray.
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
    const from = edgeOfHiatus(a, at);
    const x = Math.cos(a) * from * at.halfWidth * 0.94;
    const z = at.centreZ + Math.sin(a) * from * at.halfDepth * 0.94;
    assert.ok(!inHiatus(x, z), 'the sheet begins where the gap ends');
  }

  // 3. The pouch is the lowest point the peritoneum reaches.
  const pouch = box('peritoneal-pouch');
  assert.ok(
    pouch.min.y < box('pelvic-peritoneum').min.y + 1e-6,
    'the pouch is the lowest part of the peritoneum'
  );
  // And it lies between the bladder in front and the rectum behind.
  assert.ok(box('bladder').max.z > pouch.max.z, 'the bladder is in front of the pouch');
  assert.ok(box('rectum').min.z < pouch.min.z, 'and the rectum behind it');

  // 4. Neither set is displaced to make room for the other: each is where it
  //    would be on its own, and the two overlap in the region between the
  //    bladder and the rectum — which is exactly why no body has both.
  const female = box('uterus');
  const male = box('prostate').union(box('seminal-vesicles'));
  assert.ok(female.intersectsBox(male), 'the two sets occupy the same region');
  for (const id of [...PELVIS_FEMALE_SET, ...PELVIS_MALE_SET]) {
    assert.ok(pelvis.meshesFor(id).length > 0, `${id} is drawn`);
  }

  pelvis.dispose();
});

test('an abdomen sorts into one bag and what is behind it, and two organs straddle the line', () => {
  // The scene makes one claim about every organ in it — which side of the
  // peritoneum it is on — so the test is that claim, checked against the same
  // function the geometry is built from. A label that disagrees with the
  // geometry is the failure this is here to catch.
  const abdomen = buildAbdomen();
  abdomen.object.updateMatrixWorld(true);
  const box = (id) => {
    const bounds = new THREE.Box3();
    for (const mesh of abdomen.meshesFor(id)) bounds.union(new THREE.Box3().setFromObject(mesh));
    return bounds;
  };
  const points = (id) => {
    const out = [];
    for (const mesh of abdomen.meshesFor(id)) {
      const position = mesh.geometry.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < position.count; i += 1) {
        out.push(mesh.localToWorld(v.fromBufferAttribute(position, i).clone()).divideScalar(ABDOMEN_SCALE));
      }
    }
    return out;
  };
  const share = (id, wanted) => {
    const all = points(id);
    const matching = all.filter((p) => isRetroperitoneal(p.x, p.y, p.z) === wanted);
    return matching.length / all.length;
  };

  // 1. **The claim.** Everything the copy calls intraperitoneal is in front of
  //    the line, and everything it calls retroperitoneal is behind it.
  //
  //    "Wholly" is 96% of the surface rather than all of it, and the missing
  //    few per cent are the model's own thickness: a vessel is a tube with a
  //    wall, and its path is a smoothed curve that overshoots slightly between
  //    the points it is written from, so a little of its far surface can sit
  //    across a line its centre never approaches. The straddling organs below
  //    are at 45–90%, so nothing here is near the threshold by accident.
  const WHOLLY = 0.96;
  for (const id of ['liver', 'stomach', 'spleen', 'small-bowel']) {
    assert.ok(share(id, false) >= WHOLLY, `the ${id} is in the bag`);
  }
  for (const id of ['kidneys', 'adrenal-glands', 'ureters', 'aorta', 'inferior-vena-cava']) {
    assert.ok(share(id, true) >= WHOLLY, `the ${id} is behind the bag`);
  }

  // 2. **The two that straddle it** are built to straddle it, not labelled to.
  for (const id of ['pancreas', 'duodenum']) {
    const behind = share(id, true);
    assert.ok(behind > 0.45, `most of the ${id} is behind the bag`);
    assert.ok(behind < 0.9, `and some of it is in the bag`);
  }

  // 3. The colon is the clearest case: two lengths fixed, two hanging.
  const lengths = abdomen.meshesFor('colon');
  assert.equal(lengths.length, 4, 'the colon is drawn in four lengths');
  const behindShare = lengths.map((mesh) => {
    const position = mesh.geometry.attributes.position;
    const v = new THREE.Vector3();
    let behind = 0;
    for (let i = 0; i < position.count; i += 1) {
      const p = mesh.localToWorld(v.fromBufferAttribute(position, i).clone()).divideScalar(ABDOMEN_SCALE);
      if (isRetroperitoneal(p.x, p.y, p.z)) behind += 1;
    }
    return behind / position.count;
  });
  assert.equal(
    behindShare.filter((f) => f > 0.9).length,
    2,
    'two of the four lengths are behind the bag'
  );
  assert.equal(
    behindShare.filter((f) => f < 0.1).length,
    2,
    'and two of them are in it'
  );

  // 4. The right kidney is lower than the left, because the liver is above it.
  assert.ok(
    kidneyAt(-ABDOMEN_LEFT)[1] < kidneyAt(ABDOMEN_LEFT)[1] - 0.5,
    'the right kidney sits lower than the left'
  );
  // And both lie on psoas rather than floating behind it.
  for (const side of [ABDOMEN_LEFT, -ABDOMEN_LEFT]) {
    const on = psoasAt(kidneyAt(side)[1], side);
    assert.ok(Math.abs(kidneyAt(side)[0]) > Math.abs(on[0]), 'the kidney is lateral to psoas');
    assert.ok(kidneyAt(side)[2] > on[2], 'and in front of it');
  }

  // 5. The cava is to the patient's right of the aorta — they are not both in
  //    the midline, and which is which decides every approach to the back wall.
  assert.ok(
    cavaAt(0)[0] * ABDOMEN_LEFT < 0 && aortaAt(0)[0] * ABDOMEN_LEFT > 0,
    'the cava is to the right of the midline and the aorta to the left'
  );

  // 6. Three ventral branches at three descending levels, all off the aorta.
  assert.ok(ABDOMEN_LEVELS.coeliac > ABDOMEN_LEVELS.sma, 'the coeliac trunk leaves above the superior mesenteric');
  assert.ok(ABDOMEN_LEVELS.sma > ABDOMEN_LEVELS.ima, 'and that above the inferior mesenteric');
  for (const [id, level] of [
    ['coeliac-trunk', ABDOMEN_LEVELS.coeliac],
    ['superior-mesenteric-vessels', ABDOMEN_LEVELS.sma],
    ['inferior-mesenteric-artery', ABDOMEN_LEVELS.ima],
  ]) {
    const root = new THREE.Vector3(...aortaAt(level)).multiplyScalar(ABDOMEN_SCALE);
    assert.ok(box(id).distanceToPoint(root) < 0.5, `the ${id} starts on the aorta`);
  }

  // 7. The superior mesenteric artery passes **in front of** the third part of
  //    the duodenum, which is the most-drawn relationship in the region.
  const atLevel = (id) =>
    points(id).reduce((best, p) =>
      Math.abs(p.y - ABDOMEN_LEVELS.duodenumThird) < Math.abs(best.y - ABDOMEN_LEVELS.duodenumThird)
        ? p
        : best
    );
  assert.ok(
    atLevel('superior-mesenteric-vessels').z > atLevel('duodenum').z,
    'the superior mesenteric artery crosses in front of the third part of the duodenum'
  );

  // 8. The bag's back wall and the retroperitoneum's front wall are one
  //    surface, which is what makes every claim above decidable.
  for (const y of [2, 0, -2, -4]) {
    const back = peritoneumBackAt(y);
    assert.ok(isRetroperitoneal(0, y, back - 0.1), 'just behind the line is behind the bag');
    assert.ok(!isRetroperitoneal(0, y, back + 0.1), 'and just in front of it is in the bag');
  }

  abdomen.dispose();
});

test('a chest is two bags, and everything else fits in the slab between them', () => {
  // The claims are all about where things are relative to each other, so that
  // is the whole of what there is to check — and three of them are the scene's
  // reason to exist: the ribs slope, the left lung's notch is the mediastinum,
  // and the two nerves pass the same root on opposite faces.
  const thorax = buildThorax();
  thorax.object.updateMatrixWorld(true);
  const box = (id) => {
    const bounds = new THREE.Box3();
    for (const mesh of thorax.meshesFor(id)) bounds.union(new THREE.Box3().setFromObject(mesh));
    return bounds;
  };
  const points = (id) => {
    const out = [];
    for (const mesh of thorax.meshesFor(id)) {
      const position = mesh.geometry.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < position.count; i += 1) {
        out.push(mesh.localToWorld(v.fromBufferAttribute(position, i).clone()).divideScalar(THORAX_SCALE));
      }
    }
    return out;
  };

  // 1. **Every rib ends lower than it starts.** A space counted at the front is
  //    not the space counted at the back, and that is a fact about all twelve.
  for (let i = 0; i < 12; i += 1) {
    for (const side of [THORAX_LEFT, -THORAX_LEFT]) {
      const start = ribPath(i, 0, side);
      const end = ribPath(i, 1, side);
      assert.ok(end[1] < start[1] - 0.4, `rib ${i + 1} ends lower at the front than it starts`);
      assert.ok(end[2] > start[2], 'and further forward');
      assert.ok(Math.abs(ribPath(i, 0.5, side)[0]) > Math.abs(start[0]), 'having gone round the side');
    }
  }
  // The lower cartilages turn up instead of reaching the sternum.
  const sternum = box('sternal-body').union(box('manubrium')).union(box('xiphoid-process'));
  assert.ok(box('costal-cartilages').intersectsBox(sternum), 'the upper cartilages reach the sternum');

  // 2. The bundle is under the rib it belongs to, which is why a needle is
  //    aimed at the top of a space.
  for (let i = 0; i < 6; i += 1) {
    for (const side of [THORAX_LEFT, -THORAX_LEFT]) {
      const onRib = ribPath(i, 0.5, side);
      const below = ribPath(i, 0.5, side);
      below[1] -= 0.42;
      assert.ok(below[1] < onRib[1], 'the bundle runs below its rib');
      assert.ok(below[1] > ribPath(i + 1, 0.5, side)[1], 'and above the next rib down');
    }
  }

  // 3. **The left lung's notch is the mediastinum.** No part of either lung is
  //    inside the slab, and the slab takes more from the left than the right.
  for (const id of ['left-lung', 'right-lung']) {
    for (const point of points(id)) {
      const at = mediastinumSection(point.y);
      if (point.z > at.front || point.z < at.back) continue;
      assert.ok(
        Math.abs(point.x - at.centreX) > at.halfWidth - 1e-3,
        `no part of the ${id} lies inside the mediastinum`
      );
    }
  }
  const slab = mediastinumSection(THORAX_LEVELS.heartCentre);
  assert.ok(slab.centreX * THORAX_LEFT > 0, 'the slab sits to the patient’s left of the midline');
  // **The bite is bigger on the left**, and that is the whole of why the two
  // lungs differ in shape. Measured where the slab is widest, against the part
  // of each lung that is at the slab's own depth — in front of it and behind it
  // a lung legitimately reaches the midline and the right one crosses it.
  const medialEdge = (id) => {
    const near = points(id).filter(
      (p) =>
        Math.abs(p.y - THORAX_LEVELS.heartCentre) < 1.2 && p.z < slab.front && p.z > slab.back
    );
    assert.ok(near.length > 0, `${id} has something at the heart's own level and depth`);
    return Math.min(...near.map((p) => Math.abs(p.x)));
  };
  assert.ok(
    medialEdge('left-lung') > medialEdge('right-lung') + 1.5,
    'the left lung is held further from the midline than the right — its notch'
  );

  // 4. Each lung's base stops above the floor of its own cavity.
  for (const id of ['left-lung', 'right-lung']) {
    const lung = box(id);
    assert.ok(
      lung.min.y / THORAX_SCALE > THORAX_LEVELS.recessFloor + 0.8,
      `the ${id} stops above the bottom of the cavity`
    );
  }
  assert.ok(
    box('costodiaphragmatic-recess').min.y < box('left-lung').min.y,
    'and the recess goes below where the lung stops'
  );

  // 5. The two sides of the airway differ, and it is one table that says so.
  assert.ok(AIRWAY.right.radius > AIRWAY.left.radius, 'the right main bronchus is the wider');
  assert.ok(AIRWAY.right.run < AIRWAY.left.run, 'and the shorter');
  assert.ok(AIRWAY.right.spread < AIRWAY.left.spread, 'and the more upright');

  // 6. **The scene's subject.** At each hilum the phrenic passes in front and
  //    the vagus behind.
  for (const side of [THORAX_LEFT, -THORAX_LEFT]) {
    const hilum = bronchusPath(side, 1);
    const nearest = (id) =>
      points(id)
        .filter((p) => p.x * side > 0)
        .reduce((best, p) => (Math.abs(p.y - hilum[1]) < Math.abs(best.y - hilum[1]) ? p : best));
    const phrenic = nearest('phrenic-nerve');
    const vagus = nearest('vagus-nerve');
    assert.ok(phrenic.z > hilum[2], 'the phrenic nerve passes in front of the root of the lung');
    assert.ok(vagus.z < hilum[2], 'and the vagus behind it');
  }

  // 7. The gullet is behind everything, all the way down.
  for (const y of [THORAX_LEVELS.carina, THORAX_LEVELS.hilum, THORAX_LEVELS.heartCentre]) {
    const at = (id) =>
      points(id).reduce((best, p) => (Math.abs(p.y - y) < Math.abs(best.y - y) ? p : best));
    assert.ok(at('oesophagus').z < at('trachea-and-bronchi').z + 2, 'the gullet is behind the airway');
  }
  assert.ok(box('oesophagus').max.z < box('heart').min.z + 1e-6, 'and behind the heart');

  thorax.dispose();
});

test('an elbow is one axis with a hinge on one end of it and a pivot on the other', () => {
  // Everything this scene claims is a claim about one line. What is checked is
  // that the line is really what the parts are built from: that the notch grips
  // the spool the spool actually is, that the ball is on the same line as the
  // spool, and that **both collateral ligaments start on the line** — which is
  // the reason the model gives for neither of them going slack.
  const elbow = buildElbowJoint();
  elbow.object.updateMatrixWorld(true);
  const box = (id) => {
    const bounds = new THREE.Box3();
    for (const mesh of elbow.meshesFor(id)) bounds.union(new THREE.Box3().setFromObject(mesh));
    return bounds;
  };
  const points = (id) => {
    const out = [];
    for (const mesh of elbow.meshesFor(id)) {
      const position = mesh.geometry.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < position.count; i += 1) {
        out.push(mesh.localToWorld(v.fromBufferAttribute(position, i).clone()));
      }
    }
    return out;
  };
  /** How far a point is from the hinge axis, which runs along x. */
  const fromAxis = (point) => Math.hypot(point.y - ELBOW_HINGE.y, point.z - ELBOW_HINGE.z);

  // 1. The trochlea is a spool: a waist between two flanges, not a cylinder.
  const groove = trochleaRadiusAt(
    (ELBOW_HINGE.trochlea.medialX + ELBOW_HINGE.trochlea.lateralX) / 2
  );
  assert.ok(
    groove < trochleaRadiusAt(ELBOW_HINGE.trochlea.medialX) - 0.08,
    'the trochlea is waisted against its medial flange'
  );
  assert.ok(
    groove < trochleaRadiusAt(ELBOW_HINGE.trochlea.lateralX) - 0.08,
    'and against its lateral one'
  );
  assert.ok(
    trochleaRadiusAt(ELBOW_HINGE.trochlea.medialX) >
      trochleaRadiusAt(ELBOW_HINGE.trochlea.lateralX),
    'the medial flange is the deeper of the two, which is what stops the ulna sliding off'
  );

  // 2. The ball is lateral to the spool, and on the same line.
  const capitellum = box('capitellum').getCenter(new THREE.Vector3());
  assert.ok(
    capitellum.x * ELBOW_MEDIAL < ELBOW_HINGE.trochlea.lateralX * ELBOW_MEDIAL,
    'the capitellum is lateral to the trochlea'
  );
  assert.ok(fromAxis(capitellum) < 0.06, 'and centred on the same axis');

  // 3. The ulna grips the spool: nothing inside it, and something touching it.
  let nearest = Infinity;
  for (const point of points('olecranon')) {
    const within =
      point.x > Math.min(ELBOW_HINGE.trochlea.lateralX, ELBOW_HINGE.trochlea.medialX) &&
      point.x < Math.max(ELBOW_HINGE.trochlea.lateralX, ELBOW_HINGE.trochlea.medialX);
    if (!within) continue;
    const gap = fromAxis(point) - trochleaRadiusAt(point.x);
    assert.ok(gap > -1e-6, 'no part of the ulna lies inside the trochlea');
    nearest = Math.min(nearest, gap);
  }
  assert.ok(nearest < 0.12, 'and the notch is pressed onto it rather than floating off it');

  // The C wraps past half a circle, which is why the ulna stays on without a
  // ligament: measured as the angular spread of the points that touch.
  const angles = points('olecranon')
    .filter((point) => fromAxis(point) - trochleaRadiusAt(point.x) < 0.2)
    .map((point) => Math.atan2(point.y - ELBOW_HINGE.y, point.z - ELBOW_HINGE.z));
  assert.ok(angles.length > 0, 'some of the ulna touches the spool');
  assert.ok(
    Math.max(...angles) - Math.min(...angles) > Math.PI,
    'and it wraps past half a circle'
  );

  // 4. **Both collateral ligaments start on the axis.** This is the claim.
  for (const side of [ELBOW_MEDIAL, -ELBOW_MEDIAL]) {
    const origin = new THREE.Vector3(...collateralOrigin(side));
    assert.ok(fromAxis(origin) < 0.2, 'a collateral ligament starts on the joint axis');
    assert.ok(origin.x * side > 0, 'on its own side of the joint');
  }
  const medialBand = box('ulnar-collateral-ligament');
  const lateralBand = box('radial-collateral-ligament');
  assert.ok(
    medialBand.containsPoint(new THREE.Vector3(...collateralOrigin(ELBOW_MEDIAL))),
    'the drawn ulnar collateral ligament reaches that origin'
  );
  assert.ok(
    lateralBand.containsPoint(new THREE.Vector3(...collateralOrigin(-ELBOW_MEDIAL))),
    'and so does the radial one'
  );

  // 5. The ring holds the radial head against the ulna and grips neither.
  const ring = box('annular-ligament');
  const ulna = box('ulna-shaft').union(box('olecranon'));
  assert.ok(ring.intersectsBox(ulna), 'the annular ligament reaches the ulna');
  assert.ok(
    ring.max.x * ELBOW_MEDIAL > box('radial-head').max.x * ELBOW_MEDIAL,
    'and reaches past the radial head towards it'
  );
  assert.ok(
    lateralBand.intersectsBox(ring),
    'the radial collateral ligament ends on the ring and not on the radius'
  );
  assert.ok(
    !lateralBand.intersectsBox(box('radius-shaft')),
    'so it never reaches the radius'
  );

  // 6. The ulnar nerve passes behind the medial epicondyle.
  const epicondyle = box('medial-epicondyle');
  const behind = points('ulnar-nerve').filter(
    (point) => point.y > epicondyle.min.y && point.y < epicondyle.max.y
  );
  assert.ok(behind.length > 0, 'the nerve passes the epicondyle');
  assert.ok(
    Math.max(...behind.map((point) => point.z)) < epicondyle.min.z,
    'and it passes behind it, not in front'
  );

  // 7. In the hollow at the front: tendon, artery, nerve, from the thumb inwards.
  const at = (id, y) => {
    const near = points(id).reduce((best, point) =>
      Math.abs(point.y - y) < Math.abs(best.y - y) ? point : best
    );
    return near;
  };
  const tendon = at('biceps-tendon', 0.4);
  const artery = at('brachial-artery', 0.4);
  const median = at('median-nerve', 0.4);
  assert.ok(
    tendon.x * ELBOW_MEDIAL < artery.x * ELBOW_MEDIAL,
    'the biceps tendon is the most lateral of the three'
  );
  assert.ok(
    artery.x * ELBOW_MEDIAL < median.x * ELBOW_MEDIAL,
    'and the median nerve the most medial'
  );

  elbow.dispose();
});

test('a neck is a stack in the middle, a bundle each side, and two nerves that differ', () => {
  // Every claim this scene makes is about what is next to what, so that is the
  // whole of what there is to check — and the one it exists for is an
  // asymmetry: the two recurrent laryngeal nerves end in the same place and do
  // not get there the same way.
  const neck = buildNeck();
  neck.object.updateMatrixWorld(true);
  const box = (id) => {
    const bounds = new THREE.Box3();
    for (const mesh of neck.meshesFor(id)) bounds.union(new THREE.Box3().setFromObject(mesh));
    return bounds;
  };
  const sideBox = (id, side) => {
    const meshes = neck.meshesFor(id);
    assert.equal(meshes.length, 2, `${id} is a pair`);
    const wanted = meshes.find((mesh) => mesh.name.endsWith(side === NECK_LEFT ? 'left' : 'right'));
    return new THREE.Box3().setFromObject(wanted);
  };
  const points = (id, side) => {
    const meshes = side === undefined ? neck.meshesFor(id) : [
      neck.meshesFor(id).find((mesh) => mesh.name.endsWith(side === NECK_LEFT ? 'left' : 'right')),
    ];
    const out = [];
    for (const mesh of meshes) {
      const position = mesh.geometry.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < position.count; i += 1) {
        out.push(mesh.localToWorld(v.fromBufferAttribute(position, i).clone()));
      }
    }
    return out;
  };

  // 1. The gullet is behind the airway, and leans to the patient's left.
  for (const y of [NECK_LEVELS.cricoid - 1, NECK_LEVELS.isthmus, NECK_LEVELS.sternalNotch]) {
    assert.ok(oesophagusAt(y).z < airwayAt(y).z, `the gullet is behind the airway at ${y}`);
  }
  assert.ok(
    oesophagusAt(NECK_LEVELS.sternalNotch).x * NECK_LEFT >
      oesophagusAt(NECK_LEVELS.cricoid).x * NECK_LEFT,
    'and further to the patient’s left the lower it goes'
  );

  // 2. Each thyroid lobe touches the air column and no part of it is inside.
  for (const side of [NECK_LEFT, -NECK_LEFT]) {
    let nearest = Infinity;
    for (const point of points('thyroid-lobe', side)) {
      const at = airwayAt(point.y / NECK_SCALE);
      const gap =
        Math.hypot(point.x / NECK_SCALE, point.z / NECK_SCALE - at.z) - at.radius;
      assert.ok(gap > -1e-6, 'no part of a lobe is inside the airway');
      nearest = Math.min(nearest, gap);
    }
    assert.ok(nearest < 0.12, 'and the lobe is pressed against it rather than floating off it');
  }
  // The isthmus joins the two lobes rather than reaching past them.
  const isthmus = box('thyroid-isthmus');
  assert.ok(
    isthmus.max.x < sideBox('thyroid-lobe', NECK_LEFT).max.x &&
      isthmus.min.x > sideBox('thyroid-lobe', -NECK_LEFT).min.x,
    'the isthmus stops inside both lobes'
  );
  assert.ok(
    isthmus.intersectsBox(sideBox('thyroid-lobe', NECK_LEFT)) &&
      isthmus.intersectsBox(sideBox('thyroid-lobe', -NECK_LEFT)),
    'and reaches both of them'
  );

  // 3. Inside the sheath: artery medial, vein lateral and larger, vagus behind.
  for (const side of [NECK_LEFT, -NECK_LEFT]) {
    const y = NECK_LEVELS.cricoid;
    const artery = sheathContentAt(y, side, 'artery');
    const vein = sheathContentAt(y, side, 'vein');
    const vagus = sheathContentAt(y, side, 'nerve');
    assert.ok(Math.abs(artery[0]) < Math.abs(vein[0]), 'the artery is medial to the vein');
    assert.ok(
      NECK_SHEATH.contents.vein.radius > NECK_SHEATH.contents.artery.radius,
      'the vein is the larger of the two'
    );
    assert.ok(vagus[2] < artery[2] && vagus[2] < vein[2], 'and the vagus is behind both');
    // All three are inside the sheath they are named as being in.
    const centre = sheathAt(y, side);
    for (const [name, point, radius] of [
      ['artery', artery, NECK_SHEATH.contents.artery.radius],
      ['vein', vein, NECK_SHEATH.contents.vein.radius],
      ['vagus', vagus, NECK_SHEATH.contents.nerve.radius],
    ]) {
      const across = Math.abs(point[0] - centre[0]) + radius;
      const deep = Math.abs(point[2] - centre[2]) + radius;
      assert.ok(across <= NECK_SHEATH.radius, `the ${name} fits across the sheath`);
      assert.ok(
        deep <= NECK_SHEATH.radius * NECK_SHEATH.depthFactor,
        `and the ${name} fits through its depth`
      );
    }
  }

  // 4. Above the division the external carotid runs in front of the internal.
  for (const side of [NECK_LEFT, -NECK_LEFT]) {
    const internal = sideBox('internal-carotid-artery', side);
    const external = sideBox('external-carotid-artery', side);
    assert.ok(external.max.z > internal.max.z, 'the external carotid is the anterior one');
    assert.ok(
      Math.abs(external.getCenter(new THREE.Vector3()).x) <
        Math.abs(internal.getCenter(new THREE.Vector3()).x),
      'and the medial one'
    );
    assert.ok(
      internal.intersectsBox(sideBox('common-carotid-artery', side)) &&
        external.intersectsBox(sideBox('common-carotid-artery', side)),
      'both start on the artery they divide from'
    );
  }

  // 5. **The scene's subject.** Both recurrent nerves end in the groove between
  // the airway and the gullet at the cricoid; the left turns far lower.
  for (const side of [NECK_LEFT, -NECK_LEFT]) {
    const nerve = points('recurrent-laryngeal-nerve', side);
    const top = nerve.reduce((best, point) => (point.y > best.y ? point : best), nerve[0]);
    const groove = new THREE.Vector3(...grooveAt(top.y / NECK_SCALE, side)).multiplyScalar(NECK_SCALE);
    assert.ok(
      top.distanceTo(groove) < 0.4,
      'the nerve ends in the tracheo-oesophageal groove on its own side'
    );
    assert.ok(
      Math.abs(top.y / NECK_SCALE - NECK_LEVELS.cricoid) < 1,
      'at about the level of the cricoid'
    );
  }
  const lowest = (id, side) =>
    points(id, side).reduce((best, point) => Math.min(best, point.y), Infinity);
  assert.ok(
    lowest('recurrent-laryngeal-nerve', NECK_LEFT) <
      lowest('recurrent-laryngeal-nerve', -NECK_LEFT) - 1,
    'the left nerve turns well below the right — which is the whole point'
  );
  // And each turns below the vessel it is said to turn round.
  assert.ok(
    lowest('recurrent-laryngeal-nerve', -NECK_LEFT) <
      sideBox('subclavian-artery', -NECK_LEFT).getCenter(new THREE.Vector3()).y,
    'the right nerve passes under the subclavian artery'
  );
  assert.ok(
    lowest('recurrent-laryngeal-nerve', NECK_LEFT) <
      box('aortic-arch').getCenter(new THREE.Vector3()).y,
    'the left nerve passes under the arch'
  );

  // 6. The parathyroids are behind the gland, not in front of it.
  const beads = points('parathyroid-gland');
  for (const bead of beads) {
    const at = airwayAt(bead.y / NECK_SCALE);
    assert.ok(bead.z / NECK_SCALE < at.z, 'a parathyroid lies behind the air column');
  }
  const beadLeft = beads.filter((bead) => bead.x * NECK_LEFT > 0);
  assert.ok(beadLeft.length > 0 && beadLeft.length < beads.length, 'two on each side');
  assert.ok(
    Math.max(...beads.map((bead) => bead.z)) <
      sideBox('thyroid-lobe', NECK_LEFT).getCenter(new THREE.Vector3()).z,
    'and behind the middle of the lobe it sits on'
  );

  // 7. The display enlargements are declared, and they are enlargements.
  assert.ok(NECK_DISPLAY.recurrentRadius > 0, 'the nerve is drawn at a declared radius');
  assert.ok(
    NECK_DISPLAY.vagusRadius > NECK_DISPLAY.recurrentRadius,
    'the vagus is drawn thicker than the nerve that branches from it'
  );

  neck.dispose();
});

test('the skeleton is a column with two girdles joined to it in different ways', () => {
  // This scene claims an arrangement and nothing about the shape of any bone,
  // so the arrangement is all there is to check — and the most important part
  // of it is an **absence**: the scapula touching nothing.
  const skeleton = buildSkeleton();
  skeleton.object.updateMatrixWorld(true);
  const box = (id) => {
    const bounds = new THREE.Box3();
    for (const mesh of skeleton.meshesFor(id)) bounds.union(new THREE.Box3().setFromObject(mesh));
    return bounds;
  };

  // One column, top to bottom, meeting end to end.
  const column = ['skull', 'cervical-spine', 'thoracic-spine', 'lumbar-spine', 'sacrum-and-coccyx'];
  for (let i = 1; i < column.length; i += 1) {
    const above = box(column[i - 1]);
    const below = box(column[i]);
    assert.ok(below.max.y <= above.max.y, `${column[i]} is below ${column[i - 1]}`);
    assert.ok(below.max.y >= above.min.y - 0.5, `and reaches it rather than floating under it`);
  }

  // An arm is attached at one small joint, and the bone behind it at none.
  const clavicle = box('clavicle');
  // Through `anchorPoints`, which are in world units; `STERNOCLAVICULAR` is in
  // the centimetre table the figure is laid out from, before it is scaled.
  assert.ok(
    clavicle.distanceToPoint(skeleton.anchorPoints.sternoclavicular) < 0.4,
    'the clavicle starts at the sternoclavicular joint'
  );
  assert.ok(clavicle.intersectsBox(box('sternum')), 'and reaches it');
  // The scapula lies *against* the back of the ribs, which is contact and not a
  // joint — and a bounding box cannot tell those apart. So what is checked is
  // the thing a box can see: **nothing of the arm but the clavicle reaches the
  // column or the sternum**, which is the same claim from the other side.
  // Measured one mesh at a time: the union of a left and a right bone spans the
  // midline even when neither of them comes near it.
  for (const id of ['scapula', 'humerus', 'radius-and-ulna', 'hand-bones']) {
    for (const mesh of skeleton.meshesFor(id)) {
      const bone = new THREE.Box3().setFromObject(mesh);
      for (const axial of ['sternum', 'cervical-spine', 'thoracic-spine', 'lumbar-spine', 'skull']) {
        assert.ok(!bone.intersectsBox(box(axial)), `the ${id} does not reach the ${axial}`);
      }
    }
  }

  // A leg is attached by being locked into the column itself.
  const sacrum = box('sacrum-and-coccyx');
  for (const mesh of skeleton.meshesFor('pelvis')) {
    const hip = new THREE.Box3().setFromObject(mesh);
    assert.ok(hip.intersectsBox(sacrum), 'each hip bone reaches the sacrum');
  }
  assert.ok(sacrum.intersectsBox(box('lumbar-spine')), 'and the sacrum is continuous with the column');

  // A cage that is open below.
  const ribs = skeleton.meshesFor('ribs');
  assert.equal(ribs.length, 24, 'twelve pairs of ribs');
  const spine = box('thoracic-spine');
  const sternum = box('sternum');
  const boxes = ribs.map((mesh) => new THREE.Box3().setFromObject(mesh));
  for (const rib of boxes) assert.ok(rib.intersectsBox(spine), 'every rib starts at the column');
  const highest = boxes.reduce((best, rib) => (rib.max.y > best.max.y ? rib : best), boxes[0]);
  const lowest = boxes.reduce((best, rib) => (rib.min.y < best.min.y ? rib : best), boxes[0]);
  assert.ok(highest.max.z > sternum.min.z, 'the upper ribs reach the sternum');
  assert.ok(lowest.max.z < sternum.min.z, 'and the lower ones stop short of it');

  // Every joint of a limb is below the one above it, which is what `LEVELS` is
  // for: a figure cannot end up with an elbow above its shoulder.
  assert.ok(BODY_LEVELS.elbow < BODY_LEVELS.shoulder, 'the elbow is below the shoulder');
  assert.ok(BODY_LEVELS.wrist < BODY_LEVELS.elbow, 'the wrist below the elbow');
  assert.ok(BODY_LEVELS.knee < BODY_LEVELS.hip, 'the knee below the hip');
  assert.ok(BODY_LEVELS.ankle < BODY_LEVELS.knee, 'the ankle below the knee');
  assert.ok(box('humerus').min.y > box('radius-and-ulna').min.y, 'and the drawn bones follow it');
  assert.ok(box('femur').min.y > box('tibia-and-fibula').min.y, 'on both limbs');
  // Standing on the ground it is drawn on.
  const all = new THREE.Box3().setFromObject(skeleton.object);
  assert.ok(all.min.y >= 0, 'the whole figure is above the ground');
});
