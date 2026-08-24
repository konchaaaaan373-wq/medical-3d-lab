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
  pulmonaryBed: new THREE.Vector3(-4.9, 3.7, -2.6),
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
  pressure: new THREE.Vector3(-2.4, 3.3, -0.5),
  fluid: new THREE.Vector3(-5.4, 4.8, -2.4),
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
 * Interstitial fluid in the lung, for the congestion stage.
 *
 * These particles are deliberately NOT blood: they sit *outside* the pulmonary
 * veins, use their own colour and size, and never move along a vessel. They
 * stand for fluid driven out of the capillaries into the interstitium when
 * pulmonary capillary hydrostatic pressure rises — which is what pulmonary
 * congestion is. Blood is never drawn travelling backwards into the lung.
 */
export function buildInterstitialFluid(count, seed = 31337) {
  const rnd = createRandom(seed);
  const positions = new Float32Array(count * 3);
  const appear = new Float32Array(count);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);

  // Sampled points along the veins, used to keep the fluid extravascular.
  const veinSamples = [];
  for (const vein of PULMONARY_VEINS) {
    for (let i = 0; i <= 16; i++) veinSamples.push(vein.getPointAt(i / 16));
  }

  const dir = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  let written = 0;
  let guard = 0;
  while (written < count && guard++ < count * 40) {
    randomDirection(rnd, dir);
    tmp.copy(dir).multiplyScalar(2.5 * Math.cbrt(rnd())).add(ANATOMY.pulmonaryBed);
    // Stay clear of the vessel lumen — this is extravascular fluid.
    if (veinSamples.some((sample) => sample.distanceTo(tmp) < 0.8)) continue;
    write(positions, written, tmp);
    // Fluid closer to the veins appears first as pressure rises.
    const proximity = Math.min(...veinSamples.map((sample) => sample.distanceTo(tmp)));
    appear[written] = clamp01((proximity - 0.8) / 3.2) * 0.8 + rnd() * 0.2;
    seeds[written] = rnd();
    sizes[written] = 0.5 + rnd() * 0.55;
    written++;
  }

  return { count: written, positions, appear, seeds, sizes };
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

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
