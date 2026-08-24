import * as THREE from 'three';
import { createRandom, randomDirection, lerp } from '../../utils/math.js';

/**
 * Fixed landmarks of the schematic heart, in scene units (1 unit = 1 cm).
 * Everything else — vessels, particle targets, label anchors — is derived from
 * these, so nudging a valve moves its blood stream with it.
 */
export const ANATOMY = {
  /** Valve plane: the ventricle hangs below it, the atrium sits above it. */
  baseY: 1.6,
  /** Wedge left out of the chamber walls so the cavity is visible. */
  cutAngle: Math.PI * 0.55,
  aorticValve: new THREE.Vector3(1.15, 1.6, 0.35),
  mitralValve: new THREE.Vector3(-1.2, 1.6, 0.2),
  atriumCentre: new THREE.Vector3(-1.6, 3.5, -0.1),
  atriumRadius: 1.65,
  pulmonaryBed: new THREE.Vector3(-4.9, 4.3, -2.6),
};

/** Ascending aorta and arch. Stops before it would intersect the ventricle. */
export const AORTA = new THREE.CatmullRomCurve3([
  ANATOMY.aorticValve.clone(),
  new THREE.Vector3(1.5, 3.1, 0.15),
  new THREE.Vector3(1.8, 4.9, -0.35),
  new THREE.Vector3(0.7, 6.3, -1.1),
  new THREE.Vector3(-1.4, 6.1, -1.8),
  new THREE.Vector3(-3.1, 5.1, -2.4),
]);

/** Mitral inflow: atrium down through the valve. */
export const MITRAL_INFLOW = new THREE.CatmullRomCurve3([
  ANATOMY.atriumCentre.clone(),
  new THREE.Vector3(-1.4, 2.6, 0.15),
  ANATOMY.mitralValve.clone(),
]);

/** Pulmonary veins draining into the left atrium. */
export const PULMONARY_VEINS = [
  new THREE.CatmullRomCurve3([
    ANATOMY.pulmonaryBed.clone().add(new THREE.Vector3(0.2, 0.5, 0.3)),
    new THREE.Vector3(-3.6, 4.4, -1.6),
    new THREE.Vector3(-2.4, 3.9, -0.7),
    ANATOMY.atriumCentre.clone(),
  ]),
  new THREE.CatmullRomCurve3([
    ANATOMY.pulmonaryBed.clone().add(new THREE.Vector3(-0.1, -1.4, 0.2)),
    new THREE.Vector3(-3.9, 2.6, -1.7),
    new THREE.Vector3(-2.6, 3.0, -0.6),
    ANATOMY.atriumCentre.clone(),
  ]),
];

/** Label anchors. */
export const ANCHORS = {
  cavity: new THREE.Vector3(0.2, -1.2, 1.6),
  wall: new THREE.Vector3(3.5, 0.4, 1.6),
  aorta: AORTA.getPointAt(0.42),
  residual: new THREE.Vector3(0.1, -3.6, 1.0),
  congestion: new THREE.Vector3(-3.4, 4.6, -1.6),
};

/**
 * Blood inside the ventricle.
 *
 * Slots are stored normalised (unit spheroid) so the shader can scale them by
 * the beating cavity. Rank is assigned by distance to the aortic valve, which
 * makes two things fall out for free: the blood nearest the outflow leaves
 * first, and the blood that never leaves is the apical blood — the classic
 * picture of stasis in a dilated ventricle.
 */
export function buildCavityBlood(count, seed = 90210) {
  const rnd = createRandom(seed);
  const slots = [];
  const dir = new THREE.Vector3();
  const halfCut = ANATOMY.cutAngle / 2;
  // Typical scale, only used to rank slots by distance to the outflow.
  const scale = new THREE.Vector3(2.9, 4.3, 2.9);

  while (slots.length < count) {
    randomDirection(rnd, dir);
    const radius = Math.cbrt(rnd());
    const p = dir.clone().multiplyScalar(radius);
    if (p.y > 0.33) continue; // above the valve plane
    // Leave the cut wedge empty, so blood is never drawn outside the wall.
    const phi = Math.atan2(p.x, p.z);
    if (Math.abs(phi) < halfCut) continue;
    slots.push(p);
  }

  const valve = ANATOMY.aorticValve;
  const order = slots
    .map((p, index) => ({
      index,
      distance: new THREE.Vector3(p.x * scale.x, p.y * scale.y, p.z * scale.z).distanceTo(valve),
    }))
    .sort((a, b) => a.distance - b.distance);

  const buffers = createBuffers(count);
  const tmp = new THREE.Vector3();

  order.forEach((entry, rank) => {
    const i = entry.index;
    const p = slots[i];
    write(buffers.slots, i, p);

    const r = count > 1 ? rank / (count - 1) : 0;
    buffers.ranks[i] = r;
    buffers.appear[i] = 0;
    buffers.seeds[i] = rnd();
    buffers.sizes[i] = 0.62 + rnd() * 0.6;

    // Where it goes during ejection, and where it comes back from while filling.
    AORTA.getPointAt(lerp(0.32, 0.99, rnd()), tmp);
    jitter(tmp, rnd, 0.22);
    write(buffers.exits, i, tmp);

    MITRAL_INFLOW.getPointAt(lerp(0.05, 0.85, rnd()), tmp);
    jitter(tmp, rnd, 0.28);
    write(buffers.entries, i, tmp);
  });

  return buffers;
}

/**
 * The congestion pool: blood backing up into the atrium, the pulmonary veins
 * and the vascular bed beyond. Particles appear in that order as the pressure
 * rises, so the direction of the backing-up is legible.
 */
export function buildCongestionPool(count, seed = 31337) {
  const rnd = createRandom(seed);
  const buffers = createBuffers(count);
  const dir = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  for (let i = 0; i < count; i++) {
    const zone = rnd();
    if (zone < 0.4) {
      // Left atrium
      randomDirection(rnd, dir);
      tmp.copy(dir).multiplyScalar(ANATOMY.atriumRadius * 0.9 * Math.cbrt(rnd())).add(ANATOMY.atriumCentre);
      buffers.appear[i] = rnd() * 0.34;
    } else if (zone < 0.78) {
      // Pulmonary veins
      const vein = PULMONARY_VEINS[rnd() < 0.5 ? 0 : 1];
      vein.getPointAt(Math.min(0.99, rnd()), tmp);
      jitter(tmp, rnd, 0.28);
      buffers.appear[i] = 0.28 + rnd() * 0.42;
    } else {
      // Pulmonary vascular bed
      randomDirection(rnd, dir);
      tmp.copy(dir).multiplyScalar(1.9 * Math.cbrt(rnd())).add(ANATOMY.pulmonaryBed);
      buffers.appear[i] = 0.58 + rnd() * 0.42;
    }
    write(buffers.slots, i, tmp);
    buffers.ranks[i] = 2; // never ejected
    buffers.seeds[i] = rnd();
    buffers.sizes[i] = 0.55 + rnd() * 0.5;
  }
  return buffers;
}

function createBuffers(count) {
  return {
    slots: new Float32Array(count * 3),
    exits: new Float32Array(count * 3),
    entries: new Float32Array(count * 3),
    ranks: new Float32Array(count),
    appear: new Float32Array(count),
    seeds: new Float32Array(count),
    sizes: new Float32Array(count),
  };
}

function jitter(vector, rnd, amount) {
  vector.x += (rnd() - 0.5) * amount * 2;
  vector.y += (rnd() - 0.5) * amount * 2;
  vector.z += (rnd() - 0.5) * amount * 2;
  return vector;
}

function write(array, index, vector) {
  array[index * 3 + 0] = vector.x;
  array[index * 3 + 1] = vector.y;
  array[index * 3 + 2] = vector.z;
}
