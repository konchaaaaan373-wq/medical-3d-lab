/**
 * Metrics over a triangle soup, and what each one is actually entitled to say.
 *
 * Pure: an array of triangles in, numbers out. No files, no `three`, no DOM, no
 * global state — so every function here can be run against a shape whose answer
 * is known, which is the whole reason this module exists as a module.
 *
 * ## Why it exists
 *
 * The previous version of this code lived inside the measuring script and was
 * never run against a shape with a known answer. It concluded that no candidate
 * vessel has a modelled wall thickness, from a rule ("two crossings means one
 * surface, four would mean a wall") that belongs to a ray crossing a shape from
 * **outside** while the code cast its ray from **inside**. From inside, a solid
 * gives one and a shell gives two — so the observation could not tell them
 * apart, and the conclusion was withdrawn.
 *
 * The replacement then reached for the same conclusion through the genus, and
 * **that is withdrawn too**: a cup has a wall and genus 0, a loop of solid tube
 * has no wall and genus 1. Wall thickness is not something this module
 * measures. It is left undetermined, and said to be undetermined, rather than
 * inferred from whichever metric happens to be at hand.
 *
 * Every function below therefore states what it can and cannot conclude, and
 * `tests/mesh-metrics.test.js` runs each against shapes whose answers are known
 * before any of it is pointed at a real file.
 *
 * ## The names are the claims
 *
 * A metric named for something it does not measure is the same failure in a
 * different costume, so:
 *
 *  - `edgeClasses` separates **boundary** edges (used once) from
 *    **non-manifold** edges (used three or more times). Counting both as
 *    "boundary edges" reported 3 for a closed tetrahedron with a duplicated
 *    face, which has none.
 *  - `signedVolume` is the divergence-theorem sum. On a **closed, consistently
 *    oriented, non-self-intersecting** mesh that is the enclosed volume. On
 *    anything else it is a number that changes when you translate the shape,
 *    and it is called what it is.
 *  - `nearestSampledVertexDistance` compares **sampled vertex positions**, not
 *    surfaces. Two meshes can interpenetrate with no shared vertex, and two
 *    touching surfaces can have vertices far apart.
 */

// ---------------------------------------------------------------------------
// vectors

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a) => Math.sqrt(dot(a, a));

/**
 * Vertices welded to a grid, so that two positions closer than `weld` are the
 * same vertex.
 *
 * **The tolerance is part of every answer that uses it.** Edge counts move with
 * it — the candidate left coronary artery reports 285 boundary edges welded at
 * 1 µm and 138 at 10 µm — so callers report the tolerance beside the number, and
 * a metric derived from this is never quoted as though it were tolerance-free.
 *
 * The example used to be "the right atrium, 286 at 1 µm and 39 at 10 µm". Those
 * numbers were themselves withdrawn: 286 was boundary, non-manifold and
 * degenerate added together, and the right atrium's boundary count is 3. The
 * illustration is now a case that survived the separation.
 */
export function weldKey(point, weld) {
  const q = 1 / weld;
  return `${Math.round(point[0] * q)},${Math.round(point[1] * q)},${Math.round(point[2] * q)}`;
}

// ---------------------------------------------------------------------------
// topology

/** A triangle with two identical welded corners has no area and no edges to count. */
const degenerate = (keys) => keys[0] === keys[1] || keys[1] === keys[2] || keys[2] === keys[0];

/**
 * How every edge is used, and therefore what kind of surface this is.
 *
 * @returns {{boundary: number, manifold: number, nonManifold: number,
 *   degenerateTriangles: number, triangles: number, vertices: number,
 *   edges: number, weld: number}}
 *
 * `boundary` counts edges used by exactly one triangle — a rim, a hole, a cut
 * end. `nonManifold` counts edges used by three or more — a fin, a duplicated
 * face, two sheets meeting. They are different defects and are not added
 * together.
 */
export function edgeClasses(triangles, weld = 1e-6) {
  const uses = new Map();
  const vertices = new Set();
  let degenerateTriangles = 0;
  for (const triangle of triangles) {
    const keys = triangle.map((p) => weldKey(p, weld));
    if (degenerate(keys)) {
      degenerateTriangles += 1;
      continue;
    }
    for (const key of keys) vertices.add(key);
    for (const [a, b] of [[keys[0], keys[1]], [keys[1], keys[2]], [keys[2], keys[0]]]) {
      const edge = a < b ? `${a}|${b}` : `${b}|${a}`;
      uses.set(edge, (uses.get(edge) ?? 0) + 1);
    }
  }
  let boundary = 0;
  let manifold = 0;
  let nonManifold = 0;
  for (const count of uses.values()) {
    if (count === 1) boundary += 1;
    else if (count === 2) manifold += 1;
    else nonManifold += 1;
  }
  return {
    weld,
    triangles: triangles.length,
    degenerateTriangles,
    vertices: vertices.size,
    edges: uses.size,
    boundary,
    manifold,
    nonManifold,
  };
}

/** Closed **and** manifold: every edge used by exactly two triangles, none used once or thrice. */
export const isClosedManifold = (classes) => classes.boundary === 0 && classes.nonManifold === 0;

/**
 * Euler characteristic V − E + F, and the genus that follows from it.
 *
 * **Only meaningful for a closed, manifold, connected surface**, so `genus` is
 * `null` unless the caller has established that. For such a surface
 * `genus = (2 − χ) / 2`: the number of handles, i.e. of independent
 * through-holes in the surface.
 *
 * ## Genus does not answer the wall-thickness question either
 *
 * An earlier version of this comment said it did — that a solid tube is a ball
 * (genus 0) and a tube with a wall is a solid torus (genus 1), so the genus
 * settles what the ray count could not. **That is withdrawn.** Genus is a
 * property of the surface, not of whether the shape has a cavity, and it fails
 * in both directions:
 *
 *  - **Genus 0 with a wall.** A cup — a cavity that reaches the outside through
 *    one mouth — is topologically a ball. `tests/mesh-metrics.test.js` measures
 *    a square cup with a 1-unit side wall and a 0.5-unit floor: V 16, E 42,
 *    F 28, χ 2, **genus 0**, closed, manifold, one component. A vessel modelled
 *    as a wall whose ends are closed by caps that bridge the wall to *itself*
 *    across the lumen is exactly this shape. So genus 0 is not "no wall".
 *  - **Genus ≥ 1 with no wall.** A closed loop of solid tube — an anastomosis,
 *    a ring, any circuit in a vascular network — is a solid torus with no
 *    cavity anywhere. So genus ≥ 1 is not "there is a wall".
 *
 * The genus is therefore reported as what it is: a count of handles in the
 * surface, useful for saying how complicated the surface is and for noticing
 * that a mesh is not the simple sheet one assumed. **Whether a candidate vessel
 * represents a wall with a thickness is not settled by any metric in this
 * module**, and none of them should be quoted as settling it.
 */
export function eulerCharacteristic(triangles, weld = 1e-6) {
  const classes = edgeClasses(triangles, weld);
  const faces = classes.triangles - classes.degenerateTriangles;
  const chi = classes.vertices - classes.edges + faces;
  const closed = isClosedManifold(classes);
  const components = connectedComponents(triangles, weld).length;
  return {
    ...classes,
    faces,
    chi,
    components,
    // Genus is defined per connected closed surface; for several components χ
    // is their sum, so it is only reported when there is exactly one.
    genus: closed && components === 1 ? (2 - chi) / 2 : null,
  };
}

/** Triangle indices grouped into components connected through shared welded vertices. */
export function connectedComponents(triangles, weld = 1e-6) {
  const owner = new Map();
  const parent = [];
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a, b) => {
    const [ra, rb] = [find(a), find(b)];
    if (ra !== rb) parent[rb] = ra;
  };
  triangles.forEach((triangle, index) => {
    parent[index] = index;
    for (const point of triangle) {
      const key = weldKey(point, weld);
      if (owner.has(key)) union(owner.get(key), index);
      else owner.set(key, index);
    }
  });
  const groups = new Map();
  triangles.forEach((_, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(index);
  });
  return [...groups.values()];
}

// ---------------------------------------------------------------------------
// volume

/**
 * The divergence-theorem sum over the triangles, in the cube of the input unit.
 *
 * **This is the enclosed volume only when the mesh is closed, manifold,
 * consistently oriented and not self-intersecting.** Otherwise it is a number
 * that depends on where the shape is: one open triangle sums to 0 at the
 * origin and to 0.167 m³ after being moved a metre along z. The caller decides
 * whether the preconditions hold; this function only computes.
 */
export function signedVolume(triangles) {
  let sum = 0;
  for (const [a, b, c] of triangles) {
    sum += (a[0] * (b[1] * c[2] - b[2] * c[1])
      - a[1] * (b[0] * c[2] - b[2] * c[0])
      + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
  }
  return sum;
}

// ---------------------------------------------------------------------------
// rays

/**
 * Möller–Trumbore. Every crossing beyond `epsilon`, unculled, as distances.
 *
 * Returned sorted, and **de-duplicated at `merge`**, because a ray that passes
 * exactly along an edge shared by two triangles is one crossing of the surface
 * and two hits of triangles. Without that, a ray straight down the axis of a
 * box counts four crossings instead of two — the box's end faces are each two
 * triangles meeting on a diagonal, and the axis goes through the diagonal.
 *
 * Crossing counts are fragile in exactly this way, which is one more reason
 * they are read here alongside the topology rather than on their own.
 */
export function rayHits(triangles, origin, direction, epsilon = 1e-9, merge = 1e-9) {
  const hits = [];
  for (const [a, b, c] of triangles) {
    const e1 = sub(b, a);
    const e2 = sub(c, a);
    const h = cross(direction, e2);
    const det = dot(e1, h);
    if (Math.abs(det) < 1e-14) continue;
    const f = 1 / det;
    const s = sub(origin, a);
    const u = f * dot(s, h);
    if (u < 0 || u > 1) continue;
    const q = cross(s, e1);
    const v = f * dot(direction, q);
    if (v < 0 || u + v > 1) continue;
    const t = f * dot(e2, q);
    if (t > epsilon) hits.push(t);
  }
  hits.sort((x, y) => x - y);
  const crossings = [];
  for (const t of hits) {
    if (crossings.length && Math.abs(t - crossings[crossings.length - 1]) <= merge) continue;
    crossings.push(t);
  }
  return crossings;
}

/**
 * Crossings along a **complete transversal**: a line through the shape, counted
 * from far enough outside that the whole shape is ahead of the ray.
 *
 * This is the count the "two versus four" rule is about, and casting from
 * inside — which is what the withdrawn measurement did — is why that rule was
 * misapplied. Even so, **four crossings do not prove a wall**: a line through a
 * bent solid tube crosses it four times as well, and so does a line through two
 * separate solids. It is a description of one line through one shape. **Nothing
 * here, alone or combined with the genus, decides whether there is a wall** —
 * the genus reading was withdrawn too, for the reasons under
 * `eulerCharacteristic`.
 */
export function transversalCrossings(triangles, through, direction) {
  const size = boundingRadius(triangles, through) * 4 + 1;
  const origin = [
    through[0] - direction[0] * size,
    through[1] - direction[1] * size,
    through[2] - direction[2] * size,
  ];
  return rayHits(triangles, origin, direction).length;
}

/** Distance from a point to the furthest vertex — how far "outside" has to be. */
export function boundingRadius(triangles, from = [0, 0, 0]) {
  let far = 0;
  for (const triangle of triangles) {
    for (const point of triangle) far = Math.max(far, length(sub(point, from)));
  }
  return far;
}

/** Area-weighted centroid of the surface. Not the centroid of the enclosed solid. */
export function surfaceCentroid(triangles) {
  let area = 0;
  const sum = [0, 0, 0];
  for (const [a, b, c] of triangles) {
    const weight = length(cross(sub(b, a), sub(c, a))) / 2;
    if (!weight) continue;
    area += weight;
    for (let i = 0; i < 3; i += 1) sum[i] += ((a[i] + b[i] + c[i]) / 3) * weight;
  }
  if (!area) return [0, 0, 0];
  return [sum[0] / area, sum[1] / area, sum[2] / area];
}

/** A deterministic spread of directions over the sphere (Fibonacci). */
export function directions(count) {
  const out = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (2 * i + 1) / count;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const a = i * golden;
    out.push([Math.cos(a) * r, y, Math.sin(a) * r]);
  }
  return out;
}

// ---------------------------------------------------------------------------
// distance between two meshes

/**
 * The smallest distance between a **sampled vertex** of one mesh and a sampled
 * vertex of the other, with each mesh's vertices de-duplicated at `weld`.
 *
 * Named for what it is. It is **not** the distance between the surfaces: two
 * meshes can interpenetrate without sharing a vertex, and two surfaces that
 * touch along a face can have their nearest vertices far apart. A result of
 * 0 mm means two sampled vertices coincide to the weld tolerance — not that the
 * surfaces are continuous, joined, or watertight across the junction.
 */
export function nearestSampledVertexDistance(a, b, weld = 1e-5) {
  const points = (triangles) => {
    const seen = new Set();
    const out = [];
    for (const triangle of triangles) {
      for (const point of triangle) {
        const key = weldKey(point, weld);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(point);
      }
    }
    return out;
  };
  const left = points(a);
  const right = points(b);
  let best = Infinity;
  for (const p of left) {
    for (const q of right) {
      const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
      if (d < best) best = d;
    }
  }
  return { distance: Math.sqrt(best), weld, sampledA: left.length, sampledB: right.length };
}
