import test from 'node:test';
import assert from 'node:assert/strict';

import {
  connectedComponents,
  directions,
  edgeClasses,
  eulerCharacteristic,
  isClosedManifold,
  nearestSampledVertexDistance,
  signedVolume,
  surfaceCentroid,
  transversalCrossings,
  rayHits,
} from '../scripts/lib/mesh-metrics.mjs';

/**
 * The instrument, checked against shapes whose answers are known.
 *
 * This file exists because the previous version of the measuring code was never
 * run against one. It concluded that no candidate vessel has a modelled wall
 * thickness, from a rule that belongs to a ray crossing a shape from outside
 * while the code cast its ray from inside — where a solid gives one crossing
 * and a shell gives two, so the observation could not tell them apart. The
 * conclusion was withdrawn.
 *
 * The replacement then reached for the same conclusion through the genus, and
 * that is withdrawn too — a cup has a wall and genus 0, a loop of solid rod has
 * no wall and genus 1. Both shapes are measured below so the rule cannot come
 * back a third time.
 *
 * So: every metric is measured here on a cube, a shell, a pipe, a cup, a loop,
 * an open sheet and a few deliberate defects **before** any of it is pointed at
 * a GLB. A metric that cannot answer for a shape is required to say so rather
 * than to guess.
 */

// ---------------------------------------------------------------------------
// shapes whose answers are known

/** A box as 12 triangles, wound outward (counter-clockwise seen from outside). */
function box([cx, cy, cz], [hx, hy, hz], { flip = false } = {}) {
  const v = [
    [cx - hx, cy - hy, cz - hz], [cx + hx, cy - hy, cz - hz],
    [cx + hx, cy + hy, cz - hz], [cx - hx, cy + hy, cz - hz],
    [cx - hx, cy - hy, cz + hz], [cx + hx, cy - hy, cz + hz],
    [cx + hx, cy + hy, cz + hz], [cx - hx, cy + hy, cz + hz],
  ];
  const faces = [
    [0, 2, 1], [0, 3, 2], // -z
    [4, 5, 6], [4, 6, 7], // +z
    [0, 1, 5], [0, 5, 4], // -y
    [3, 7, 6], [3, 6, 2], // +y
    [0, 4, 7], [0, 7, 3], // -x
    [1, 2, 6], [1, 6, 5], // +x
  ];
  return faces.map(([a, b, c]) => (flip ? [v[a], v[c], v[b]] : [v[a], v[b], v[c]]));
}

/** A closed shell with a real thickness: an outer box and an inward-facing inner box. */
const hollowShell = () => [...box([0, 0, 0], [1, 1, 1]), ...box([0, 0, 0], [0.6, 0.6, 0.6], { flip: true })];

/**
 * A square pipe: an annular cross-section swept along z, capped at both ends by
 * annuli. Genus 1. Read as a vessel it is a wall around a lumen; read as a
 * solid it is a washer with a hole through it. The mesh is the same either way,
 * which is part of why the genus does not settle the wall question.
 */
function squarePipe({ outer = 1, inner = 0.6, half = 2 } = {}) {
  const ring = (r) => [[-r, -r], [r, -r], [r, r], [-r, r]];
  const o = ring(outer);
  const i = ring(inner);
  const tris = [];
  const quad = (a, b, c, d) => { tris.push([a, b, c], [a, c, d]); };
  for (let k = 0; k < 4; k += 1) {
    const n = (k + 1) % 4;
    // outer lateral, facing out
    quad([o[k][0], o[k][1], -half], [o[n][0], o[n][1], -half], [o[n][0], o[n][1], half], [o[k][0], o[k][1], half]);
    // inner lateral, facing in
    quad([i[k][0], i[k][1], -half], [i[k][0], i[k][1], half], [i[n][0], i[n][1], half], [i[n][0], i[n][1], -half]);
    // the two annular caps
    quad([o[k][0], o[k][1], half], [o[n][0], o[n][1], half], [i[n][0], i[n][1], half], [i[k][0], i[k][1], half]);
    quad([o[k][0], o[k][1], -half], [i[k][0], i[k][1], -half], [i[n][0], i[n][1], -half], [o[n][0], o[n][1], -half]);
  }
  return tris;
}

/** A solid square rod: a tube of material with no cavity in it at all. */
const squareRod = ({ outer = 1, half = 2 } = {}) => box([0, 0, 0], [outer, outer, half]);

/**
 * A square cup: a block with a cavity sunk into it that reaches the outside
 * through one mouth. It has a wall (1 unit) and a floor (0.5 units) and it is
 * topologically a ball — the counter-example to reading "genus 0" as "no wall".
 */
function squareCup({ outer = 2, inner = 1, height = 4, floor = 0.5 } = {}) {
  const ring = (r) => [[-r, -r], [r, -r], [r, r], [-r, r]];
  const ob = ring(outer).map(([x, y]) => [x, y, 0]);
  const ot = ring(outer).map(([x, y]) => [x, y, height]);
  const it = ring(inner).map(([x, y]) => [x, y, height]);
  const ifl = ring(inner).map(([x, y]) => [x, y, floor]);
  const tris = [];
  const quad = (a, b, c, d) => { tris.push([a, b, c], [a, c, d]); };
  quad(ob[0], ob[3], ob[2], ob[1]); // the outside floor, facing down
  for (let k = 0; k < 4; k += 1) {
    const n = (k + 1) % 4;
    quad(ob[k], ob[n], ot[n], ot[k]); // outer wall, facing out
    quad(ot[k], ot[n], it[n], it[k]); // the annular rim around the mouth
    quad(it[k], it[n], ifl[n], ifl[k]); // cavity wall, facing into the cavity
  }
  quad(ifl[0], ifl[1], ifl[2], ifl[3]); // the cavity floor, facing up
  return tris;
}

/**
 * A closed loop of solid rod: a square cross-section swept once around a
 * circle, so it is solid material the whole way with no cavity anywhere — and
 * genus 1. The counter-example to reading "genus 1" as "there is a wall".
 * This is the shape of an anastomosis, or of any circuit in a vessel network.
 */
function solidLoop({ radius = 4, thick = 0.5, segments = 24 } = {}) {
  const corners = [[-thick, -thick], [thick, -thick], [thick, thick], [-thick, thick]];
  const at = (i, j) => {
    const a = (2 * Math.PI * (i % segments)) / segments;
    const [du, dz] = corners[j % 4];
    return [(radius + du) * Math.cos(a), (radius + du) * Math.sin(a), dz];
  };
  const tris = [];
  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < 4; j += 1) {
      const [a, b, c, d] = [at(i, j), at(i, j + 1), at(i + 1, j + 1), at(i + 1, j)];
      tris.push([a, b, c], [a, c, d]);
    }
  }
  return tris;
}

/** One triangle. Open, and the standing counter-example for signed volume. */
const openTriangle = (dz = 0) => [[[0, 0, dz], [1, 0, dz], [0, 1, dz]]];

const translate = (triangles, [dx, dy, dz]) =>
  triangles.map((t) => t.map(([x, y, z]) => [x + dx, y + dy, z + dz]));

/** A closed tetrahedron, plus one of its faces repeated: 3 non-manifold edges, 0 boundary. */
function tetrahedronWithRepeatedFace() {
  const v = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]];
  const faces = [[0, 2, 1], [0, 1, 3], [0, 3, 2], [1, 2, 3]];
  const tris = faces.map(([a, b, c]) => [v[a], v[b], v[c]]);
  return [...tris, tris[3]];
}

// ---------------------------------------------------------------------------
// edge classes

test('metrics: boundary edges and non-manifold edges are different defects', () => {
  const closed = edgeClasses(box([0, 0, 0], [1, 1, 1]));
  assert.equal(closed.boundary, 0);
  assert.equal(closed.nonManifold, 0);
  assert.equal(closed.manifold, 18, 'a box has 18 edges after triangulation');
  assert.equal(isClosedManifold(closed), true);

  const sheet = edgeClasses(openTriangle());
  assert.equal(sheet.boundary, 3, 'one triangle is three boundary edges');
  assert.equal(sheet.nonManifold, 0);
  assert.equal(isClosedManifold(sheet), false);

  // The counter-example the review raised: a closed tetrahedron with one face
  // repeated has **no** boundary edges and three non-manifold ones. The old
  // code counted every edge whose use-count was not 2 and called the total
  // "boundary edges", reporting 3.
  const repeated = edgeClasses(tetrahedronWithRepeatedFace());
  assert.equal(repeated.boundary, 0, 'nothing here is a rim');
  assert.equal(repeated.nonManifold, 3, 'three edges are used by three triangles');
  assert.equal(isClosedManifold(repeated), false, 'closed is not enough — it must be manifold too');
});

test('metrics: a degenerate triangle contributes no edges and is counted', () => {
  const degenerate = [[[0, 0, 0], [1, 0, 0], [1, 0, 0]]];
  const classes = edgeClasses(degenerate);
  assert.equal(classes.degenerateTriangles, 1);
  assert.equal(classes.edges, 0);
  assert.equal(classes.boundary, 0);
});

test('metrics: the weld tolerance is part of the answer, and is reported with it', () => {
  // Two triangles that share an edge only if 1 mm counts as the same point.
  const a = [[0, 0, 0], [1, 0, 0], [0, 1, 0]];
  const b = [[0.0005, 0, 0], [1.0005, 0, 0], [0.5, -1, 0]];
  const fine = edgeClasses([a, b], 1e-6);
  const coarse = edgeClasses([a, b], 1e-2);
  assert.equal(fine.vertices, 6);
  assert.ok(coarse.vertices < fine.vertices, 'a coarser weld merges them');
  assert.equal(fine.weld, 1e-6, 'and every result says which tolerance produced it');
  assert.equal(coarse.weld, 1e-2);
});

// ---------------------------------------------------------------------------
// the wall-thickness question

test('metrics: a ray from inside cannot tell a solid from a shell — the withdrawn rule', () => {
  // This is the flaw, fixed in place as a test so that the rule cannot come
  // back. From **inside**, a solid crosses one surface and a shell crosses two.
  const solid = box([0, 0, 0], [1, 1, 1]);
  const shell = hollowShell();
  const spread = directions(64);

  const fromInside = (triangles) => {
    const counts = new Set();
    for (const d of spread) counts.add(rayHits(triangles, [0, 0, 0], d).length);
    return [...counts];
  };
  assert.deepEqual(fromInside(solid), [1], 'a solid: one crossing on the way out');
  assert.deepEqual(fromInside(shell), [2], 'a shell: two — which the old rule read as "one surface"');
});

test('metrics: a complete transversal gives the counts the rule is about', () => {
  const spread = directions(64);
  const counts = (triangles) => {
    const seen = new Set();
    for (const d of spread) seen.add(transversalCrossings(triangles, [0, 0, 0], d));
    return [...seen].sort((a, b) => a - b);
  };
  assert.deepEqual(counts(box([0, 0, 0], [1, 1, 1])), [2], 'solid: in and out');
  assert.deepEqual(counts(hollowShell()), [4], 'shell: outer, inner, inner, outer');
});

test('metrics: four crossings do not prove a wall', () => {
  // A line across a pipe crosses it four times — and so does a line across two
  // separate solids, which have no wall between them at all.
  const pipe = squarePipe();
  assert.equal(transversalCrossings(pipe, [0, 0, 0], [1, 0, 0]), 4);
  const twoSolids = [...squareRod({ outer: 0.4, half: 2 }), ...translate(squareRod({ outer: 0.4, half: 2 }), [2, 0, 0])];
  assert.equal(transversalCrossings(twoSolids, [1, 0, 0], [1, 0, 0]), 4, 'two solids on one line: also four');
  assert.equal(eulerCharacteristic(twoSolids).genus, null, 'and they are two components, so genus is withheld');
});

test('metrics: genus does not prove a wall either — the withdrawn second rule', () => {
  // The first attempt read a ray count as a wall; the replacement read the
  // genus as one. Both are withdrawn. Genus counts handles in the surface, and
  // it is wrong in **both** directions about walls.

  // Direction one — a wall, and genus 0. A cup: a cavity that reaches the
  // outside through one mouth is topologically a ball. The wall is 1 unit
  // thick and the floor 0.5, and every topological test passes cleanly.
  const cup = eulerCharacteristic(squareCup());
  assert.equal(isClosedManifold(cup), true, 'closed and manifold');
  assert.equal(cup.components, 1);
  assert.equal(cup.boundary, 0);
  assert.equal(cup.nonManifold, 0);
  assert.equal(cup.degenerateTriangles, 0);
  assert.equal(cup.vertices, 16);
  assert.equal(cup.edges, 42);
  assert.equal(cup.faces, 28);
  assert.equal(cup.chi, 2);
  assert.equal(cup.genus, 0, 'a wall and a floor, and still genus 0');
  // 4x4x4 outer, less a 2x2 cavity 3.5 deep: 64 − 14.
  assert.ok(Math.abs(signedVolume(squareCup()) - 50) < 1e-9, 'and it encloses 50, not 64');

  // Direction two — no wall anywhere, and genus 1. A closed loop of solid rod
  // is solid material the whole way round; the hole is the middle of the ring,
  // not a lumen. This is the shape of an anastomosis.
  const loop = eulerCharacteristic(solidLoop());
  assert.equal(isClosedManifold(loop), true);
  assert.equal(loop.components, 1);
  assert.equal(loop.chi, 0);
  assert.equal(loop.genus, 1, 'solid throughout, and still genus 1');

  // For contrast, the two shapes the earlier rule was built from. They do
  // differ in genus — the rule was not arbitrary — but the cup and the loop
  // above show the difference is about handles, not about walls.
  assert.equal(eulerCharacteristic(squareRod()).genus, 0);
  assert.equal(eulerCharacteristic(squarePipe()).genus, 1);

  // Which leaves the actual question unanswered, and that is the finding: no
  // metric in this module decides whether a mesh represents a wall.
});

test('metrics: a ray along a shared edge is one crossing, not two', () => {
  // Found by the fixture above. The x-axis leaves a box exactly along the
  // diagonal where the two triangles of its end face meet, so the raw
  // triangle-hit count is four for a shape that is crossed twice. Counting
  // triangle hits rather than surface crossings inflated it.
  const cube = box([0, 0, 0], [1, 1, 1]);
  assert.equal(transversalCrossings(cube, [0, 0, 0], [1, 0, 0]), 2, 'down the axis, through both diagonals');
  assert.equal(rayHits(cube, [0, 0, 0], [1, 0, 0]).length, 1, 'and one on the way out from inside');

  // A direction that misses the diagonals gives the same answer, which is the
  // point: the count should not depend on where the triangulation put its seams.
  assert.equal(transversalCrossings(cube, [0, 0, 0], [0.31, 0.57, 0.76]), 2);
});

test('metrics: genus is withheld for anything it cannot describe', () => {
  assert.equal(eulerCharacteristic(openTriangle()).genus, null, 'open');
  assert.equal(eulerCharacteristic(tetrahedronWithRepeatedFace()).genus, null, 'non-manifold');
  const two = [...box([0, 0, 0], [1, 1, 1]), ...box([5, 0, 0], [1, 1, 1])];
  assert.equal(eulerCharacteristic(two).components, 2);
  assert.equal(eulerCharacteristic(two).genus, null, 'two components: χ is their sum, so genus is not one number');
});

test('metrics: components are found through shared welded vertices', () => {
  const one = connectedComponents(box([0, 0, 0], [1, 1, 1]));
  assert.equal(one.length, 1);
  assert.equal(one[0].length, 12);
  const two = connectedComponents([...box([0, 0, 0], [1, 1, 1]), ...box([9, 0, 0], [1, 1, 1])]);
  assert.equal(two.length, 2);
  assert.deepEqual(two.map((c) => c.length).sort(), [12, 12]);
});

// ---------------------------------------------------------------------------
// volume

test('metrics: the signed sum is a volume only where its preconditions hold', () => {
  const cube = box([0, 0, 0], [1, 1, 1]);
  assert.ok(Math.abs(signedVolume(cube) - 8) < 1e-9, 'a 2x2x2 cube encloses 8');
  // Translation-invariant when closed — which is what makes it a volume.
  assert.ok(Math.abs(signedVolume(translate(cube, [7, -3, 2])) - 8) < 1e-9);
  // The shell encloses its outer box minus its inner one: 8 − 1.728.
  assert.ok(Math.abs(signedVolume(hollowShell()) - (8 - 1.728)) < 1e-9);

  // And the counter-example: an open surface's sum moves when the shape moves,
  // so it is not an enclosed volume and must not be called one.
  assert.equal(signedVolume(openTriangle()), 0);
  const moved = signedVolume(translate(openTriangle(), [0, 0, 1]));
  assert.ok(Math.abs(moved - 1 / 6) < 1e-12, 'the same triangle, one unit away, sums to 1/6');
  assert.notEqual(signedVolume(openTriangle()), moved);
});

test('metrics: winding decides the sign, and the caller decides what that means', () => {
  const outward = box([0, 0, 0], [1, 1, 1]);
  const inward = box([0, 0, 0], [1, 1, 1], { flip: true });
  assert.ok(signedVolume(outward) > 0);
  assert.ok(Math.abs(signedVolume(inward) + signedVolume(outward)) < 1e-9, 'flipped: same size, opposite sign');
});

// ---------------------------------------------------------------------------
// distance between meshes

test('metrics: the junction number is a vertex distance and is named as one', () => {
  const a = box([0, 0, 0], [1, 1, 1]);
  const b = box([3, 0, 0], [1, 1, 1]);
  const apart = nearestSampledVertexDistance(a, b);
  assert.ok(Math.abs(apart.distance - 1) < 1e-9, 'nearest corners are 1 apart');
  assert.equal(apart.sampledA, 8);
  assert.equal(apart.sampledB, 8);

  const touching = nearestSampledVertexDistance(a, box([2, 0, 0], [1, 1, 1]));
  assert.equal(touching.distance, 0, 'sharing a corner reads as zero');

  // Why the name matters: these two interpenetrate deeply and no vertex of one
  // is near a vertex of the other, so the number is large while the surfaces
  // are anything but far apart.
  const big = box([0, 0, 0], [4, 4, 4]);
  const tiny = box([0, 0, 0], [0.1, 0.1, 0.1]);
  const nested = nearestSampledVertexDistance(big, tiny);
  assert.ok(nested.distance > 6, `nested shapes report ${nested.distance.toFixed(2)}, not 0`);
});

// ---------------------------------------------------------------------------
// the odds and ends

test('metrics: the direction spread is deterministic and covers the sphere', () => {
  const a = directions(32);
  const b = directions(32);
  assert.deepEqual(a, b, 'same every run');
  for (const d of a) assert.ok(Math.abs(Math.hypot(...d) - 1) < 1e-9, 'unit length');
  const ys = a.map((d) => d[1]);
  assert.ok(Math.min(...ys) < -0.9 && Math.max(...ys) > 0.9, 'both poles are sampled');
});

test('metrics: the surface centroid is area-weighted, not vertex-weighted', () => {
  // A big triangle and a small one. Vertex-averaging would pull the answer
  // towards whichever has more vertices; area-weighting does not.
  const big = [[[0, 0, 0], [10, 0, 0], [0, 10, 0]]];
  const small = [[[100, 0, 0], [100.1, 0, 0], [100, 0.1, 0]]];
  const centroid = surfaceCentroid([...big, ...small]);
  assert.ok(centroid[0] < 5, `area-weighted centroid stays near the big triangle (${centroid[0].toFixed(2)})`);
});
