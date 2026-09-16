import * as THREE from 'three';

/**
 * The face a plane leaves when it cuts a closed mesh.
 *
 * A clipping plane removes fragments and closes nothing, so a cut organ built
 * from shells is a set of open shells seen from the inside: the transverse
 * liver had eight of them with the portal branches as stubs floating in the
 * gap, and the coronal lung was a pair of translucent domes. The viewpoint
 * says the organ has been cut; what was drawn was the organ with its front
 * deleted. This builds the missing surface.
 *
 * ## Why not the stencil
 *
 * The usual answer is the stencil count — render each solid's back faces
 * incrementing and its front faces decrementing, and a quad is drawn wherever
 * the result is non-zero. It was written first and then measured: on the
 * kidney's coronal view it took the headless renderer from 4.6 fps to 0.4,
 * because it rasterises every crossed structure twice more, every frame,
 * forever, to re-answer a question about a plane that has not moved. Here the
 * cross-section is computed once, from the triangles, and drawn as an ordinary
 * mesh.
 *
 * ## What it assumes, and what happens when the assumption is wrong
 *
 * The mesh has to be closed for the cut to be a closed loop. The organ parts
 * in this repository are carved as closed solids out of one field
 * (`carve.js`), so they are — but a builder is free to hand over a ribbon or a
 * surface with a boundary, and for one of those the loop walk ends in the
 * middle of nowhere. That case returns `null` rather than a guess: no face is
 * an obvious absence, and a face closed across a hole that is not there is a
 * claim about anatomy nobody made.
 */

/**
 * @param {THREE.BufferGeometry} geometry a closed mesh, in its own coordinates
 * @param {THREE.Plane} plane the cut, in the same coordinates
 * @param {{tolerance?: number}} [options] how close two loop ends must be to be
 *   the same point. Defaults to a millionth of the geometry's own size, so it
 *   scales with the model rather than with the units it happens to be in.
 * @returns {THREE.BufferGeometry|null} the face, with flat normals pointing out
 *   of the half the cut keeps, or `null` when there is nothing to draw
 */
export function sectionFaceGeometry(geometry, plane, { tolerance } = {}) {
  const position = geometry?.attributes?.position;
  if (!position) return null;

  geometry.computeBoundingSphere();
  const size = geometry.boundingSphere?.radius ?? 0;
  if (!(size > 0)) return null;
  const epsilon = Math.max(size * 1e-9, Number.EPSILON);
  const weld = tolerance ?? size * 1e-6;

  const segments = crossingSegments(geometry, plane, epsilon);
  if (!segments.length) return null;

  const loops = chainLoops(segments, weld);
  if (!loops) return null;

  // A basis on the plane, so the triangulator can work in two dimensions. Any
  // pair will do; this one is stable — it never picks an axis the normal is
  // nearly parallel to, which is where the cross product loses its precision.
  const normal = plane.normal.clone().normalize();
  const seed = Math.abs(normal.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const u = seed.clone().cross(normal).normalize();
  const v = normal.clone().cross(u).normalize();
  const origin = normal.clone().multiplyScalar(-plane.constant);

  const flat = loops.map((loop) =>
    loop.map((point) => {
      const offset = point.clone().sub(origin);
      return new THREE.Vector2(offset.dot(u), offset.dot(v));
    })
  );

  const rings = flat
    .map((points, index) => ({ points, index, area: signedArea(points) }))
    .filter((ring) => Math.abs(ring.area) > weld * weld)
    // Largest first, so a ring is only ever tested against rings that could
    // contain it.
    .sort((a, b) => Math.abs(b.area) - Math.abs(a.area));
  if (!rings.length) return null;

  // Odd depth is a hole: a ring inside one ring is a hole in it, a ring inside
  // that hole is solid again — an eye inside an island inside a lake.
  const outers = [];
  for (const ring of rings) {
    let depth = 0;
    let parent = null;
    for (const other of rings) {
      if (other === ring) continue;
      if (Math.abs(other.area) <= Math.abs(ring.area)) continue;
      if (!containsPoint(other.points, ring.points[0])) continue;
      depth += 1;
      if (!parent || Math.abs(other.area) < Math.abs(parent.area)) parent = other;
    }
    ring.depth = depth;
    if (depth % 2 === 0) {
      ring.holes = [];
      outers.push(ring);
    } else {
      parent?.holes?.push(ring);
    }
  }

  const vertices = [];
  for (const outer of outers) {
    // The triangulator wants the outline one way round and its holes the
    // other; a ring handed over backwards comes back as a triangulation of the
    // space around it.
    const contour = outer.area > 0 ? outer.points : [...outer.points].reverse();
    const holes = (outer.holes ?? []).map((hole) => (hole.area < 0 ? hole.points : [...hole.points].reverse()));
    const all = [...contour, ...holes.flat()];
    const faces = THREE.ShapeUtils.triangulateShape(contour, holes);
    for (const face of faces) {
      for (const index of face) {
        const point = all[index];
        if (!point) continue;
        vertices.push(
          origin.x + u.x * point.x + v.x * point.y,
          origin.y + u.y * point.x + v.y * point.y,
          origin.z + u.z * point.x + v.z * point.y
        );
      }
    }
  }
  if (vertices.length < 9) return null;

  const face = new THREE.BufferGeometry();
  face.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  // The solid is on the side the normal points into, so the face it leaves
  // looks the other way — at the reader, who is standing where the cut half
  // used to be.
  const outward = normal.clone().negate();
  const normals = new Float32Array(vertices.length);
  for (let i = 0; i < normals.length; i += 3) {
    normals[i] = outward.x;
    normals[i + 1] = outward.y;
    normals[i + 2] = outward.z;
  }
  face.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return face;
}

/** Where each triangle crosses the plane, as unordered segments. */
function crossingSegments(geometry, plane, epsilon) {
  const position = geometry.attributes.position;
  const index = geometry.index;
  const count = index ? index.count : position.count;
  const segments = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();

  for (let i = 0; i < count; i += 3) {
    const ia = index ? index.getX(i) : i;
    const ib = index ? index.getX(i + 1) : i + 1;
    const ic = index ? index.getX(i + 2) : i + 2;
    a.fromBufferAttribute(position, ia);
    b.fromBufferAttribute(position, ib);
    c.fromBufferAttribute(position, ic);

    const corners = [a, b, c];
    const distances = corners.map((corner) => {
      const d = plane.distanceToPoint(corner);
      return Math.abs(d) < epsilon ? 0 : d;
    });

    // A triangle lying in the plane contributes no edge to the outline: its
    // own edges are shared with the triangles either side of it, which do.
    if (distances.every((d) => d === 0)) continue;
    if (distances.every((d) => d >= 0) && distances.some((d) => d > 0) && !distances.includes(0)) continue;
    if (distances.every((d) => d <= 0) && distances.some((d) => d < 0) && !distances.includes(0)) continue;

    const points = [];
    for (let edge = 0; edge < 3; edge += 1) {
      const from = corners[edge];
      const to = corners[(edge + 1) % 3];
      const dFrom = distances[edge];
      const dTo = distances[(edge + 1) % 3];
      if (dFrom === 0) points.push(from.clone());
      if (dFrom === 0 || dTo === 0) continue;
      if ((dFrom > 0) === (dTo > 0)) continue;
      points.push(from.clone().lerp(to, dFrom / (dFrom - dTo)));
    }
    if (points.length !== 2) continue;
    if (points[0].distanceToSquared(points[1]) === 0) continue;
    segments.push(points);
  }
  return segments;
}

/**
 * Walk the segments into closed loops.
 *
 * Returns `null` the moment a walk cannot be closed: an open mesh, a cut that
 * runs off the edge of a surface, or a tolerance too tight for the mesh it was
 * given. All three mean the same thing here — this is not a cut through a
 * solid — and all three are better reported than patched over.
 */
function chainLoops(segments, weld) {
  const key = (point) => `${Math.round(point.x / weld)},${Math.round(point.y / weld)},${Math.round(point.z / weld)}`;

  // An edge that lies *in* the plane belongs to two triangles, one on each
  // side, and both hand it over — the equator of a sphere tessellated with a
  // ring of vertices on it is every edge of the outline, twice. Walked as
  // written, the second copy closes a two-point loop over the first and the
  // whole cut comes back empty. One edge is one edge.
  const seen = new Set();
  const unique = [];
  for (const segment of segments) {
    const ends = [key(segment[0]), key(segment[1])].sort().join('|');
    if (seen.has(ends)) continue;
    seen.add(ends);
    unique.push(segment);
  }
  segments = unique;

  const at = new Map();
  const add = (point, segment) => {
    const id = key(point);
    if (!at.has(id)) at.set(id, []);
    at.get(id).push(segment);
  };
  for (const segment of segments) {
    add(segment[0], segment);
    add(segment[1], segment);
  }

  const used = new Set();
  const loops = [];
  for (const segment of segments) {
    if (used.has(segment)) continue;
    used.add(segment);
    const loop = [segment[0], segment[1]];
    const startId = key(segment[0]);
    let endId = key(segment[1]);

    while (endId !== startId) {
      const next = (at.get(endId) ?? []).find((candidate) => !used.has(candidate));
      if (!next) return null;
      used.add(next);
      const head = key(next[0]) === endId ? next[1] : next[0];
      loop.push(head);
      endId = key(head);
      if (loop.length > segments.length + 2) return null;
    }
    loop.pop();
    if (loop.length >= 3) loops.push(loop);
  }
  return loops.length ? loops : null;
}

/** Twice the signed area; positive is counter-clockwise in the plane's basis. */
function signedArea(points) {
  let total = 0;
  for (let i = 0; i < points.length; i += 1) {
    const from = points[i];
    const to = points[(i + 1) % points.length];
    total += from.x * to.y - to.x * from.y;
  }
  return total / 2;
}

/** Even-odd crossing test, in the plane's own two dimensions. */
function containsPoint(polygon, point) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    if ((a.y > point.y) === (b.y > point.y)) continue;
    if (point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
