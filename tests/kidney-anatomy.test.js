import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { anatomicalSide } from '../src/scenes/cardiovascular/scenes/heartFailure/anatomy.js';
import { buildKidney } from '../src/scenes/renal/organs/kidney.js';
import { qualityOfEach } from './mesh-quality.js';
import {
  COLUMNS,
  CORTEX_THICKNESS_FRACTION,
  LOBES,
  COLUMN_HALF_ANGLE,
  LOBE_HALF_ANGLE,
  LOBE_PITCH,
  MAJOR_CALYCES,
  MEDIAL_MARGIN_PARTS,
  SINUS_CENTRE,
  majorCalyxAt,
  medullaryParts,
} from '../src/scenes/renal/organs/kidneyAnatomy.js';
import { carveInside, carvePart } from '../src/scenes/shared/geometry/carve.js';
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
    // "Cups" as something measurable, not as a word in a comment. The calyx
    // was a sphere centred on the papilla, which swallows it; a receptacle is
    // one the papilla is *inside*, with the mouth outside the tip and the
    // throat within it.
    assert.ok(
      encloses(calyx.mesh, site.papilla),
      `${site.lobe}: the papilla is inside its minor calyx`
    );
    // And it is a cup rather than a pipe that happens to pass the papilla:
    // wide where it takes it, narrow where it hands it on.
    const { mouth, stem } = calibre(calyx.mesh, calyx.path);
    assert.ok(
      mouth > stem * 1.6,
      `${site.lobe}: the calyx is ${mouth.toFixed(4)} across at the papilla and `
        + `${stem.toFixed(4)} at its throat — a receptacle flares`
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


/**
 * How wide a duct is at each end, measured along its own centre line.
 *
 * Off the mesh rather than read back from the profile it was built with,
 * because the question is what the organ *is*, not what it was asked for. The
 * centre line matters: these ducts curve, and two earlier versions of this
 * measured against a straight axis between the extreme vertices and against
 * distance from the papilla. Both quietly measured something else — one cut
 * the corner, the other grouped mid-cup vertices as the mouth — and both
 * reported a flare of 1.3 where the model has one of 2.0.
 */
function calibre(mesh, path) {
  const position = mesh.geometry.getAttribute('position');
  const span = path[path.length - 1].clone().sub(path[0]);
  const along = (point) =>
    Math.max(0, Math.min(1, point.clone().sub(path[0]).dot(span) / span.lengthSq()));
  const offCentre = (point) => {
    let best = Infinity;
    for (let i = 0; i < path.length - 1; i += 1) {
      const leg = path[i + 1].clone().sub(path[i]);
      const t = Math.max(0, Math.min(1, point.clone().sub(path[i]).dot(leg) / leg.lengthSq()));
      best = Math.min(best, point.distanceTo(path[i].clone().addScaledVector(leg, t)));
    }
    return best;
  };

  let mouth = 0;
  let stem = 0;
  for (let i = 0; i < position.count; i += 1) {
    const point = new THREE.Vector3().fromBufferAttribute(position, i);
    const u = along(point);
    if (u < 0.15) mouth = Math.max(mouth, offCentre(point));
    if (u > 0.85) stem = Math.max(stem, offCentre(point));
  }
  return { mouth, stem };
}

/** Is `point` inside this mesh? Ray parity, counting both faces. */
function encloses(mesh, point) {
  const raycaster = new THREE.Raycaster();
  // Front-side materials make the raycaster skip back faces, and a parity
  // count that never sees the far wall calls every interior point outside.
  const was = mesh.material.side;
  mesh.material.side = THREE.DoubleSide;
  let votes = 0;
  for (const direction of [
    new THREE.Vector3(0.532, 0.671, 0.517).normalize(),
    new THREE.Vector3(-0.713, 0.219, 0.666).normalize(),
    new THREE.Vector3(0.301, -0.845, 0.442).normalize(),
  ]) {
    raycaster.set(point, direction);
    raycaster.far = 1e4;
    if (raycaster.intersectObject(mesh, false).length % 2 === 1) votes += 1;
  }
  mesh.material.side = was;
  return votes >= 2;
}

test('kidney: the calyces drain through three major calyces, not into one point', () => {
  // The seven infundibula all ran to the middle of the sinus, which is a star
  // and not a collecting system. Minor calyces join a major calyx, and the two
  // or three major calyces open into the pelvis.
  const kidney = build();
  const named = new Set();
  kidney.object.traverse((node) => { if (node.isMesh) named.add(node.name); });

  for (const calyx of MAJOR_CALYCES) {
    assert.ok(named.has(`major-calyx-${calyx.id}`), `the ${calyx.id} major calyx is drawn`);
  }
  assert.equal(
    [...named].filter((name) => name.startsWith('major-calyx-')).length,
    MAJOR_CALYCES.length
  );

  // Every lobe drains into exactly one of them, and every one of them is used.
  const drained = kidney.calyces.map((entry) => entry.major);
  assert.equal(new Set(drained).size, MAJOR_CALYCES.length, 'each major calyx collects from somewhere');
  assert.equal(drained.length, LOBES.length, 'and every lobe drains');

  // The gathering points are distinct and each sits between its papillae and
  // the pelvis, which is what makes this a tree rather than a spoke.
  const gathers = MAJOR_CALYCES.map((calyx) => kidney.frame.toLocal(majorCalyxAt(calyx)));
  for (let i = 0; i < gathers.length; i += 1) {
    for (let j = i + 1; j < gathers.length; j += 1) {
      assert.ok(gathers[i].distanceTo(gathers[j]) > 0.02, 'the major calyces gather in different places');
    }
    const group = kidney.calyces.filter((entry) => entry.major === MAJOR_CALYCES[i].id);
    for (const entry of group) {
      assert.ok(
        gathers[i].distanceTo(kidney.pelvisCentre) < entry.papilla.distanceTo(kidney.pelvisCentre),
        `${entry.lobe}: its major calyx is nearer the pelvis than its papilla is`
      );
    }
  }
  kidney.dispose();
});

test('kidney: every part is a closed solid well below the resolution it ships at', () => {
  for (const detail of [8, 10, 12, 18]) {
    const kidney = buildKidney({ parts: true, detail });
    const open = [];
    for (const [name, quality] of qualityOfEach(kidney.object)) {
      if (!quality.closed) open.push(`${name} (${quality.boundaryEdges} on a hole, ${quality.nonManifoldEdges} shared thrice)`);
    }
    assert.deepEqual(open, [], `at detail ${detail} every part should still be a closed solid`);
    kidney.dispose();
  }
});

test('kidney: what the fan fills does not depend on how finely it is drawn', () => {
  // This is the zigzag, measured. The rim between a cut face and the capsule
  // used to fall wherever the tessellation put it, so each part lost a sawtooth
  // of volume along every cut — and the finer the mesh, the less it lost. That
  // is a shape that changes with its resolution, which is the definition of a
  // shape that is not finished: the fan filled 57.8% of the solid it was cut
  // from at detail 10 and was still climbing at 59.9% by detail 18, nowhere
  // near settled.
  //
  // `carvePart` cuts the mesh along the crease now, so the cut faces are exact
  // at any resolution and the fraction is the same one throughout. Closedness
  // does not catch this — the mesh was closed all along, and merely the wrong
  // shape.
  const share = (detail) => {
    const kidney = buildKidney({ parts: true, detail });
    const inner = carvePart({ field: kidney.innerField, centre: kidney.field.centre.clone(), detail });
    const whole = Math.abs(volumeOf(inner));
    const fan = kidney.parts
      .filter((part) => part.kind !== 'cortex')
      .reduce((sum, part) => sum + Math.abs(volumeOf(part.geometry)), 0);
    inner.dispose();
    kidney.dispose();
    return fan / whole;
  };

  const coarse = share(10);
  const fine = share(18);
  assert.ok(
    Math.abs(fine - coarse) < 0.005,
    `the fan fills ${(100 * coarse).toFixed(2)}% of the medulla at detail 10 and `
      + `${(100 * fine).toFixed(2)}% at detail 18 — a cut face that moves with the mesh`
  );
});
