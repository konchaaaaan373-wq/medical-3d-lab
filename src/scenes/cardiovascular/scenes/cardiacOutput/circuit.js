import * as THREE from 'three';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { ANATOMY } from '../heartFailure/anatomy.js';
import { PALETTE } from '../../../../data/cardiacOutput.js';
import { clamp, lerp, smoothstep } from '../../../../utils/math.js';

/**
 * The loop the ventricle is part of, drawn as a circuit rather than as anatomy.
 *
 * ## Why this is schematic, and how it says so
 *
 * The ventricle in this scene is built from solved volumes: its size at any
 * moment is a number the model produced. Nothing about this circuit is. The
 * path lengths are not vascular distances, the calibre is not a diameter, and
 * the segment marked as resistance is a distributed property of a whole bed
 * shown in one place because a lumped model has no other place to put it.
 *
 * So it is drawn as tubing on a board — two runs and a node — instead of as an
 * aorta and a vena cava. Something drawn to look like an aorta invites being
 * read as one.
 *
 * ## The loop closes, and the omission is named
 *
 * Out of the aortic valve, through the systemic bed, back as venous return,
 * through a single node standing for the right heart and the lungs, and in at
 * the mitral valve. The right ventricle, the pulmonary arteries, the pulmonary
 * veins and the left atrium are all in the mathematics — the model has seven
 * compartments and could not close without them — and they are one node here.
 * Drawing venous blood arriving at the left ventricle without passing through
 * anything would be a different and much worse simplification.
 *
 * ## Presentation values, named as such
 *
 * `particleSpeed`, `calibre` and the band opacity are drawing quantities. The
 * particles show direction and rate; they are not velocity and the tube is not
 * a vessel. Rate is carried by **speed only** — the count is fixed — because
 * raising count and speed together would show one change in output twice.
 */

/**
 * Out of the ventricle and round the systemic bed. Oxygenated.
 *
 * The footprint is chosen against the frame, not against anatomy: a loop whose
 * lower run disappeared behind the console read as two unrelated arcs, which is
 * the opposite of what a circuit diagram is for. It sits inside the ventricle's
 * own vertical extent — the chamber reaches about 4.8 units below the valve
 * plane — so the whole ring is visible at once.
 */
export const ARTERIAL_PATH = smoothCurve([
  [ANATOMY.aorticValve.x, ANATOMY.aorticValve.y + 0.3, ANATOMY.aorticValve.z],
  [-2.6, 3.5, -1.2],
  [-5.2, 4.0, -2.6],
  [-7.0, 1.6, -3.2],
  [-7.3, -1.4, -3.2],
]);

/** Back from the systemic bed to the node standing for the right heart and lungs. Deoxygenated. */
export const VENOUS_PATH = smoothCurve([
  [-7.3, -1.4, -3.2],
  // Low enough to clear the ventricle's apex *in projection*, which is lower
  // than clearing it in world y: the run sits three units behind the chamber,
  // and under perspective a more distant point projects nearer the centre of
  // the frame. At the apex's own height the bottom of the loop disappeared
  // behind the muscle and the circuit read as two arcs that do not meet.
  [-6.8, -4.6, -3.2],
  [-3.2, -6.6, -3.0],
  [1.2, -6.6, -3.0],
  [4.8, -4.4, -3.0],
  [6.3, -1.4, -3.0],
]);

/**
 * Out of that node and in at the mitral valve. **Oxygenated.**
 *
 * This run carries the arterial colour and not the venous one, and the
 * distinction is not cosmetic: blood leaving the lungs is oxygenated, and
 * drawing the pulmonary veins blue because they are called veins is one of the
 * commonest things a reader can be taught wrong by a diagram. The colour
 * changes at the node, which is where the lungs are.
 */
export const RETURN_PATH = smoothCurve([
  [6.3, -1.4, -3.0],
  [6.5, 1.0, -2.9],
  [5.4, 3.2, -2.3],
  [3.0, 3.6, -1.3],
  [ANATOMY.mitralValve.x, ANATOMY.mitralValve.y + 0.3, ANATOMY.mitralValve.z],
]);

/**
 * The systemic bed: many small vessels side by side, between the end of the
 * arterial run and the start of the venous one.
 *
 * Systemic vascular resistance is a property of the whole bed — thousands of
 * arterioles in parallel, which narrow and widen together — not of one place
 * on one tube. It was drawn as three rings closing on the arterial run, and a
 * ring on a tube reads as a stenosis: a local lesion, the opposite of what it
 * stood for (owner's review, 2026-09-27). So the bed is drawn as a fan of
 * parallel vessels, all narrowing by the same amount, with the blood crossing
 * it slower as the output falls. The count, their length and their spread are
 * drawing choices; what is the model's is that they narrow together and by
 * how much the lumped resistance moved.
 */
const BED_FROM = 0.72; // on the arterial run
const BED_TO = 0.28; // on the venous run
const BED_VESSELS = 7;
const BED_SPREAD = 1.6; // how far the widest arc bows out, world units
/**
 * The direction the bed's arcs bow out in: to the screen's left, away from the
 * heart. The scene's camera looks along roughly +z, so a spread in z is a
 * spread nobody can see — the first version drew the bed as one flat patch.
 * One constant, because the label that names the bed hangs off the same bow.
 */
const SCREEN_LEFT = new THREE.Vector3(-0.92, 0, 0.34).normalize();

function bedCurves() {
  const start = ARTERIAL_PATH.getPointAt(BED_FROM);
  const end = VENOUS_PATH.getPointAt(BED_TO);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  // Nested arcs, so the vessels separate on screen instead of stacking along
  // the line of sight (`SCREEN_LEFT`).
  return Array.from({ length: BED_VESSELS }, (_, i) => {
    const k = i / (BED_VESSELS - 1); // 0 … 1
    const bow = mid.clone().addScaledVector(SCREEN_LEFT, BED_SPREAD * (0.25 + 1.35 * k));
    return new THREE.QuadraticBezierCurve3(start.clone(), bow, end.clone());
  });
}

/** The venous run's resting calibre; it fills with the circulating volume. */
const VENOUS_RADIUS = 0.2;

/** The bed's resting calibre, and how far it narrows and widens (presentation). */
const BED_RADIUS = 0.085;

/** The node standing for the right heart and the pulmonary circulation. */
const NODE_POSITION = new THREE.Vector3(6.4, -0.2, -2.95);

/** Anchors a label may hang from. World coordinates, since nothing here moves. */
const CIRCUIT_ANCHORS = {
  resistance: ARTERIAL_PATH.getPointAt(BED_FROM).lerp(VENOUS_PATH.getPointAt(BED_TO), 0.5).addScaledVector(SCREEN_LEFT, BED_SPREAD * 1.1),
  return: VENOUS_PATH.getPointAt(0.45),
  node: NODE_POSITION.clone(),
};

/**
 * How much of the arterial run one beat's blood fills, in path coordinates.
 *
 * Blood in a tube of fixed calibre occupies a length in proportion to its
 * volume, so the bolus is drawn as a length, not a sphere: a stroke of 44 mL
 * is 0.62 of the length of one of 71 mL — the same ratio as the volumes, and
 * readable at a glance, where a sphere's width would change by only the cube
 * root. The calibre is the drawing's and the scale (a fifth of the run at
 * 70 mL) is a drawing scale; the proportion is the model's.
 */
export function bolusLengthFor(strokeVolumeMl) {
  const sv = Math.max(0, Number(strokeVolumeMl) || 0);
  return 0.2 * (sv / 70);
}

/**
 * How wide the small vessels are drawn for a systemic resistance, as a
 * multiple of their resting calibre.
 *
 * Poiseuille would make the radius go as the fourth root of 1/R — a narrowing
 * too small to see across this range — so the calibre is a drawing scale over
 * the control's range, labelled as such; its direction and its order are the
 * model's. One function, so the full model and the introductory lesson draw
 * the same resistance at the same width.
 *
 * @param {number} resistance mmHg·s/mL
 * @param {{ min: number, max: number }} domain the control's range
 */
export function bedCalibreFor(resistance, domain) {
  return lerp(1.5, 0.45, clamp((resistance - domain.min) / (domain.max - domain.min)));
}

/**
 * How fast the drawn blood moves for a cardiac output, as a multiple of the
 * streams' authored rate. Output rides on speed alone — the particle count is
 * fixed — so one change is not shown twice. A drawing scale.
 *
 * @param {number} cardiacOutputLMin
 */
export function flowRateFor(cardiacOutputLMin) {
  return 0.55 + clamp((cardiacOutputLMin - 2.0) / 6.0) * 1.25;
}

export function buildCircuit({ compact = false } = {}) {
  const object = new THREE.Group();
  object.name = 'circuit';

  const arterialTube = new TubeSurface(ARTERIAL_PATH, {
    radius: () => 0.17,
    steps: compact ? 48 : 72,
    radial: compact ? 12 : 16,
  });
  const venousTube = new TubeSurface(VENOUS_PATH, {
    radius: () => VENOUS_RADIUS,
    steps: compact ? 44 : 64,
    radial: compact ? 10 : 14,
  });
  const returnTube = new TubeSurface(RETURN_PATH, {
    radius: () => 0.18,
    steps: compact ? 40 : 60,
    radial: compact ? 10 : 14,
  });

  // Walls you look through, because the particles inside them are the point.
  const WALL_OPACITY = 0.4;
  const arterialMaterial = tissueMaterial({
    color: PALETTE.artery,
    roughness: 0.4,
    emissive: PALETTE.artery,
    emissiveIntensity: 0.08,
    opacity: WALL_OPACITY,
  });
  const venousMaterial = tissueMaterial({
    color: PALETTE.vein,
    roughness: 0.52,
    emissiveIntensity: 0.04,
    opacity: WALL_OPACITY,
  });

  const artery = new THREE.Mesh(arterialTube.geometry, arterialMaterial);
  artery.name = 'systemic-arteries';
  const vein = new THREE.Mesh(venousTube.geometry, venousMaterial);
  vein.name = 'systemic-veins';
  // The arterial material, not the venous one — see `RETURN_PATH`.
  const back = new THREE.Mesh(returnTube.geometry, arterialMaterial);
  back.name = 'oxygenated-return';

  // The bed: see `bedCurves`. One material, so every vessel in it narrows and
  // tints together.
  const bedMaterial = tissueMaterial({
    color: PALETTE.resistance,
    roughness: 0.45,
    emissive: PALETTE.resistance,
    emissiveIntensity: 0.12,
    opacity: 0.75,
  });
  const bedPaths = bedCurves();
  const bedTubes = bedPaths.map((curve) => new TubeSurface(curve, {
    radius: () => BED_RADIUS,
    steps: compact ? 16 : 24,
    radial: compact ? 6 : 8,
  }));
  const bed = new THREE.Group();
  bed.name = 'systemic-bed';
  for (const tube of bedTubes) bed.add(new THREE.Mesh(tube.geometry, bedMaterial));

  // What one beat sends out: a bright length of the arterial run that leaves
  // the aortic valve with each ejection, as long as the solved stroke volume
  // (`bolusLengthFor`). A presentation of a model output — the tube is not a
  // vessel — but its length is the stroke volume and nothing else.
  const bolus = createBolus({
    name: 'stroke-bolus',
    radius: 0.26,
    steps: compact ? 72 : 110,
    radial: compact ? 10 : 14,
    material: new THREE.MeshBasicMaterial({ color: PALETTE.flow, transparent: true, opacity: 0, depthWrite: false }),
    peakOpacity: 0.7,
  });
  // The start's stroke, at the same moment of the beat: a wider, see-through
  // sheath in the "before" colour, as long as the starting stroke volume. The
  // bright length inside it is now; the sheath is where it used to reach.
  // Drawn only once something has moved, faint and in the cage's colour, so
  // it cannot be read as more blood. (Not wireframe: the tube's collapsed
  // vertices outside the bolus would draw as a line along the whole run.)
  const beforeBolus = createBolus({
    name: 'stroke-bolus-before',
    radius: 0.42,
    steps: compact ? 72 : 110,
    radial: 12,
    material: new THREE.MeshBasicMaterial({ color: PALETTE.before, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
    peakOpacity: 0.3,
  });

  // One node for the right ventricle, the pulmonary circulation and the left
  // atrium. It is drawn as a rounded block, not as chambers, because it stands
  // for four compartments rather than depicting any of them.
  const nodeMaterial = tissueMaterial({
    color: '#6b7fa6',
    roughness: 0.62,
    emissiveIntensity: 0.03,
    opacity: 0.5,
  });
  const node = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 1.1, 4, 12), nodeMaterial);
  node.name = 'right-heart-and-lungs';
  node.position.copy(NODE_POSITION);

  // Blood crossing the bed, at the same rate as the rest of the loop.
  const bedFlow = createFlowStream({
    curves: bedPaths,
    count: compact ? 42 : 70,
    color: PALETTE.flow,
    size: 4.2,
    speed: 0.3,
    spread: 0.02,
    seed: 7717,
    opacity: 0.55,
  });

  const particleCount = compact ? 90 : 150;
  const arterialFlow = createFlowStream({
    curves: [ARTERIAL_PATH],
    count: particleCount,
    color: PALETTE.flow,
    size: 6,
    speed: 0.22,
    spread: 0.06,
    seed: 4021,
    opacity: 0.5,
  });
  const venousFlow = createFlowStream({
    curves: [VENOUS_PATH],
    count: particleCount,
    color: PALETTE.vein,
    size: 5.4,
    speed: 0.2,
    spread: 0.06,
    seed: 9107,
    opacity: 0.45,
  });
  // Its own stream rather than a second path on the venous one, because the
  // blood in it is a different colour and sharing a stream would have forced
  // one colour onto both.
  const returnFlow = createFlowStream({
    curves: [RETURN_PATH],
    count: Math.round(particleCount * 0.7),
    color: PALETTE.flow,
    size: 5.6,
    speed: 0.2,
    spread: 0.06,
    seed: 5533,
    opacity: 0.45,
  });

  object.add(
    artery,
    vein,
    back,
    bed,
    bolus.mesh,
    beforeBolus.mesh,
    bedFlow.object,
    node,
    arterialFlow.object,
    venousFlow.object,
    returnFlow.object
  );

  /**
   * Drawing quantities for the current solution, kept so a test can check the
   * mapping without pretending these unitless numbers are medical outputs.
   */
  let presentation = null;
  let strokeVolumeMl = 68;
  // What the tubes were last rebuilt for. A rebuild rewrites every vertex of
  // the tube, and `setState` runs on every model read — most of which (a
  // rate change, the explanation's held frames) leave these as they were.
  let drawnCalibre = null;
  let drawnVenousCalibre = null;
  // Emphasis levels without the pointer on them, so a pointer can be added
  // and taken away without losing what the solved state set.
  let arterialBase = arterialMaterial.emissiveIntensity;
  let bedBase = bedMaterial.emissiveIntensity;
  const venousBase = venousMaterial.emissiveIntensity;
  let highlight = { arterial: 0, bed: 0, venous: 0, ejection: 0 };
  let showBefore = true;
  const paintHighlight = () => {
    arterialMaterial.emissiveIntensity = arterialBase + highlight.arterial * 0.55;
    bedMaterial.emissiveIntensity = bedBase + highlight.bed * 0.7;
    venousMaterial.emissiveIntensity = venousBase + highlight.venous * 0.6;
  };

  return {
    object,
    anchors: CIRCUIT_ANCHORS,

    /**
     * @param {{ cardiacOutputLMin: number, systemicResistanceMmHgSPerMl: number,
     *   meanArterialPressureMmHg: number, strokeVolumeMl: number }} metrics from the solved beat
     * @param {{ min: number, max: number }} resistanceDomain
     * @param {{ fillingVolumeMl?: number, fillingDomain?: { min: number, max: number } }} [input]
     *   the circulating filling the beat was solved for, and its range
     */
    setState(metrics, resistanceDomain, { fillingVolumeMl, fillingDomain } = {}) {
      // Normalised positions inside the ranges the model can reach, so the
      // drawing uses its whole span instead of crowding into a corner.
      const pressure = clamp((metrics.meanArterialPressureMmHg - 40) / 120);
      const resistance = clamp(
        (metrics.systemicResistanceMmHgSPerMl - resistanceDomain.min) /
          (resistanceDomain.max - resistanceDomain.min)
      );
      const filling = fillingDomain && Number.isFinite(fillingVolumeMl)
        ? clamp((fillingVolumeMl - fillingDomain.min) / (fillingDomain.max - fillingDomain.min))
        : 0.5;

      // Rate rides on speed alone. Doubling the particle count as well would
      // show one change in cardiac output twice and make it look larger than
      // the model said.
      const particleSpeed = flowRateFor(metrics.cardiacOutputLMin);
      // The bed narrows with the lumped resistance (`bedCalibreFor`).
      const calibre = bedCalibreFor(metrics.systemicResistanceMmHgSPerMl, resistanceDomain);
      // Most of the circulating volume sits in the veins, so that is where
      // more filling is drawn: a fuller venous run. A drawing scale again.
      const venousCalibre = lerp(0.7, 1.45, filling);

      arterialFlow.setRate(particleSpeed);
      venousFlow.setRate(particleSpeed);
      returnFlow.setRate(particleSpeed);
      bedFlow.setRate(particleSpeed);
      arterialBase = 0.06 + pressure * 0.26;
      bedBase = 0.08 + resistance * 0.3;
      paintHighlight();

      if (calibre !== drawnCalibre) {
        for (const tube of bedTubes) tube.refresh((u, base) => base * calibre);
        drawnCalibre = calibre;
      }
      if (venousCalibre !== drawnVenousCalibre) {
        venousTube.refresh((u, base) => base * venousCalibre);
        drawnVenousCalibre = venousCalibre;
      }
      strokeVolumeMl = metrics.strokeVolumeMl;

      presentation = {
        particleSpeed,
        particleCount,
        returnParticleCount: Math.round(particleCount * 0.7),
        calibre,
        bedVessels: bedTubes.length,
        bedRadius: BED_RADIUS * calibre,
        venousRadius: VENOUS_RADIUS * venousCalibre,
        bolusLength: bolusLengthFor(metrics.strokeVolumeMl),
        arterialEmissive: arterialBase,
      };
    },

    /**
     * Where this beat's bolus is: `travel` 0 at the valve as ejection starts,
     * 1 where it has faded into the arterial run. Called every frame.
     *
     * @param {number} travel 0..1, or a negative number when there is none
     * @param {{ travel: number, strokeVolumeMl: number } | null} [before] the
     *   start's stroke at the same moment of the beat, or null to draw none
     */
    setBolus(travel, before = null) {
      bolus.set(travel, bolusLengthFor(strokeVolumeMl), 1 + highlight.ejection * 0.4);
      if (before && showBefore) beforeBolus.set(before.travel, bolusLengthFor(before.strokeVolumeMl), 1);
      else beforeBolus.set(-1, 0, 1);
    },

    /** Whether the start's sleeve may be drawn at all (off in a file: see the scene's `setExportMode`). */
    setShowBefore(on) {
      showBefore = Boolean(on);
      if (!showBefore) beforeBolus.mesh.visible = false;
    },

    /**
     * Presentation: which part is being pointed at, 0..1 each. Adds to what
     * the solved state set; changes no size and no speed.
     *
     * @param {{ arterial?: number, bed?: number, venous?: number, ejection?: number }} amounts
     */
    setHighlight(amounts = {}) {
      highlight = { arterial: 0, bed: 0, venous: 0, ejection: 0, ...amounts };
      paintHighlight();
    },

    /** How long each bolus is drawn, for a test (path units). */
    bolusLengths() {
      return { now: bolus.length, before: beforeBolus.mesh.visible ? beforeBolus.length : null };
    },

    /** @returns {null | {particleSpeed:number, particleCount:number, calibre:number}} */
    presentationState() {
      return presentation;
    },

    update(dt) {
      arterialFlow.update(dt);
      venousFlow.update(dt);
      returnFlow.update(dt);
      bedFlow.update(dt);
    },

    dispose() {
      arterialFlow.dispose();
      venousFlow.dispose();
      returnFlow.dispose();
      bedFlow.dispose();
    },
  };
}

/**
 * A length of the arterial run that leaves the valve with each ejection.
 * Rebuilt only when its head has moved by a visible step (1/400 of the run,
 * about a pixel at the scene's own framing) or its length changed.
 */
function createBolus({ name, radius, steps, radial, material, peakOpacity }) {
  const tube = new TubeSurface(ARTERIAL_PATH, { radius: () => 0, steps, radial });
  const mesh = new THREE.Mesh(tube.geometry, material);
  mesh.name = name;
  mesh.visible = false;
  mesh.renderOrder = 2;
  let drawn = null;
  const state = {
    mesh,
    length: 0,
    set(travel, length, gain) {
      if (!(travel >= 0 && travel <= 1) || !(length > 0)) {
        mesh.visible = false;
        return;
      }
      state.length = length;
      // The head leaves the valve and runs on past where the tail was; the
      // whole length is on the run from a fifth of the way through.
      const head = 0.02 + travel * (0.55 + length);
      const edge = 0.015;
      const key = `${Math.round(head * 400)}|${length}`;
      if (key !== drawn) {
        drawn = key;
        const at = Math.round(head * 400) / 400;
        tube.refresh((u) => {
          if (u < at - length - edge || u > at + edge || u < 0.02) return 0;
          const ramp = smoothstep(at - length - edge, at - length + edge, u) * (1 - smoothstep(at - edge, at + edge, u));
          return radius * ramp;
        });
      }
      material.opacity = Math.min(1, peakOpacity * gain) * (1 - smoothstep(0.55, 1, travel));
      mesh.visible = material.opacity > 0.01;
    },
  };
  return state;
}
