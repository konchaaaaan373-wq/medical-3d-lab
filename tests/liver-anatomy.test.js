import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import * as THREE from 'three';

import { anatomicalSide } from '../src/scenes/cardiovascular/scenes/heartFailure/anatomy.js';
import { LIVER_SCALE, buildLiver, liverWarp } from '../src/scenes/hepatobiliary/organs/liver.js';
import {
  HEPATIC_VEINS,
  PLANES,
  SECTORS,
  SEGMENTS,
  SEGMENT_IV_SPLIT,
  SEGMENT_VOLUME_SHARES,
  anatomicalFrame,
  segmentsOfLiver,
  segmentsOfSector,
  veinOrigin,
} from '../src/scenes/hepatobiliary/organs/liverAnatomy.js';
import { partitionQuality, wholeVolume } from './partition.js';
import {
  carveInside,
  planeThrough,
  radialField,
  starShaped,
  surfaceSamples,
} from '../src/scenes/shared/geometry/carve.js';

/**
 * The liver, checked as anatomy.
 *
 * Couinaud's division is not a diagram: it is what makes a segment removable,
 * and every claim below is a fact about that. The volume shares are the one
 * fitted number, and they are checked against a named reference specimen
 * rather than against whatever the builder happens to produce — which is the
 * only way a calibration can fail.
 */

function volumeOf(geometry) {
  const position = geometry.attributes.position;
  const index = geometry.index;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let volume = 0;
  const count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) {
    const i0 = index ? index.getX(i) : i;
    const i1 = index ? index.getX(i + 1) : i + 1;
    const i2 = index ? index.getX(i + 2) : i + 2;
    a.fromBufferAttribute(position, i0);
    b.fromBufferAttribute(position, i1);
    c.fromBufferAttribute(position, i2);
    volume += a.dot(b.clone().cross(c)) / 6;
  }
  return Math.abs(volume);
}

// Vessels are opt-in on the builder, because the three scenes that draw this
// liver draw portal vessels of their own — solved ones, in two of them.
// Everything about the vessels is asked of a liver that asked for them.
const liver = buildLiver({ detail: 8, vessels: true });

/** The mesh resolution the partition claims are measured at. */
const PARTITION_DETAIL = 8;
const segmentVolume = new Map(liver.segments.map((segment) => [segment.id, volumeOf(segment.geometry)]));
const totalVolume = [...segmentVolume.values()].reduce((sum, value) => sum + value, 0);
const sectorShare = (id) =>
  SECTORS.find((sector) => sector.id === id).segments.reduce((sum, seg) => sum + segmentVolume.get(seg), 0) /
  totalVolume;

const centreOf = (id) => {
  const segment = liver.segmentById(id);
  segment.geometry.computeBoundingBox();
  return segment.geometry.boundingBox.getCenter(new THREE.Vector3());
};

const vesselNamed = (name) => liver.hepaticVeins.object.getObjectByName(name) ?? liver.portal.object.getObjectByName(name);

/* --------------------------------------------------------------------------
   The division
   -------------------------------------------------------------------------- */

test('there are eight Couinaud segments, and each is a solid of its own', () => {
  // The numbering runs I to VIII, with IV carried as its superior and inferior
  // halves the way a surgeon refers to them.
  const numbers = new Set(SEGMENTS.map((segment) => segment.number.replace(/[ab]$/, '')));
  assert.deepEqual([...numbers].sort(), ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'].sort());
  assert.equal(liver.segments.length, 9, 'nine parts, because IV is carried in two halves');
  for (const segment of liver.segments) {
    assert.ok(segment.mesh.isMesh, `${segment.id} is a mesh of its own`);
    assert.ok(volumeOf(segment.geometry) > 0, `${segment.id} encloses a volume`);
    assert.ok(segment.label && segment.labelJa, `${segment.id} is named in both languages`);
  }
});

/**
 * How far a measured share may sit from its reference value, in percentage
 * points of the whole liver.
 *
 * Wider than the lung's, and deliberately so. Mise's own headline finding is
 * how much these vary: segment VIII ran from 11.1% to 38.0% of the liver across
 * 107 normal livers. A band tight enough to pin the geometry to the median
 * would be asserting that the median is the anatomy, which is the mistake the
 * paper exists to correct. These are wide enough to say "this is a liver of
 * ordinary proportions" and no more.
 *
 * The sectors are held tighter than their segments because a sector is what a
 * resection is planned in, and because the segment bands are wide enough that
 * two of them drifting the same way could move a sector out of any useful
 * range while both stayed legal.
 */
const SEGMENT_TOLERANCE_PP = { I: 3, II: 4, III: 4, IV: 5, V: 5, VI: 4, VII: 6, VIII: 6 };
const SECTOR_TOLERANCE_PP = { caudate: 3, 'left-lateral': 5, 'left-medial': 5, 'right-anterior': 5, 'right-posterior': 5 };

test('each sector takes the share of the liver the reference specimen gives it', () => {
  for (const sector of SECTORS) {
    const measured = sectorShare(sector.id);
    const tolerance = SECTOR_TOLERANCE_PP[sector.id] / 100;
    assert.ok(
      Math.abs(measured - sector.share) <= tolerance,
      `${sector.id} took ${(measured * 100).toFixed(2)}%, against ` +
        `${(sector.share * 100).toFixed(0)}% ± ${SECTOR_TOLERANCE_PP[sector.id]}`
    );
  }

  // The right anterior sector is the larger of the two right sectors, and by a
  // margin rather than a rounding. This is the relation the previous
  // calibration got wrong: it produced 32.8% and 32.4%, a gap of 0.4 points,
  // which is a coin toss dressed as anatomy. Mise puts VIII alone above either
  // of VI and VII, and the anterior sector carries VIII.
  const gap = sectorShare('right-anterior') - sectorShare('right-posterior');
  assert.ok(
    gap >= 0.08,
    `the right anterior sector leads the posterior by ${(gap * 100).toFixed(1)} points, which is not a lead`
  );

  const right = sectorShare('right-anterior') + sectorShare('right-posterior');
  const left = sectorShare('left-lateral') + sectorShare('left-medial');
  assert.ok(right > left * 1.5, `the right liver is much the larger: ${(right * 100).toFixed(0)}% vs ${(left * 100).toFixed(0)}%`);
  assert.ok(sectorShare('caudate') < 0.08, 'and the caudate is a small part of it');
});

test('each segment takes the share of the liver the reference specimen gives it', () => {
  // Segment IV is measured as one, because that is how the source reports it.
  // IVa and IVb are checked separately below, against the split this repository
  // chose rather than against a number anybody published.
  const measured = new Map(SEGMENTS.map((segment) => [segment.id, segmentVolume.get(segment.id) / totalVolume]));
  const fourth = measured.get('IVa') + measured.get('IVb');
  const asReported = new Map([...measured].filter(([id]) => id !== 'IVa' && id !== 'IVb'));
  asReported.set('IV', fourth);

  for (const [id, share] of asReported) {
    const target = SEGMENT_VOLUME_SHARES[id];
    const tolerance = SEGMENT_TOLERANCE_PP[id] / 100;
    assert.ok(
      Math.abs(share - target) <= tolerance,
      `segment ${id} took ${(share * 100).toFixed(2)}%, against ${(target * 100).toFixed(0)}% ± ${SEGMENT_TOLERANCE_PP[id]}`
    );
  }

  // Segment VIII is the largest, which is the one ordering Mise states in the
  // abstract and the one this geometry previously had backwards: VIII came out
  // at 18.9% behind VII at 18.7% and level with VI at 13.7%, when it should
  // lead every other segment outright.
  const largest = [...asReported.entries()].sort((a, b) => b[1] - a[1])[0][0];
  assert.equal(largest, 'VIII', 'segment VIII is the largest segment of the liver');
});

test('segment IV is halved by choice, and says so rather than citing anyone', () => {
  // The one share here with no source behind it. Held to the split that was
  // chosen, so that a future edit toward some published ratio has to change
  // this constant and its note together — and held loosely, because the halving
  // is an admission of ignorance and a tight band would dress it as knowledge.
  assert.equal(SEGMENT_IV_SPLIT.IVa + SEGMENT_IV_SPLIT.IVb, 1);
  const superior = segmentVolume.get('IVa') / (segmentVolume.get('IVa') + segmentVolume.get('IVb'));
  assert.ok(
    Math.abs(superior - 0.5) < 0.15,
    `IVa took ${(superior * 100).toFixed(1)}% of segment IV, which is no longer "about half"`
  );

  // And the claim is not made anywhere in prose either.
  const anatomy = readFileSync(new URL('../src/scenes/hepatobiliary/organs/liverAnatomy.js', import.meta.url), 'utf8');
  assert.match(anatomy, /Not from Mise/, 'the IVa\/IVb split says where it does not come from');
});

test('the segments partition the liver: they fill it, and they do not overlap', () => {
  // Nine parts against the solid they were cut from. The caudate is the reason
  // this matters here: it is taken as a slab rather than the box it should be
  // precisely because bounding it sideways left wedges behind segments II and
  // VII that belonged to no segment at all, and nothing about the picture said
  // so.
  const built = buildLiver({ detail: PARTITION_DETAIL });
  const bounds = new THREE.Box3();
  for (const segment of built.segments) {
    segment.geometry.computeBoundingBox();
    bounds.union(segment.geometry.boundingBox);
  }
  bounds.expandByScalar(0.02);

  const quality = partitionQuality({
    bounds,
    contains: (point) => built.contains(point),
    parts: built.segments,
    samples: 50000,
    seed: 23,
  });
  assert.equal(quality.samples, 50000, 'the sample has to land in the liver 50000 times');
  assert.ok(
    quality.unassignedRate <= 0.001,
    `${quality.unassigned} of ${quality.samples} points belong to no segment — ${quality.worst}`
  );
  assert.ok(
    quality.multipleRate <= 0.001,
    `${quality.multiple} of ${quality.samples} points belong to more than one segment — ${quality.worst}`
  );

  const whole = wholeVolume({ field: built.segments[0].field, detail: PARTITION_DETAIL, volumeOf });
  const sum = built.segments.reduce((total, segment) => total + volumeOf(segment.geometry), 0);
  assert.ok(
    Math.abs(sum / whole - 1) <= 0.01,
    `the segments sum to ${(100 * (sum / whole)).toFixed(2)}% of the liver they were cut from`
  );
  built.dispose();
});

test('every segment is a closed solid with a real volume', () => {
  for (const segment of SEGMENTS) {
    const volume = segmentVolume.get(segment.id);
    assert.ok(Number.isFinite(volume) && volume > 0, `${segment.id} encloses a finite positive volume`);
  }
});

test("Cantlie's line is the right/left division, and it is not the falciform ligament", () => {
  // The commonest mistake about liver anatomy. The plane of the middle hepatic
  // vein divides right liver from left; the falciform ligament is well to the
  // left of it and divides segment IV from II and III.
  const cantlieAt = PLANES.cantlie.through[0];
  const falciformAt = PLANES.falciform.through[0];
  assert.ok(falciformAt > cantlieAt, 'the falciform ligament lies to the left of Cantlie’s line');
  assert.ok(falciformAt - cantlieAt > 0.15, 'and by a real distance, not a rounding');

  // Segment IV is between the two: right of the falciform, left of Cantlie.
  const four = centreOf('IVb');
  assert.ok(four.x < centreOf('III').x, 'segment IV is medial to segment III');
  assert.ok(four.x > centreOf('V').x, 'and lateral to segment V, which is right liver');

  // Cantlie's line is oblique, not vertical: it runs from the gallbladder
  // fossa in front to the cava behind.
  assert.notEqual(PLANES.cantlie.normal[2], 0, 'the plane is tipped front to back');
});

test('the segments sit on the sides and levels their names describe', () => {
  // Right liver on the patient's right, left liver on the left.
  for (const segment of segmentsOfLiver('right')) {
    assert.equal(anatomicalSide(centreOf(segment.id)), 'right', `${segment.id} is right liver`);
  }
  for (const segment of segmentsOfLiver('left')) {
    assert.equal(anatomicalSide(centreOf(segment.id)), 'left', `${segment.id} is left liver`);
  }

  // Superior segments above their inferior partners, in every sector that has
  // a pair. This is what the portal plane is for.
  for (const [superior, inferior] of [
    ['II', 'III'],
    ['IVa', 'IVb'],
    ['VIII', 'V'],
    ['VII', 'VI'],
  ]) {
    assert.ok(
      centreOf(superior).y > centreOf(inferior).y,
      `${superior} should sit above ${inferior}`
    );
  }

  // And the posterior sector is behind the anterior one.
  assert.ok(centreOf('VII').z < centreOf('VIII').z, 'VII is posterior to VIII');
  assert.ok(centreOf('VI').z < centreOf('V').z, 'and VI is posterior to V');
});

test('the caudate lobe belongs to neither the right liver nor the left', () => {
  // It takes blood from both sides and drains straight into the cava, which is
  // why it survives — and hypertrophies — when the hepatic veins occlude.
  const caudate = SEGMENTS.find((segment) => segment.id === 'I');
  assert.equal(caudate.sector, 'caudate');
  assert.equal(SECTORS.find((sector) => sector.id === 'caudate').liver, 'independent');
  assert.ok(!segmentsOfLiver('right').includes(caudate));
  assert.ok(!segmentsOfLiver('left').includes(caudate));

  // It is the most posterior part of the liver.
  const behind = centreOf('I').z;
  for (const segment of liver.segments.filter((entry) => entry.id !== 'I')) {
    assert.ok(behind < centreOf(segment.id).z, `the caudate sits behind ${segment.id}`);
  }

  // It drains by its own veins rather than through any of the three, and it is
  // fed from both portal branches.
  assert.ok(vesselNamed('caudate-veins'), 'the caudate has its own drainage');
  assert.ok(vesselNamed('portal-pedicle-I-right'), 'and a pedicle from the right branch');
  assert.ok(vesselNamed('portal-pedicle-I-left'), 'and one from the left');
});

/* --------------------------------------------------------------------------
   The two trees, and the difference between them
   -------------------------------------------------------------------------- */

test('the hepatic veins lie on the planes that separate the segments', () => {
  // Between segments, not inside them — which is why a surgeon finds a
  // resection plane by following one.
  const frame = liver.frame;
  for (const vein of HEPATIC_VEINS) {
    const branch = vesselNamed(vein.id);
    assert.ok(branch, `${vein.id} is drawn`);
    const definition = PLANES[vein.plane];
    const normal = frame.toLocalNormal(definition.normal);
    const through = frame.toLocal(definition.through);
    // The point the vein starts from sits on its own plane, to within the
    // width of a vessel.
    const from = veinOrigin(frame, vein);
    const offset = Math.abs(normal.dot(from) - normal.dot(through));
    assert.ok(offset < 1e-9, `${vein.id} starts ${offset.toFixed(3)} off the plane it is supposed to run in`);
  }
  assert.ok(vesselNamed('inferior-vena-cava'), 'and they converge on the cava');
});

test('the portal pedicles run inside the segments they supply', () => {
  // The other half of the arrangement: what supplies a unit sits within it.
  // Together with the veins on the boundaries, this is the whole reason a
  // segment can be taken out without cutting into its neighbours.
  for (const segment of liver.segments) {
    if (segment.id === 'I') continue;
    assert.ok(vesselNamed(`portal-pedicle-${segment.id}`), `${segment.id} has a portal pedicle`);
    // The pedicle ends inside its own segment, **and not near a boundary**.
    //
    // Being on the correct side of every plane is not worth asserting on its
    // own: the pedicle is placed at the centroid of the samples inside those
    // planes, so it is on the correct side by construction and a test of it
    // measures the arithmetic rather than the anatomy. The claim with content
    // is the margin — how far from the nearest boundary it ends — because that
    // is what distinguishes a pedicle from a hepatic vein, which lies *on* one.
    const margin = Math.min(
      ...segment.planes.map((plane) => Math.abs(plane.normal.dot(segment.pedicle) - plane.constant))
    );
    // 0.12, in a liver 3.9 wide. The thinnest segment, II, comes out at 0.150
    // and the rest at 0.19–0.32, against 0 for a hepatic vein on its plane.
    assert.ok(
      margin > 0.12,
      `${segment.id}'s pedicle ends ${margin.toFixed(3)} from its own boundary, near enough to be a vein`
    );
    assert.equal(liver.segmentAt(segment.pedicle)?.id, segment.id);
  }

  // The caudate is bounded by one plane rather than four — the slab
  // simplification — so it gets its own, looser figure rather than being left
  // out of the measurement.
  const caudate = liver.segmentById('I');
  const caudateMargin = Math.min(
    ...caudate.planes.map((plane) => Math.abs(plane.normal.dot(caudate.pedicle) - plane.constant))
  );
  assert.ok(caudateMargin > 0.03, `the caudate pedicle ends ${caudateMargin.toFixed(3)} from its front`);
  assert.ok(vesselNamed('portal-vein'));
  assert.ok(vesselNamed('right-portal-branch'));
  assert.ok(vesselNamed('left-portal-branch'));
});

test('a hepatic vein and a portal pedicle are not the same kind of thing', () => {
  // Stated as a measurement rather than as a comment: the veins sit near the
  // planes, the pedicles sit far from them and near the segment centres.
  const frame = liver.frame;
  const middle = PLANES.cantlie;
  const normal = frame.toLocalNormal(middle.normal);
  const through = frame.toLocal(middle.through);
  const distanceToCantlie = (point) => Math.abs(normal.dot(point) - normal.dot(through));

  const veinStart = veinOrigin(frame, HEPATIC_VEINS.find((vein) => vein.plane === 'cantlie'));
  // A pedicle in a segment that borders Cantlie's line, which is the fair
  // comparison: both are near the middle of the liver.
  const pedicle = liver.segmentById('V').pedicle;
  assert.ok(
    distanceToCantlie(veinStart) < distanceToCantlie(pedicle),
    'the middle hepatic vein runs nearer its own plane than a neighbouring pedicle does'
  );
  // How much nearer, so the difference is a figure and not just an ordering: a
  // vein starts on its plane, a pedicle a fifth of a liver's width away.
  assert.ok(
    distanceToCantlie(veinStart) < 1e-9,
    `the middle hepatic vein starts ${distanceToCantlie(veinStart).toFixed(4)} off its own plane`
  );
  assert.ok(
    distanceToCantlie(pedicle) > 0.15,
    `segment V's pedicle sits only ${distanceToCantlie(pedicle).toFixed(3)} from Cantlie's line`
  );
});

test('each segment really is star-shaped about the centre it was carved from', () => {
  // What `carve.js` assumes about every part it produces, measured rather than
  // asserted in prose. A liver is the harder case of the two: nine parts, some
  // of them thin, and the caudate cut as a slab.
  for (const segment of liver.segments) {
    const { ok, failures } = starShaped(segment.geometry, segment.centre, { detail: 2 });
    assert.ok(
      ok,
      `segment ${segment.id}: ${failures.length} directions leave the surface other than once`
    );
  }
});

/* --------------------------------------------------------------------------
   The interface
   -------------------------------------------------------------------------- */

test('a segment and a sector can each be taken away on their own', () => {
  const built = buildLiver({ vessels: false, detail: 6 });
  built.setSegmentVisible('VIII', false);
  assert.equal(built.segmentById('VIII').mesh.visible, false);
  assert.equal(built.segmentById('V').mesh.visible, true, 'its neighbour stays');

  built.setSectorVisible('right-posterior', false);
  for (const id of segmentsOfSector('right-posterior').map((segment) => segment.id)) {
    assert.equal(built.segmentById(id).mesh.visible, false, `${id} goes with its sector`);
  }
  assert.equal(built.segmentById('IVa').mesh.visible, true, 'and the left liver is untouched');
  built.dispose();
});

test('the liver still answers what the four scenes that draw it ask', () => {
  // The rebuild changed what a liver is made of. `object.material` is gone —
  // there are nine of them — so the scenes say what they mean instead.
  const built = buildLiver({ color: '#8f3f43', opacity: 0.62, detail: 6 });
  assert.ok(built.object.isObject3D);
  assert.ok(built.anchors.rightLobe && built.anchors.leftLobe && built.anchors.porta);
  built.object.position.set(-1.1, 0.15, 0);
  built.object.scale.setScalar(0.92);

  built.setParenchymaColor('#5d3038');
  assert.ok(built.segments.every((segment) => segment.material.color.getHexString() === '5d3038'));
  built.setSegmentColor('I', '#ffffff');
  assert.equal(built.segmentById('I').material.color.getHexString(), 'ffffff');
  assert.equal(built.segmentById('II').material.color.getHexString(), '5d3038', 'and only that one');
  built.dispose();
});

test('every point the builder reports as inside really is inside a segment', () => {
  // `contains` and `segmentAt` have to agree, or a scene placing something in
  // the liver can put it in a segment that does not reach there.
  const built = buildLiver({ vessels: false, detail: 6 });
  built.object.updateMatrixWorld(true);
  let checked = 0;
  for (const segment of built.segments) {
    assert.ok(built.contains(segment.centre), `${segment.id}'s centre is inside the liver`);
    assert.equal(built.segmentAt(segment.centre)?.id, segment.id, `${segment.id}'s centre is in itself`);
    checked += 1;
  }
  assert.equal(checked, 9);
  built.dispose();
});

test('a liver that was not asked for vessels does not have any', () => {
  // Three of the four scenes that build this liver draw portal vessels of
  // their own, and in two of them — portal hypertension and the hepatorenal
  // scene — those vessels' calibre is solved from the disease state. A liver
  // that brings its own fixed portal tree puts a second, unresponsive one
  // inside the same organ, in the scenes whose entire subject is what the
  // portal pressure does to it.
  const bare = buildLiver({ detail: 6 });
  assert.equal(bare.hepaticVeins, null, 'a bare liver reports hepatic veins');
  assert.equal(bare.portal, null);

  const drawn = [];
  bare.object.traverse((object) => {
    if (object.isMesh && !/^segment-/.test(object.name)) drawn.push(object.name);
  });
  assert.deepEqual(drawn, [], `a bare liver drew ${drawn.length} vessel meshes`);
  bare.dispose();

  // The segments are still all there — it is the vessels that are optional.
  const asked = buildLiver({ detail: 6, vessels: true });
  assert.equal(bare.segments.length, asked.segments.length);
  assert.ok(asked.portal.object.children.length > 0, 'a liver that asked for vessels has none');
  asked.dispose();
});

/** Every scene source that calls `name(`, found rather than listed. */
function sceneSourcesCalling(name) {
  const root = new URL('../src/scenes/', import.meta.url);
  const found = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
      if (entry.isDirectory()) {
        walk(child);
        continue;
      }
      if (!entry.name.endsWith('.js')) continue;
      const source = readFileSync(child, 'utf8');
      // The organ's own module calls itself; it is not a scene.
      if (child.pathname.includes('/organs/')) continue;
      if (new RegExp(`\\b${name}\\(`).test(source)) {
        found.push({ path: child.pathname.slice(child.pathname.indexOf('src/')), source });
      }
    }
  };
  walk(root);
  return found;
}

/**
 * The argument text of every `name(...)` call, by balancing brackets.
 *
 * A regex cannot do this: `buildLiver\({[^}]*vessels:\s*true` stops at the first
 * `}`, so a nested object literal anywhere before the flag — `segmentColors:
 * { … }` — hides it, and the guard passes while being violated. Verified: that
 * pattern matches `buildLiver({ color: X, vessels: true })` and misses
 * `buildLiver({ segmentColors: { I: '#fff' }, vessels: true })`.
 */
function callArguments(source, name) {
  const calls = [];
  const opener = new RegExp(`\\b${name}\\(`, 'g');
  let match;
  while ((match = opener.exec(source)) !== null) {
    let depth = 1;
    let index = match.index + match[0].length;
    const from = index;
    while (index < source.length && depth > 0) {
      const character = source[index];
      if ('([{'.includes(character)) depth += 1;
      else if (')]}'.includes(character)) depth -= 1;
      index += 1;
    }
    calls.push(source.slice(from, index - 1));
  }
  return calls;
}

test('no scene draws both liver vessel trees', () => {
  // There are two, they overlap on four structures — the portal vein, the
  // portal branches, the hepatic vein and the cava — and they are
  // authoritative for different things: `portalVasculature.js` owns the solved
  // circulation, `liver.js` owns the anatomy. Drawing both put a second,
  // unresponsive portal vein inside the same liver as the modelled one.
  //
  // Read from the scene sources rather than by building them, because the
  // defect is the *call*: a scene that asks `buildLiver` for vessels while
  // also drawing a portal circulation of its own is wrong whether or not the
  // two happen to be visible in the same frame.
  //
  // Callers are discovered rather than listed — a hardcoded list covers the
  // scenes that existed when it was written and silently exempts the next one.
  const callers = sceneSourcesCalling('buildLiver');
  assert.ok(callers.length >= 3, `expected several scenes to build a liver, found ${callers.length}`);

  for (const { path, source } of callers) {
    const askedForVessels = callArguments(source, 'buildLiver').some((argument) =>
      /\bvessels\s*:\s*true\b/.test(argument)
    );
    const ownVessels = /buildPortalVasculature\(/.test(source) || /new TubeSurface\(/.test(source);
    assert.ok(
      !(askedForVessels && ownVessels),
      `${path} draws its own portal vessels and also asks the liver for a tree`
    );
  }
});
