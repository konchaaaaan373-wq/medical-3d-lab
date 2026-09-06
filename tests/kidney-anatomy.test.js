import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { anatomicalSide } from '../src/scenes/cardiovascular/scenes/heartFailure/anatomy.js';
import { buildKidney } from '../src/scenes/renal/organs/kidney.js';
import {
  COLUMNS,
  CORTEX_THICKNESS_FRACTION,
  LOBES,
  MEDIAL_MARGIN_PARTS,
  SINUS_CENTRE,
  parenchymaParts,
} from '../src/scenes/renal/organs/kidneyAnatomy.js';
import { carveInside } from '../src/scenes/shared/geometry/carve.js';
import { partitionReport } from './partition.js';

/**
 * The kidney, checked as anatomy.
 *
 * The division into renal lobes is not a diagram: a lobe is one pyramid and the
 * cortex over it, which is how the organ develops and why a foetal kidney is
 * lumpy. Every claim below is a fact about that arrangement — cortex outside,
 * medulla inside, papillae pointing at the sinus, columns reaching between the
 * pyramids — rather than a fact about this repository's numbers.
 */

/**
 * The mesh resolution the claims are measured at, and what it buys.
 *
 * A kidney's parts are thinner than a liver's — a cortical cap is a shell a
 * third of the parenchyma deep — so a mesh built star-shaped about a part's own
 * centroid needs more of the sphere it is sampled on. Measured against the
 * kidney the parts were cut from: 10 → 96.0%, 14 → 97.6%, 20 → 98.7% for twice
 * the build time.
 */
const DETAIL = 14;
const SAMPLES = 12000;

const build = (side = 'left') =>
  buildKidney({ side, parts: true, detail: DETAIL, referenceSamples: SAMPLES });

function volumeOf(geometry) {
  const position = geometry.attributes.position;
  const index = geometry.index;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let total = 0;
  const count = index ? index.count : position.count;
  for (let i = 0; i < count; i += 3) {
    const ia = index ? index.getX(i) : i;
    const ib = index ? index.getX(i + 1) : i + 1;
    const ic = index ? index.getX(i + 2) : i + 2;
    a.fromBufferAttribute(position, ia);
    b.fromBufferAttribute(position, ib);
    c.fromBufferAttribute(position, ic);
    total += a.dot(b.clone().cross(c)) / 6;
  }
  return Math.abs(total);
}

test('kidney: the parts are the lobes — cortex, pyramid, and the columns between', () => {
  const parts = parenchymaParts();
  assert.equal(LOBES.length, 7, 'seven pyramids is the arrangement a coronal section is taught with');
  assert.equal(COLUMNS.length, LOBES.length - 1, 'a column sits between each adjacent pair, and only there');

  const kinds = parts.reduce((counts, part) => {
    counts[part.kind] = (counts[part.kind] ?? 0) + 1;
    return counts;
  }, {});
  // Seven cortical caps plus the medial margin, which is cortex with no pyramid
  // under it because past the poles there is hilum rather than tissue.
  // Seven cortical caps and seven pyramids, plus the hilar lips as cortex in
  // three parts. No column meshes: see the note below.
  assert.deepEqual(kinds, { cortex: LOBES.length + MEDIAL_MARGIN_PARTS, medulla: LOBES.length });

  for (const part of parts) {
    assert.ok(part.id, 'every part is addressable by name');
    assert.ok(part.label?.trim() && part.labelJa?.trim(), `${part.id} is named in both languages`);
    // Two planes close an angular sector; a lobe's cortex and pyramid take a
    // third, the corticomedullary junction that separates them.
    const expected = part.id.startsWith('medial-margin') ? 2 : 3;
    assert.equal(part.cuts.length, expected, `${part.id} is bounded by the cuts that define it`);
  }
  // A column is cortex, and this model does not cut one out: the two pyramids
  // meet along the plane it would occupy. `COLUMNS` still says where each one
  // is, so a scene can point at a column; it cannot hide one.
  assert.equal(parts.filter((part) => part.kind === 'column').length, 0);
  assert.equal(COLUMNS.length, LOBES.length - 1);
});

test('kidney: the parts partition the parenchyma — they fill it and do not overlap', () => {
  // The check with teeth. Nothing about carving an organ into half-spaces makes
  // the parts tile it: one flag backwards and two lobes claim the same wedge,
  // one bound missing and a sliver belongs to nobody, and neither shows up in a
  // picture. Both happened here — the fan was read from the wrong end, and then
  // its two ends were left open and both claimed the medial sliver.
  const kidney = build();
  const report = partitionReport({
    field: kidney.field,
    detail: DETAIL,
    contains: (point) => kidney.contains(point),
    parts: kidney.parts,
    volumeOf,
    samples: 40000,
    seed: 23,
  });

  assert.equal(report.samples, 40000, 'the sample has to land in the kidney 40000 times');
  assert.ok(
    report.unassignedRate <= 0.001,
    `${report.unassigned} of ${report.samples} points belong to no part — ${report.worst}`
  );
  assert.ok(
    report.multipleRate <= 0.001,
    `${report.multiple} of ${report.samples} points belong to more than one part — ${report.worst}`
  );
  // Three per cent, and the number is the tessellation rather than the
  // partition: not one sampled point belongs to no part or to two, which are
  // the checks that catch a cut on the wrong side. What the shortfall measures
  // is how well a star-shaped mesh represents a part this thin, and it closes
  // on the organ as the detail rises — 96.0% at 10, 97.6% at 14, 98.7% at 20.
  assert.ok(
    Math.abs(report.shortfall) <= 0.03,
    `the parts sum to ${(100 * (1 - report.shortfall)).toFixed(2)}% of the kidney they were cut from`
  );
  kidney.dispose();
});

test('kidney: the cortex is outside the medulla, in every lobe', () => {
  const kidney = build();
  const sinus = new THREE.Vector3().copy(kidney.frame.toLocal(SINUS_CENTRE));

  for (const lobe of LOBES) {
    const cortex = kidney.part(`cortex-${lobe.id}`);
    const pyramid = kidney.part(`pyramid-${lobe.id}`);
    assert.ok(cortex && pyramid, `${lobe.id} has both a cortex and a pyramid`);
    assert.ok(
      cortex.centre.distanceTo(sinus) > pyramid.centre.distanceTo(sinus),
      `${lobe.id}: the cortex must sit further from the sinus than its pyramid does`
    );
  }
  kidney.dispose();
});

test('kidney: every papilla points at the sinus, and a calyx cups it', () => {
  const kidney = build();
  const sinus = new THREE.Vector3().copy(kidney.frame.toLocal(SINUS_CENTRE));

  for (const site of kidney.nephronSites) {
    assert.ok(
      site.papilla.distanceTo(sinus) < site.corticomedullaryJunction.distanceTo(sinus),
      `${site.lobe}: the papilla is the end of the pyramid nearest the sinus`
    );
    assert.ok(
      site.corticomedullaryJunction.distanceTo(sinus) < site.surface.distanceTo(sinus),
      `${site.lobe}: the corticomedullary junction lies between the sinus and the surface`
    );
    const calyx = kidney.calyces.find((entry) => entry.lobe === site.lobe);
    assert.ok(calyx, `${site.lobe} has a minor calyx`);
    assert.ok(
      calyx.papilla.distanceTo(site.papilla) < 1e-6,
      `${site.lobe}: the calyx cups the papilla rather than sitting near it`
    );
  }

  // And the collecting system converges: every calyx is nearer the pelvis than
  // the cortex it drains, which is the direction urine actually travels.
  for (const calyx of kidney.calyces) {
    const cortex = kidney.part(`cortex-${calyx.lobe}`);
    assert.ok(
      calyx.papilla.distanceTo(kidney.pelvisCentre) < cortex.centre.distanceTo(kidney.pelvisCentre),
      `${calyx.lobe}: the papilla drains towards the pelvis`
    );
  }
  kidney.dispose();
});

test('kidney: the cortex is about a third of the parenchyma, wherever it is measured', () => {
  const kidney = build();
  const sinus = new THREE.Vector3().copy(kidney.frame.toLocal(SINUS_CENTRE));

  for (const site of kidney.nephronSites) {
    const thickness = site.surface.distanceTo(sinus);
    const cortical = site.surface.distanceTo(site.corticomedullaryJunction);
    const fraction = cortical / thickness;
    // The proportion is the claim, and it has to hold at the poles as well as
    // at the convex border — which is exactly what a fixed depth could not do.
    assert.ok(
      Math.abs(fraction - CORTEX_THICKNESS_FRACTION) < 0.02,
      `${site.lobe}: cortex is ${(fraction * 100).toFixed(1)}% of the parenchyma`
    );
  }
  kidney.dispose();
});

test('kidney: a nephron sits with its glomerulus in the cortex and its loop in the medulla', () => {
  // The join between the three scales this organ is drawn at. Filtration
  // happens in the cortex and the concentrating gradient is in the medulla, so
  // a nephron placed the other way round would be a different organ — and
  // nothing in `nephron.js` or in the macro geometry can notice on its own.
  const kidney = build();

  for (const site of kidney.nephronSites) {
    const cortex = kidney.part(`cortex-${site.lobe}`);
    const pyramid = kidney.part(`pyramid-${site.lobe}`);

    assert.ok(
      carveInside(site.glomerulus, { field: kidney.field, planes: cortex.planes }),
      `${site.lobe}: the glomerulus has to be in the cortex`
    );
    assert.ok(
      !carveInside(site.glomerulus, { field: kidney.field, planes: pyramid.planes }),
      `${site.lobe}: and not in the pyramid`
    );
    assert.ok(
      carveInside(site.loopTip, { field: kidney.field, planes: pyramid.planes }),
      `${site.lobe}: the loop of Henle descends into the medulla`
    );
    assert.ok(
      !carveInside(site.loopTip, { field: kidney.field, planes: cortex.planes }),
      `${site.lobe}: and does not stay in the cortex`
    );
  }
  kidney.dispose();
});

test('kidney: each renal column is named for the two pyramids it lies between', () => {
  // The columns are description rather than geometry here, so what is checked
  // is the description: every one sits strictly between the two pyramids it
  // names, and it names two that exist.
  const kidney = build();
  for (const column of COLUMNS) {
    const [first, second] = column.between;
    const left = LOBES.find((lobe) => lobe.id === first);
    const right = LOBES.find((lobe) => lobe.id === second);
    assert.ok(left && right, `${column.id} names two lobes that exist`);
    const [low, high] = [left.angle, right.angle].sort((a, b) => a - b);
    assert.ok(
      column.angle > low && column.angle < high,
      `${column.id} sits at ${column.angle}°, not between ${low}° and ${high}°`
    );
    assert.ok(kidney.part(`pyramid-${first}`) && kidney.part(`pyramid-${second}`));
    assert.equal(kidney.part(column.id), null, 'and it is not carved as a part of its own');
  }
  kidney.dispose();
});

test('kidney: every part is a closed solid with a real volume', () => {
  const kidney = build();
  for (const part of kidney.parts) {
    const volume = volumeOf(part.geometry);
    assert.ok(Number.isFinite(volume) && volume > 0, `${part.id} encloses a finite positive volume`);
  }
  kidney.dispose();
});

test('kidney: both kidneys turn the same anatomy towards the midline', () => {
  for (const side of ['left', 'right']) {
    const medialSide = side === 'left' ? 'right' : 'left';
    const kidney = build(side);
    assert.equal(anatomicalSide(kidney.hilum), medialSide, `the ${side} kidney's hilum faces medially`);
    assert.equal(
      anatomicalSide(kidney.pelvisCentre),
      medialSide,
      `and its pelvis sits on the medial side, where the ureter leaves`
    );
    assert.equal(
      anatomicalSide(kidney.part('cortex-lateral').centre),
      side,
      'while the lobe on the convex border sits laterally'
    );
    assert.equal(kidney.parts.length, 17, 'the same parts are built on both sides');
    kidney.dispose();
  }
});

test('kidney: the landmark build is untouched, and is still what a thumbnail gets', () => {
  // Two builders, on purpose. The cheap one places a kidney in a whole-body
  // view or a preview; the carved one answers questions about lobes. Neither is
  // a draft of the other, and four scenes depend on the cheap one.
  const sketch = buildKidney({ side: 'left' });
  const names = sketch.object.children.map((child) => child.name);
  assert.deepEqual(names, ['cortex', 'medulla', 'pelvis']);
  assert.ok(sketch.filtrationPaths.length > 0);
  assert.equal(sketch.parts, undefined, 'the landmark build makes no claim about lobes');
});
