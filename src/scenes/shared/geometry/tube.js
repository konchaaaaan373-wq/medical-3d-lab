import * as THREE from 'three';
import { createRandom } from '../../../utils/math.js';

/**
 * A tube whose radius can change every frame.
 *
 * Three's own `TubeGeometry` bakes the radius in, which is exactly the thing a
 * hollow organ has to be able to move: peristalsis is a travelling constriction,
 * a contracting muscle belly is a bulge, a filling ureter is a local dilation.
 * This keeps the curve frames and the base radius, and rewrites the positions
 * from a modifier function.
 *
 * Everything runs on the CPU. At the sizes used here (a few thousand vertices
 * per organ) that is far cheaper than it sounds and keeps the shape readable
 * from the code rather than hidden in a shader.
 */
export class TubeSurface {
  /**
   * @param {THREE.Curve<THREE.Vector3>} curve
   * @param {{ radius?: (u: number) => number, steps?: number, radial?: number,
   *           arc?: number, arcStart?: number }} [options]
   */
  constructor(curve, { radius = () => 0.3, steps = 96, radial = 18, arc = Math.PI * 2, arcStart = 0 } = {}) {
    this.curve = curve;
    this.steps = steps;
    this.radial = radial;
    this.arc = arc;
    this.arcStart = arcStart;
    this.baseRadius = radius;

    this.points = curve.getSpacedPoints(steps);
    const frames = curve.computeFrenetFrames(steps, false);
    this.normals = frames.normals;
    this.binormals = frames.binormals;

    const vertexCount = (steps + 1) * (radial + 1);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(vertexCount * 2), 2));

    const uv = this.geometry.attributes.uv;
    const indices = [];
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j <= radial; j++) {
        uv.setXY(i * (radial + 1) + j, i / steps, j / radial);
        if (i < steps && j < radial) {
          const a = i * (radial + 1) + j;
          const b = (i + 1) * (radial + 1) + j;
          indices.push(a, b, a + 1, b, b + 1, a + 1);
        }
      }
    }
    this.geometry.setIndex(indices);
    this.refresh();
  }

  /**
   * Rewrite the surface.
   * @param {(u: number, base: number) => number} [modifier] u is 0..1 along the tube
   */
  refresh(modifier) {
    const position = this.geometry.attributes.position;
    const { steps, radial, arc, arcStart } = this;
    const point = new THREE.Vector3();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const base = this.baseRadius(u);
      const r = Math.max(0.0005, modifier ? modifier(u, base) : base);
      const centre = this.points[i];
      const normal = this.normals[i];
      const binormal = this.binormals[i];
      for (let j = 0; j <= radial; j++) {
        const angle = arcStart + (j / radial) * arc;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        point.set(
          centre.x + r * (cos * normal.x + sin * binormal.x),
          centre.y + r * (cos * normal.y + sin * binormal.y),
          centre.z + r * (cos * normal.z + sin * binormal.z)
        );
        position.setXYZ(i * (radial + 1) + j, point.x, point.y, point.z);
      }
    }
    position.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
  }

  /** Point on the centre line, for hanging a label or a particle stream off. */
  pointAt(u) {
    return this.curve.getPointAt(Math.min(1, Math.max(0, u))).clone();
  }

  dispose() {
    this.geometry.dispose();
  }
}

/**
 * A calibre profile as a smooth function of position along a tube.
 *
 * `points` are `[u, radius]` control points. Interpolating them linearly — or
 * writing the profile as a chain of `if` branches, which is the same thing —
 * leaves a slope discontinuity at every control point, and a swept surface
 * shows each of those as a crease running right round the tube. Smoothstep
 * between neighbours removes them.
 *
 * @param {[number, number][]} points sorted by u
 * @returns {(u: number) => number}
 */
export function smoothProfile(points) {
  return (u) => {
    const t = Math.min(1, Math.max(0, u));
    if (t <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      const [u1, r1] = points[i];
      if (t > u1) continue;
      const [u0, r0] = points[i - 1];
      const k = (t - u0) / (u1 - u0);
      return r0 + (r1 - r0) * k * k * (3 - 2 * k);
    }
    return points[points.length - 1][1];
  };
}

/** A Catmull-Rom curve through `points`, given as `[x, y, z]` triples. */
export function smoothCurve(points, { closed = false, tension = 0.5 } = {}) {
  return new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    closed,
    'catmullrom',
    tension
  );
}

/**
 * A serpentine coil that stays inside a box — the small bowel, folded.
 *
 * Deterministic given `seed`: the loops wander, but they wander the same way on
 * every reload.
 *
 * @param {{ turns?: number, width?: number, height?: number, depth?: number,
 *           seed?: number, jitter?: number }} [options]
 */
export function coilCurve({ turns = 5, width = 2.6, height = 2.4, depth = 1.1, seed = 7, jitter = 0.22 } = {}) {
  const random = createRandom(seed);
  const points = [];
  const rows = turns * 2;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const y = height * (0.5 - t);
    const swing = i % 2 === 0 ? -1 : 1;
    // Each row is also thrown forwards or backwards, alternating out of step
    // with the left-right swing. Without it the coil folds flat and reads as a
    // stack of ribbons rather than as loops of bowel lying over each other.
    const front = i % 4 < 2 ? 1 : -1;
    // Two points per row — the turn-around and the middle of the run — so the
    // spline bulges out at the ends instead of cutting the corner.
    points.push([
      swing * width * (0.5 + (random() - 0.5) * jitter),
      y + (random() - 0.5) * jitter * height * 0.3,
      front * depth * (0.45 + random() * 0.55),
    ]);
    points.push([
      -swing * width * (0.18 + (random() - 0.5) * jitter),
      y - height / rows / 2,
      -front * depth * (0.3 + random() * 0.5),
    ]);
  }
  return smoothCurve(points, { tension: 0.55 });
}
