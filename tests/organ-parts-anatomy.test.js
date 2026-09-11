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
