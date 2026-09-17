import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { sectionFaceGeometry } from '../src/scenes/shared/geometry/sectionFace.js';

/**
 * The face a cut leaves, measured against shapes whose cross-section is known
 * before the code runs.
 *
 * A cap is the one piece of geometry in this repository that can be checked
 * against arithmetic rather than against a picture: a sphere cut through its
 * centre leaves a disc of πr², a box cut across leaves a rectangle, and a tube
 * leaves an annulus. If the triangulation drops a hole or closes a loop the
 * wrong way round, the area says so.
 */

/** The area of a triangle soup, which is what a cap is. */
function areaOf(geometry) {
  const position = geometry.attributes.position;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let total = 0;
  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    c.fromBufferAttribute(position, i + 2);
    total += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
  }
  return total;
}

const onPlane = (geometry, plane, tolerance = 1e-6) => {
  const position = geometry.attributes.position;
  const point = new THREE.Vector3();
  for (let i = 0; i < position.count; i += 1) {
    point.fromBufferAttribute(position, i);
    if (Math.abs(plane.distanceToPoint(point)) > tolerance) return false;
  }
  return true;
};

test('a sphere cut through the middle leaves a disc', () => {
  const geometry = new THREE.SphereGeometry(1, 64, 48);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const face = sectionFaceGeometry(geometry, plane);
  assert.ok(face, 'the cut has a face');
  assert.ok(onPlane(face, plane), 'every vertex is on the plane');
  // A 64-segment ring inscribes 99.8 % of the circle it approximates, and the
  // cut is that ring — so the area is the polygon's, not π exactly.
  assert.ok(Math.abs(areaOf(face) - Math.PI) < 0.01, `area ${areaOf(face).toFixed(4)} ≈ π`);
});

test('the face is where the plane is, not where the middle of the shape is', () => {
  const geometry = new THREE.SphereGeometry(1, 64, 48);
  // z = 0.6 through a unit sphere: radius² = 1 − 0.36.
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.6);
  const face = sectionFaceGeometry(geometry, plane);
  assert.ok(face, 'the cut has a face');
  assert.ok(onPlane(face, plane), 'on the plane it was given');
  assert.ok(Math.abs(areaOf(face) - Math.PI * 0.64) < 0.01, `area ${areaOf(face).toFixed(4)} ≈ 0.64π`);
});

test('the face looks at the half the cut took away', () => {
  const geometry = new THREE.BoxGeometry(2, 2, 2);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const face = sectionFaceGeometry(geometry, plane);
  assert.ok(face, 'the cut has a face');
  const normal = new THREE.Vector3().fromBufferAttribute(face.attributes.normal, 0);
  // The solid is kept where the normal points; the surface it leaves faces the
  // other way, at the reader standing where the removed half was.
  assert.ok(normal.dot(plane.normal) < -0.999, 'the face points out of the solid');
  assert.ok(Math.abs(areaOf(face) - 4) < 1e-6, 'a 2×2 box cut across leaves 4');
});

test('a tube leaves a ring, not a disc', () => {
  // Two closed shells, one inside the other, is how this repository draws a
  // wall: the cap has to keep the lumen open.
  const outer = new THREE.CylinderGeometry(1, 1, 2, 64);
  const inner = new THREE.CylinderGeometry(0.5, 0.5, 2, 64);
  const merged = mergeAsShells(outer, inner);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const face = sectionFaceGeometry(merged, plane);
  assert.ok(face, 'the cut has a face');
  const expected = Math.PI * (1 - 0.25);
  assert.ok(Math.abs(areaOf(face) - expected) < 0.02, `area ${areaOf(face).toFixed(4)} ≈ π(1² − 0.5²)`);
});

test('a plane that misses the shape leaves nothing, and says so', () => {
  const geometry = new THREE.SphereGeometry(1, 32, 24);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -4);
  assert.equal(sectionFaceGeometry(geometry, plane), null, 'no crossing, no face');
});

test('an open surface gets no face rather than an invented one', () => {
  // A ribbon is not a solid. Closing the walk across its boundary would draw a
  // face over a hole that is part of the model.
  const geometry = new THREE.PlaneGeometry(2, 2, 4, 4).rotateX(Math.PI / 2);
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  assert.equal(sectionFaceGeometry(geometry, plane), null, 'an open mesh has no closed cut');
});

/** Two shells in one geometry, the way a wall with a lumen is drawn. */
function mergeAsShells(a, b) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  for (const source of [a.toNonIndexed(), b.toNonIndexed()]) {
    const attribute = source.attributes.position;
    for (let i = 0; i < attribute.count; i += 1) {
      positions.push(attribute.getX(i), attribute.getY(i), attribute.getZ(i));
    }
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geometry;
}
