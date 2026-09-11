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
import { ADRENAL_LAYERS, ADRENAL_SITES, buildAdrenalParts } from '../src/scenes/endocrine/organs/adrenalAnatomy.js';

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
    const boxes = ADRENAL_LAYERS.map((layer) => box(`${side}-${layer.id}`));
    for (let i = 1; i < boxes.length; i += 1) {
      assert.ok(
        boxes[i - 1].containsBox(boxes[i]),
        `${side}: ${ADRENAL_LAYERS[i - 1].id} encloses ${ADRENAL_LAYERS[i].id}`
      );
    }
    // The one that is not cortex is inside all three that are.
    const medulla = box(`${side}-adrenal-medulla`);
    for (const zone of ADRENAL_LAYERS.slice(0, 3)) {
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

  // Not mirrored: the left is scooped underneath where it lies along the
  // kidney's medial border, so it is the shallower of the two.
  const right = box('right-zona-glomerulosa').getSize(new THREE.Vector3());
  const left = box('left-zona-glomerulosa').getSize(new THREE.Vector3());
  assert.ok(left.y < right.y, `the left gland is the flatter of the two (${left.y.toFixed(2)} vs ${right.y.toFixed(2)})`);
});
