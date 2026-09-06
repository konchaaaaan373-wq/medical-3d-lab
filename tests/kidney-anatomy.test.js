import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { anatomicalSide } from '../src/scenes/cardiovascular/scenes/heartFailure/anatomy.js';
import { buildKidney } from '../src/scenes/renal/organs/kidney.js';
import {
  COLUMNS,
  CORTEX_THICKNESS_FRACTION,
  LOBES,
  COLUMN_HALF_ANGLE,
  LOBE_HALF_ANGLE,
  LOBE_PITCH,
  MEDIAL_MARGIN_PARTS,
  SINUS_CENTRE,
  medullaryParts,
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
 * The mesh resolution the claims are measured at.
 *
 * Measured against the kidney the parts were cut from: 100.7% at detail 10,
 * 101.5% at 14, 102.0% at 20. Cutting the cortex out as a shell rather than as
 * a ring of caps is what brought this within a couple of per cent at a
 * tessellation anyone would ship — the caps were the thin parts, and thin parts
 * are what a star-shaped carve represents worst.
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

test('kidney: the cortex is one part and the fan divides what is inside it', () => {
  const parts = medullaryParts();
  assert.equal(LOBES.length, 7, 'seven pyramids is the arrangement a coronal section is taught with');
  assert.equal(COLUMNS.length, LOBES.length - 1, 'a column sits between each adjacent pair, and only there');

  const kinds = parts.reduce((counts, part) => {
    counts[part.kind] = (counts[part.kind] ?? 0) + 1;
    return counts;
  }, {});
  // Seven pyramids, and the cortex that reaches in between and past them: six
  // columns and the hilar lips. The cortex proper is not in this list — it is
  // the shell outside the junction, and it is one part because a cortex is
  // continuous.
  assert.deepEqual(kinds, {
    medulla: LOBES.length,
    cortex: COLUMNS.length + MEDIAL_MARGIN_PARTS,
  });

  for (const part of parts) {
    assert.ok(part.id, 'every part is addressable by name');
    assert.ok(part.label?.trim() && part.labelJa?.trim(), `${part.id} is named in both languages`);
    // Two planes close an angular sector; nothing bounds it on the inside,
    // because the sinus is not carved out.
    assert.equal(part.cuts.length, 2, `${part.id} is bounded by the sector that defines it`);
  }

  // A column is cortex, not a third tissue. Getting this wrong is how a model
  // ends up teaching that there is medulla between the pyramids.
  for (const column of COLUMNS) {
    assert.equal(parts.find((part) => part.id === column.id)?.kind, 'cortex');
  }

  // The sectors have to tile the fan exactly. Two degrees of slop here is not
  // a rounding error: it is a pyramid and the column beside it both claiming
  // the same tissue, and no picture shows it.
  assert.equal(LOBE_HALF_ANGLE + COLUMN_HALF_ANGLE, LOBE_PITCH / 2);
  for (let index = 1; index < LOBES.length; index += 1) {
    assert.equal(LOBES[index - 1].angle - LOBES[index].angle, LOBE_PITCH, 'the fan is evenly spaced');
  }
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
  // Two per cent, and the number is the tessellation rather than the
  // partition: not one sampled point belongs to no part or to two, which are
  // the checks that catch a cut on the wrong side. What is left is how well a
  // star-shaped mesh represents each part — 100.7% of the organ at detail 10,
  // 101.5% at 14 — and the sign is a reminder that a carve about a centroid
  // can bulge across a concavity as well as fall short of a convexity.
  assert.ok(
    Math.abs(report.shortfall) <= 0.02,
    `the parts sum to ${(100 * (1 - report.shortfall)).toFixed(2)}% of the kidney they were cut from`
  );
  kidney.dispose();
});

test('kidney: the cortex is outside the medulla, and it wraps every pyramid', () => {
  const kidney = build();
  const cortex = kidney.part('cortex');
  assert.ok(cortex, 'the cortex is one named part');

  for (const lobe of LOBES) {
    const pyramid = kidney.part(`pyramid-${lobe.id}`);
    assert.ok(pyramid, `${lobe.id} has a pyramid`);
    // Every pyramid lies inside the corticomedullary junction, so no point of
    // one is ever in the cortex. That is the claim the whole division rests on.
    assert.ok(
      !cortex.inside(pyramid.centre),
      `${lobe.id}: no part of a pyramid may be in the cortex`
    );
  }

  // And the cortex is outside: a point just under the capsule is cortex, a
  // point at the sinus is not.
  for (const site of kidney.nephronSites) {
    assert.ok(cortex.inside(site.surface.clone().lerp(site.corticomedullaryJunction, 0.2)));
    assert.ok(!cortex.inside(site.papilla));
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
    const site = kidney.nephronSites.find((entry) => entry.lobe === calyx.lobe);
    assert.ok(
      calyx.papilla.distanceTo(kidney.pelvisCentre) < site.surface.distanceTo(kidney.pelvisCentre),
      `${calyx.lobe}: the papilla drains towards the pelvis`
    );
  }
  kidney.dispose();
});

test('kidney: the corticomedullary junction is the capsule, shrunk — not a plane', () => {
  const kidney = build();

  for (const site of kidney.nephronSites) {
    // Every point of the junction sits at the same fraction of the organ's own
    // radius in its own direction, because the junction *is* the surface scaled
    // towards the centre. That is the claim: it follows the organ rather than
    // being assembled out of flats, and it is checked against the field the
    // capsule came from rather than against a number written down here.
    const direction = site.corticomedullaryJunction.clone().sub(kidney.field.centre);
    const kept = direction.length() / kidney.field.radiusAt(direction);
    assert.ok(
      Math.abs(kept - (1 - CORTEX_THICKNESS_FRACTION)) < 0.01,
      `${site.lobe}: the junction sits at ${(kept * 100).toFixed(1)}% of the radius`
    );

    // Measured the way a section is read — from the sinus outwards — the cortex
    // is about a third of the parenchyma everywhere. It varies, because the
    // sinus is not the centre the junction was scaled about, and the point of
    // recording the range is that it is a proportion rather than a number.
    const thickness = site.surface.distanceTo(kidney.frame.toLocal(SINUS_CENTRE));
    const cortical = site.surface.distanceTo(site.corticomedullaryJunction);
    const fraction = cortical / thickness;
    assert.ok(
      fraction > 0.25 && fraction < 0.45,
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
  const cortex = kidney.part('cortex');

  for (const site of kidney.nephronSites) {
    const pyramid = kidney.part(`pyramid-${site.lobe}`);

    assert.ok(cortex.inside(site.glomerulus), `${site.lobe}: the glomerulus has to be in the cortex`);
    assert.ok(
      !carveInside(site.glomerulus, { field: pyramid.field, planes: pyramid.planes }),
      `${site.lobe}: and not in the pyramid`
    );
    assert.ok(
      carveInside(site.loopTip, { field: pyramid.field, planes: pyramid.planes }),
      `${site.lobe}: the loop of Henle descends into the medulla`
    );
    assert.ok(!cortex.inside(site.loopTip), `${site.lobe}: and does not stay in the cortex`);
  }
  kidney.dispose();
});

test('kidney: each renal column is cortex, between the two pyramids it names', () => {
  const kidney = build();
  for (const column of COLUMNS) {
    const [first, second] = column.between;
    const part = kidney.part(column.id);
    assert.ok(part, `${column.id} is built`);
    assert.equal(part.kind, 'cortex', 'a column is cortex reaching in, not a third tissue');

    const left = LOBES.find((lobe) => lobe.id === first);
    const right = LOBES.find((lobe) => lobe.id === second);
    const [low, high] = [left.angle, right.angle].sort((a, b) => a - b);
    assert.ok(
      column.angle > low && column.angle < high,
      `${column.id} sits at ${column.angle}°, not between ${low}° and ${high}°`
    );
    assert.ok(kidney.part(`pyramid-${first}`) && kidney.part(`pyramid-${second}`));
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
      anatomicalSide(kidney.part('pyramid-lateral').centre),
      side,
      'while the pyramid on the convex border sits laterally'
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
