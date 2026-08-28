import * as THREE from 'three';
import { clamp, createRandom, randomDirection, lerp } from '../../utils/math.js';
import { buildSegmentedPath } from './geometry/segmentedPath.js';

/**
 * The scene's anatomical coordinate system, stated once so nothing has to
 * guess it.
 *
 * This is not decoration. A comment reading `// left` beside a `+x` that the
 * code elsewhere treats as the right side is how the larger lung ended up on
 * the wrong side of the heart, agreeing with its own comment and disagreeing
 * with the atrium two files away.
 *
 * The layout is fixed by the structures that name a side: the *left* atrium
 * sits at negative x, the *left* pulmonary veins and the labelled *left*
 * pulmonary bed are further out along the same axis. So:
 *
 *   -x  anatomical LEFT        +x  anatomical RIGHT
 *   +y  superior               -y  inferior
 *   +z  anterior               -z  posterior
 *
 * One consequence is worth stating plainly, because it is easy to get backwards:
 * the default camera looks from anterior (+z) toward the heart, so anatomical
 * left appears on the *viewer's left*. This scene is laid out as a labelled
 * diagram seen from the subject's own left and right — not as a mirrored
 * clinical anterior view, where the patient's left would appear on the
 * viewer's right. Anything that decides a side must use these vectors.
 */
export const ANATOMICAL_AXES = Object.freeze({
  left: Object.freeze(new THREE.Vector3(-1, 0, 0)),
  right: Object.freeze(new THREE.Vector3(1, 0, 0)),
  superior: Object.freeze(new THREE.Vector3(0, 1, 0)),
  inferior: Object.freeze(new THREE.Vector3(0, -1, 0)),
  anterior: Object.freeze(new THREE.Vector3(0, 0, 1)),
  posterior: Object.freeze(new THREE.Vector3(0, 0, -1)),
});

/**
 * Which anatomical side a point lies on. Use this rather than testing the sign
 * of x by hand: the sign is a fact about this scene's axes, and the axes are
 * stated in exactly one place.
 *
 * @param {THREE.Vector3 | number} pointOrX
 * @returns {'left' | 'right'}
 */
export function anatomicalSide(pointOrX) {
  const x = typeof pointOrX === 'number' ? pointOrX : pointOrX.x;
  return x * ANATOMICAL_AXES.left.x > 0 ? 'left' : 'right';
}

/**
 * Fixed landmarks of the schematic heart, in scene units (1 unit = 1 cm).
 * Everything else — vessels, particle targets, label anchors — is derived from
 * these, so nudging a valve moves its blood stream with it.
 */
/**
 * Root-local coordinates, 0 at the annulus and 1 at the sinotubular junction.
 * These are parameters of the aortic root itself, so they stay correct however
 * the rest of the vessel is reshaped — which is the point of writing them here
 * rather than as fractions of the whole aorta.
 */
const AORTIC_VALVE_ROOT_U = 0.29;
const SINUS_ROOT_U = 0.55;

export const ANATOMY = {
  /** Valve plane: the ventricle hangs below it, the atrium sits above it. */
  baseY: 1.6,
  /** Wedge left out of the chamber walls so the cavity is visible. */
  cutAngle: Math.PI * 0.55,
  aorticValve: new THREE.Vector3(1.15, 1.6, 0.35),
  mitralValve: new THREE.Vector3(-1.2, 1.6, 0.2),
  atriumCentre: new THREE.Vector3(-1.45, 2.86, -1.15),
  atriumRadius: 1.1,
  /**
   * The two schematic pulmonary vascular regions the veins drain from. The
   * left one carries the label and the congestion story; the right one exists
   * so four veins converge on the atrium the way the real ones do, instead of
   * a single stalk.
   */
  pulmonaryBed: new THREE.Vector3(-4.9, 3.7, -2.6),
  pulmonaryBedRight: new THREE.Vector3(1.9, 4.5, -3.3),
};

/**
 * The aorta, as four named parts rather than one anonymous curve.
 *
 * Everything that attaches to the aorta — the sinuses of Valsalva in the
 * geometry, the destination of ejected blood, the label anchor — refers to a
 * landmark or a segment below, never to a fraction of the whole curve. That
 * indirection is the whole point: when the descending aorta was added, three
 * separate consumers were still quoting arc-length fractions measured against
 * the shorter curve, and the sinuses ended up swelling in the mid-ascending
 * aorta with every test still passing.
 *
 * Boundary points are written twice on purpose — once as the end of one part
 * and once as the start of the next — so each part reads as a whole vessel
 * segment. `buildSegmentedPath` keeps one copy.
 */
const AORTIC_ANNULUS = new THREE.Vector3(1.08, 1.34, 0.28);
const SINOTUBULAR_JUNCTION = new THREE.Vector3(1.36, 2.24, 0.08);
const ASCENDING_END = new THREE.Vector3(1.9, 4.9, -0.85);
const ARCH_END = new THREE.Vector3(-3.1, 5.1, -2.4);

export const AORTA_MODEL = buildSegmentedPath(
  [
    {
      // Annulus to sinotubular junction. The valve plane is inside this part,
      // not below it: what lies below the aortic valve is left ventricular
      // outflow tract, and the ventricle draws that.
      id: 'root',
      points: [AORTIC_ANNULUS, ANATOMY.aorticValve.clone(), SINOTUBULAR_JUNCTION],
    },
    {
      id: 'ascending',
      points: [SINOTUBULAR_JUNCTION, new THREE.Vector3(1.62, 3.1, -0.35), ASCENDING_END],
    },
    {
      id: 'arch',
      points: [
        ASCENDING_END,
        new THREE.Vector3(0.7, 6.3, -1.1),
        new THREE.Vector3(-1.4, 6.1, -1.8),
        ARCH_END,
      ],
    },
    {
      // The descending aorta continues past the frame. An artery that stopped
      // in mid-air read as a cut pipe; running it out of shot is what an atlas
      // plate does, and it costs three control points.
      id: 'descending',
      points: [
        ARCH_END,
        new THREE.Vector3(-4.3, 2.2, -3.6),
        new THREE.Vector3(-4.9, -3.4, -4.2),
        new THREE.Vector3(-5.2, -9.0, -4.6),
      ],
    },
  ],
  {
    // Each of these is a fraction along the part it belongs to, so it keeps
    // its anatomical meaning when any other part changes length.
    aorticValve: { segment: 'root', u: AORTIC_VALVE_ROOT_U },
    sinusOfValsalva: { segment: 'root', u: SINUS_ROOT_U },
    sinotubularJunction: { segment: 'root', u: 1 },
    ascendingAortaStart: { segment: 'ascending', u: 0 },
    ascendingAortaMid: { segment: 'ascending', u: 0.5 },
    archStart: { segment: 'arch', u: 0 },
    archApex: { segment: 'arch', u: 0.42 },
    archEnd: { segment: 'arch', u: 1 },
    descendingAortaStart: { segment: 'descending', u: 0 },
  }
);

/** Landmarks of the aorta, by anatomical name. */
export const AORTA_LANDMARKS = AORTA_MODEL.landmarks;
/** Named parts of the aorta: root, ascending, arch, descending. */
export const AORTA_SEGMENTS = AORTA_MODEL.segments;
/** The aorta as a plain curve, for anything that just needs to sample it. */
export const AORTA = AORTA_MODEL.curve;

/**
 * How far up the aorta ejected blood is drawn before it fades out: from the
 * valve it leaves through to the end of the arch. Past that the vessel is
 * heading out of frame, and a particle that follows it there is a particle
 * leaving the picture.
 */
export const EJECTION_REACH = {
  startT: AORTA_LANDMARKS.aorticValve.pathT,
  endT: AORTA_SEGMENTS.arch.endT,
};

/** Mitral inflow: atrium down through the valve. */
export const MITRAL_INFLOW = new THREE.CatmullRomCurve3([
  ANATOMY.atriumCentre.clone(),
  new THREE.Vector3(-1.3, 2.3, -0.45),
  ANATOMY.mitralValve.clone(),
]);

/**
 * Where each pulmonary vein meets the atrium: four ostia spread over the
 * posterior aspect, two per side, the way the real veins arrive — not a
 * single stalk into the centre.
 */
export const PULMONARY_VEIN_OSTIA = [
  new THREE.Vector3(-2.28, 3.36, -1.62), // left superior
  new THREE.Vector3(-2.4, 2.5, -1.6), // left inferior
  new THREE.Vector3(-0.66, 3.3, -1.72), // right superior
  new THREE.Vector3(-0.55, 2.44, -1.7), // right inferior
];

/**
 * Pulmonary veins draining into the left atrium. Order matches the ostia:
 * left superior, left inferior (from the left bed), right superior, right
 * inferior (from the right bed, arcing behind the aortic arch).
 */
export const PULMONARY_VEINS = [
  new THREE.CatmullRomCurve3([
    ANATOMY.pulmonaryBed.clone().add(new THREE.Vector3(0.2, 0.6, 0.3)),
    new THREE.Vector3(-3.9, 4.5, -1.7),
    PULMONARY_VEIN_OSTIA[0].clone(),
  ]),
  new THREE.CatmullRomCurve3([
    ANATOMY.pulmonaryBed.clone().add(new THREE.Vector3(-0.1, -1.2, 0.2)),
    new THREE.Vector3(-4.0, 2.7, -1.5),
    PULMONARY_VEIN_OSTIA[1].clone(),
  ]),
  new THREE.CatmullRomCurve3([
    ANATOMY.pulmonaryBedRight.clone().add(new THREE.Vector3(0.2, 0.5, 0.1)),
    new THREE.Vector3(0.7, 4.9, -2.4),
    new THREE.Vector3(0.05, 4.5, -1.5),
    PULMONARY_VEIN_OSTIA[2].clone(),
  ]),
  new THREE.CatmullRomCurve3([
    ANATOMY.pulmonaryBedRight.clone().add(new THREE.Vector3(-0.2, -1.1, 0.3)),
    new THREE.Vector3(0.8, 3.1, -2.2),
    new THREE.Vector3(0.1, 2.9, -1.3),
    PULMONARY_VEIN_OSTIA[3].clone(),
  ]),
];

/**
 * Small branching continuation of each vascular region: a fan of short
 * curves spreading away from where the veins converge, standing for the
 * proximal pulmonary vasculature. Schematic — no lung anatomy is claimed —
 * but it makes the veins read as *coming from somewhere* rather than ending
 * at a floating sphere.
 *
 * Deterministic (seeded), built once.
 *
 * @returns {{ origin: THREE.Vector3, curves: THREE.CatmullRomCurve3[],
 *   generations: number[] }[]} one fan per bed; `generations[i]` is 0 for a
 *   primary branch and 1 for a secondary, matching `curves[i]`
 */
let cachedFans = null;

export function buildVascularFans() {
  if (cachedFans) return cachedFans;
  const rnd = createRandom(5513);
  const fans = [];

  // Each vein continues outward past the point the tube stops, dividing like
  // the vessel it is: two short primary continuations in a narrow cone about
  // the vein's own direction, each dividing again. Branching from the vein
  // ends (rather than fanning from a shared centre) is what makes the result
  // read as vasculature instead of splayed twigs.
  for (const vein of PULMONARY_VEINS) {
    const start = vein.getPointAt(0);
    // Biased away from the viewer, so the tree recedes toward the lung
    // instead of splaying across the frame.
    const along = start
      .clone()
      .sub(vein.getPointAt(0.14))
      .normalize()
      .add(new THREE.Vector3(0, 0.05, -0.5))
      .normalize();

    const curves = [];
    const generations = [];
    for (let b = 0; b < 2; b++) {
      const dir = along
        .clone()
        .add(new THREE.Vector3((rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.55))
        .normalize();
      const length = 0.95 + rnd() * 0.45;
      const p1 = start.clone().addScaledVector(dir, length * 0.5).add(jitterVec(rnd, 0.1));
      const p2 = start.clone().addScaledVector(dir, length).add(jitterVec(rnd, 0.16));
      const primary = new THREE.CatmullRomCurve3([start.clone(), p1, p2]);
      curves.push(primary);
      generations.push(0);

      for (let s = 0; s < 2; s++) {
        const at = 0.55 + rnd() * 0.35;
        const from = primary.getPointAt(at);
        const sDir = dir
          .clone()
          .add(new THREE.Vector3((rnd() - 0.5) * 0.85, (rnd() - 0.5) * 0.85, (rnd() - 0.5) * 0.75))
          .normalize();
        const sLength = 0.45 + rnd() * 0.3;
        curves.push(
          new THREE.CatmullRomCurve3([
            from,
            from.clone().addScaledVector(sDir, sLength * 0.5).add(jitterVec(rnd, 0.07)),
            from.clone().addScaledVector(sDir, sLength).add(jitterVec(rnd, 0.1)),
          ])
        );
        generations.push(1);
      }
    }
    fans.push({ origin: start.clone(), curves, generations });
  }
  cachedFans = fans;
  return fans;
}

function jitterVec(rnd, amount) {
  return new THREE.Vector3(
    (rnd() - 0.5) * amount * 2,
    (rnd() - 0.5) * amount * 2,
    (rnd() - 0.5) * amount * 2
  );
}

/** Label anchors. */
export const ANCHORS = {
  cavity: new THREE.Vector3(0.2, -1.2, 1.6),
  wall: new THREE.Vector3(3.5, 0.4, 1.6),
  aorta: AORTA_LANDMARKS.ascendingAortaMid.position.clone(),
  residual: new THREE.Vector3(0.1, -3.6, 1.0),
  pressure: new THREE.Vector3(-2.4, 3.3, -0.5),
  pulmonaryBed: ANATOMY.pulmonaryBed.clone().add(new THREE.Vector3(-0.8, -1.4, 0)),
  fluid: new THREE.Vector3(-5.4, 4.8, -2.4),
  // Comparison mode moves each heart aside by COMPARISON_OFFSET (5.4).
  comparisonReference: new THREE.Vector3(-5.4, 2.4, 1.2),
  comparisonDisease: new THREE.Vector3(5.4, 2.4, 1.2),
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

    // Where it goes during ejection, and where it comes back from while
    // filling. Ejected blood is spread over the run of aorta it would actually
    // occupy — valve to the end of the arch — asked for by name. Quoting arc
    // length here is what once sent it ten units below the apex and off the
    // bottom of the screen when the descending aorta was added.
    AORTA.getPointAt(lerp(EJECTION_REACH.startT, EJECTION_REACH.endT, rnd()), tmp);
    jitter(tmp, rnd, 0.22);
    write(buffers.exits, i, tmp);

    MITRAL_INFLOW.getPointAt(lerp(0.05, 0.85, rnd()), tmp);
    jitter(tmp, rnd, 0.28);
    write(buffers.entries, i, tmp);
  });

  return buffers;
}

/**
 * Interstitial fluid around the pulmonary vasculature, for the congestion
 * stage.
 *
 * These particles are deliberately NOT blood: they sit *outside* the
 * pulmonary veins and their branches, use their own colour and size, and
 * never move along a vessel. They stand for fluid driven out of the
 * capillaries into the interstitium when pulmonary capillary hydrostatic
 * pressure rises — which is what pulmonary congestion is. Blood is never
 * drawn travelling backwards into the lung.
 *
 * Fluid is placed in a perivascular shell around the vein ends and the
 * vascular fans of both beds, so the haze visibly belongs to the vessels
 * rather than floating as a cloud beside them.
 */
export function buildInterstitialFluid(count, seed = 31337) {
  const rnd = createRandom(seed);
  const positions = new Float32Array(count * 3);
  const appear = new Float32Array(count);
  const seeds = new Float32Array(count);
  const sizes = new Float32Array(count);

  // Sample points along the distal veins and every fan branch: fluid gathers
  // around these, and is kept out of the lumen itself.
  const vesselSamples = [];
  for (const vein of PULMONARY_VEINS) {
    for (let i = 0; i <= 8; i++) vesselSamples.push(vein.getPointAt(i / 16)); // distal half only
  }
  for (const fan of buildVascularFans()) {
    for (const curve of fan.curves) {
      for (let i = 0; i <= 8; i++) vesselSamples.push(curve.getPointAt(i / 8));
    }
  }

  const tmp = new THREE.Vector3();
  const dir = new THREE.Vector3();
  let written = 0;
  let guard = 0;
  while (written < count && guard++ < count * 40) {
    // Perivascular shell: pick a vessel sample, offset by 0.45..1.6 units.
    const anchor = vesselSamples[Math.floor(rnd() * vesselSamples.length)];
    randomDirection(rnd, dir);
    tmp.copy(dir).multiplyScalar(0.55 + Math.pow(rnd(), 1.3) * 1.0).add(anchor);
    // Stay clear of every lumen — this is extravascular fluid.
    if (vesselSamples.some((sample) => sample.distanceTo(tmp) < 0.4)) continue;
    write(positions, written, tmp);
    // Fluid closest to the vessels appears first as pressure rises.
    const proximity = Math.min(...vesselSamples.map((sample) => sample.distanceTo(tmp)));
    appear[written] = clamp((proximity - 0.4) / 1.6) * 0.8 + rnd() * 0.2;
    seeds[written] = rnd();
    sizes[written] = 2.4 + rnd() * 2.6;
    written++;
  }

  return { count: written, positions, appear, seeds, sizes };
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
