import * as THREE from 'three';
import { createRandom, randomDirection } from '../../utils/math.js';

/**
 * Geometry of the micro-environment, in scene units.
 * Everything else (particles, fibrils, plaques, labels) is derived from this,
 * so moving a plaque here moves every dependent element with it.
 */
export const SPACE = {
  somaCenter: new THREE.Vector3(-2.6, 0.1, 0.2),
  somaRadius: 1.5,
  /** Extracellular deposits are placed *outside* the cells — as they are in vivo. */
  plaques: [
    { center: new THREE.Vector3(3.3, 0.1, 2.3), radius: 1.55 },
    { center: new THREE.Vector3(-0.7, 3.1, -2.9), radius: 1.15 },
    { center: new THREE.Vector3(1.6, -2.4, -1.6), radius: 0.95 },
  ],
  bounds: 9.0,
};

const STRAND_COUNT = 12;
const CLUSTER_COUNT = 26;

/**
 * Builds every position buffer the particle shader needs.
 *
 * A single particle follows one "lineage": free monomer -> a specific oligomer
 * cluster -> a segment of a specific fibril -> a specific plaque. Because the
 * chain is spatially coherent, particles drift a short distance at each step
 * instead of teleporting across the scene, which is what makes the transition
 * read as aggregation rather than as a random shuffle.
 *
 * @param {number} count number of particles
 * @param {number} seed  PRNG seed (fixed by default so captures are reproducible)
 */
export function buildAggregationLayout(count, seed = 20240824) {
  const rnd = createRandom(seed);
  const strands = buildStrands(rnd);
  const clusters = buildClusters(rnd, strands);

  const free = new Float32Array(count * 3);
  const oligo = new Float32Array(count * 3);
  const fibril = new Float32Array(count * 3);
  const plaque = new Float32Array(count * 3);
  const stages = new Float32Array(count * 4); // appear / join oligomer / join fibril / join plaque
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);

  // How far each particle gets along the aggregation cascade at full progression.
  // A mixed population is both more truthful and more readable than "everything
  // ends up in a plaque".
  const FATE_WEIGHTS = [0.2, 0.16, 0.2, 0.44]; // monomer / oligomer / fibril / plaque
  const NEVER = 2.0; // any threshold > 1 can never be crossed

  const tmp = new THREE.Vector3();
  const dir = { x: 0, y: 0, z: 0 };
  const perCluster = new Array(clusters.length).fill(0);
  const perClusterTarget = Math.max(1, Math.ceil(count / clusters.length));

  for (let i = 0; i < count; i++) {
    const cluster = clusters[i % clusters.length];
    const strand = strands[cluster.strand];
    const plaqueDef = SPACE.plaques[strand.plaque];
    const slot = perCluster[i % clusters.length]++;

    // --- free monomer
    // Most of the population is spread evenly through the extracellular space,
    // so the "normal" state looks diffuse rather than pre-clustered. The rest
    // starts nearer the site it will later join, which keeps some local density.
    randomDirection(rnd, dir);
    if (rnd() < 0.6) {
      tmp.set(dir.x, dir.y * 0.75, dir.z).normalize().multiplyScalar(2.8 + rnd() * 5.4);
    } else {
      tmp.set(dir.x, dir.y, dir.z)
        .multiplyScalar(2.2 + rnd() * 3.4)
        .add(cluster.center);
    }
    keepInExtracellularSpace(tmp, rnd);
    write(free, i, tmp);

    // --- oligomer: a small, loose blob
    randomDirection(rnd, dir);
    tmp.set(dir.x, dir.y, dir.z)
      .multiplyScalar(0.16 + rnd() * 0.34)
      .add(cluster.center);
    write(oligo, i, tmp);

    // --- fibril: strung along the cluster's own segment of the strand curve
    // Spread the cluster's particles evenly along its own slice of the strand,
    // so the blob visibly stretches into a filament.
    const along = (slot + rnd() * 0.6) / perClusterTarget;
    const t = cluster.tStart + (cluster.tEnd - cluster.tStart) * along;
    strand.curve.getPointAt(Math.min(0.999, Math.max(0.001, t)), tmp);
    randomDirection(rnd, dir);
    tmp.x += dir.x * 0.055;
    tmp.y += dir.y * 0.055;
    tmp.z += dir.z * 0.055;
    write(fibril, i, tmp);

    // --- plaque: dense core with a looser corona
    randomDirection(rnd, dir);
    const radial = plaqueDef.radius * (0.28 + Math.pow(rnd(), 0.55) * 0.78);
    tmp.set(dir.x, dir.y, dir.z).multiplyScalar(radial).add(plaqueDef.center);
    write(plaque, i, tmp);

    // --- thresholds
    const fate = pickFate(rnd(), FATE_WEIGHTS);
    // ~18% of the population is present from the start: Aβ exists in healthy brains.
    const baseline = i % 6 === 0;
    // Baseline particles must be fully visible at progress 0, so their threshold
    // sits below the start of the shader's fade-in window.
    const appear = baseline ? -0.15 : 0.05 + rnd() * 0.46;
    const oligoAt = fate >= 1 ? 0.3 + rnd() * 0.2 : NEVER;
    const fibrilAt = fate >= 2 ? 0.54 + rnd() * 0.18 : NEVER;
    const plaqueAt = fate >= 3 ? 0.76 + rnd() * 0.18 : NEVER;
    stages[i * 4 + 0] = appear;
    stages[i * 4 + 1] = oligoAt;
    stages[i * 4 + 2] = fibrilAt;
    stages[i * 4 + 3] = plaqueAt;

    seeds[i] = rnd();
    sizes[i] = 0.55 + rnd() * 0.6;
  }

  return {
    count,
    attributes: { free, oligo, fibril, plaque, stages, seeds, sizes },
    strands,
    clusters,
    plaques: SPACE.plaques,
    /** Anchors for the floating HTML labels. */
    anchors: {
      soma: SPACE.somaCenter.clone().add(new THREE.Vector3(0, SPACE.somaRadius + 0.7, 0)),
      space: new THREE.Vector3(5.2, 2.9, 1.4),
      oligomer: clusters[0].center.clone().add(new THREE.Vector3(0, 0.7, 0)),
      fibril: strands[0].curve.getPointAt(0.5).add(new THREE.Vector3(0, 0.5, 0)),
      plaque: SPACE.plaques[0].center.clone().add(new THREE.Vector3(0, SPACE.plaques[0].radius + 0.6, 0)),
      synapse: new THREE.Vector3(2.0, 0.45, -0.2),
    },
  };
}

/** Fibril paths: gently curved filaments that radiate out of each future plaque. */
function buildStrands(rnd) {
  const strands = [];
  for (let k = 0; k < STRAND_COUNT; k++) {
    const plaqueIndex = k % SPACE.plaques.length;
    const plaqueDef = SPACE.plaques[plaqueIndex];
    const dir = new THREE.Vector3();
    randomDirection(rnd, dir);
    dir.normalize();

    const start = plaqueDef.center.clone().addScaledVector(dir, plaqueDef.radius * 0.5);
    const length = 2.4 + rnd() * 1.8;
    const side = new THREE.Vector3(dir.z, dir.x, -dir.y).normalize();

    const points = [];
    for (let s = 0; s <= 4; s++) {
      const f = s / 4;
      const p = start.clone().addScaledVector(dir, length * f);
      // A slight S-wobble reads as a filament rather than a straight rod.
      p.addScaledVector(side, Math.sin(f * Math.PI * 1.4 + rnd() * 0.4) * 0.42);
      p.y += Math.sin(f * Math.PI) * (rnd() - 0.5) * 0.5;
      keepInExtracellularSpace(p, rnd);
      points.push(p);
    }
    strands.push({
      plaque: plaqueIndex,
      curve: new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5),
    });
  }
  return strands;
}

/** Oligomer blobs, each sitting on the stretch of fibril it will later become. */
function buildClusters(rnd, strands) {
  const clusters = [];
  for (let c = 0; c < CLUSTER_COUNT; c++) {
    const strandIndex = c % strands.length;
    const strand = strands[strandIndex];
    const segment = Math.floor(c / strands.length); // 0,1,2... along the same strand
    const segments = Math.ceil(CLUSTER_COUNT / strands.length);
    const tStart = segment / segments;
    const tEnd = (segment + 1) / segments;
    const center = strand.curve.getPointAt((tStart + tEnd) / 2);
    // Offset the blob off the fibril axis so "blob -> filament" is a visible motion.
    center.x += (rnd() - 0.5) * 0.9;
    center.y += (rnd() - 0.5) * 0.9;
    center.z += (rnd() - 0.5) * 0.9;
    keepInExtracellularSpace(center, rnd);
    clusters.push({ strand: strandIndex, center, tStart, tEnd });
  }
  return clusters;
}

/** Nothing should sit inside the soma or fly off to infinity. */
function keepInExtracellularSpace(point, rnd) {
  const offset = point.clone().sub(SPACE.somaCenter);
  const minDistance = SPACE.somaRadius + 0.85;
  if (offset.length() < minDistance) {
    offset.setLength(minDistance + rnd() * 1.2);
    point.copy(SPACE.somaCenter).add(offset);
  }
  if (point.length() > SPACE.bounds) point.setLength(SPACE.bounds);
  return point;
}

function pickFate(r, weights) {
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (r < acc) return i;
  }
  return weights.length - 1;
}

function write(array, index, vector) {
  array[index * 3 + 0] = vector.x;
  array[index * 3 + 1] = vector.y;
  array[index * 3 + 2] = vector.z;
}
