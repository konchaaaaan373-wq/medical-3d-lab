import * as THREE from 'three';
import { createRandom } from '../../../utils/math.js';
import { particleMaterial } from '../materials.js';

/**
 * A stream of particles running along one or more paths.
 *
 * This is the prototype scenes' answer to "show me that something is moving
 * through here": portal blood crossing the liver, filtrate leaving the kidney,
 * hormone leaving a follicle, red cells threading the splenic cords.
 *
 * It is a *representation of direction and rate*, not a flow solution. Nothing
 * here computes velocity from pressure — `speed` and `rate` are presentation
 * values and are named so that they cannot be mistaken for clinical ones. A
 * scene that wants real flow has outgrown this helper.
 *
 * @param {{ curves: THREE.Curve<THREE.Vector3>[], count?: number, color?: string,
 *           size?: number, speed?: number, spread?: number, seed?: number,
 *           opacity?: number, samples?: number }} options
 */
export function createFlowStream({
  curves,
  count = 160,
  color = '#7fe3ff',
  size = 6.5,
  speed = 0.22,
  spread = 0.1,
  seed = 11,
  opacity = 0.85,
  samples = 160,
}) {
  const random = createRandom(seed);
  // Each path is sampled once into a polyline; the particles then walk that
  // array. Re-evaluating a spline per particle per frame is the obvious way to
  // write this and is an order of magnitude more work for no visible gain.
  const paths = curves.map((curve) => curve.getSpacedPoints(samples));

  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const fades = new Float32Array(count);
  const state = [];

  for (let i = 0; i < count; i++) {
    state.push({
      path: Math.floor(random() * paths.length),
      u: random(),
      // Slight per-particle speed spread, so the stream never marches in step.
      rate: 0.7 + random() * 0.6,
      offset: new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(spread * 2),
    });
    scales[i] = 0.7 + random() * 0.7;
    fades[i] = 1;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
  geometry.setAttribute('aFade', new THREE.BufferAttribute(fades, 1));
  // The particles are repositioned every frame and can travel anywhere along
  // the path; a stale bounding sphere would cull the whole stream.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60);

  const material = particleMaterial({ color, size, opacity });
  const object = new THREE.Points(geometry, material);
  object.frustumCulled = false;
  object.name = 'flow';

  let rateMultiplier = 1;
  const point = new THREE.Vector3();

  const write = () => {
    for (let i = 0; i < count; i++) {
      const particle = state[i];
      const path = paths[particle.path];
      const t = particle.u * (path.length - 1);
      const index = Math.min(path.length - 2, Math.floor(t));
      point.copy(path[index]).lerp(path[index + 1], t - index).add(particle.offset);
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
      // Fade in at the start of the path and out at the end, so particles
      // arrive and leave instead of blinking into existence mid-vessel.
      fades[i] = Math.min(1, Math.min(particle.u, 1 - particle.u) * 8);
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aFade.needsUpdate = true;
  };

  write();

  return {
    object,
    /** @param {number} dt seconds */
    update(dt) {
      if (rateMultiplier === 0) return;
      for (const particle of state) {
        particle.u = (particle.u + dt * speed * particle.rate * rateMultiplier) % 1;
        // Wrap explicitly: a negative rate is legitimate (air leaving the
        // airway, bile refilling) and `%` keeps the sign in JavaScript.
        if (particle.u < 0) particle.u += 1;
      }
      write();
    },
    /**
     * Presentation rate: 0 stops the stream, 1 is the authored rate, and a
     * negative value runs the same path backwards.
     */
    setRate(value) {
      rateMultiplier = Number.isFinite(value) ? value : 0;
    },
    setOpacity(value) {
      material.uniforms.uOpacity.value = Math.max(0, value);
    },
    setColor(value) {
      material.uniforms.uColor.value.set(value);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
