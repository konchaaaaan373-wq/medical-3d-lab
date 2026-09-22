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
const VENOUS_PATH = smoothCurve([
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

/** Where along the arterial run the resistance is marked, in path coordinates. */
const RESISTANCE_ZONE = { from: 0.5, to: 0.92 };
const BAND_POSITIONS = [0.58, 0.7, 0.82];

/** The node standing for the right heart and the pulmonary circulation. */
const NODE_POSITION = new THREE.Vector3(6.4, -0.2, -2.95);

/** Anchors a label may hang from. World coordinates, since nothing here moves. */
const CIRCUIT_ANCHORS = {
  resistance: ARTERIAL_PATH.getPointAt((RESISTANCE_ZONE.from + RESISTANCE_ZONE.to) / 2),
  return: VENOUS_PATH.getPointAt(0.45),
  node: NODE_POSITION.clone(),
};

/**
 * @param {{ compact?: boolean }} [options]
 */
export function buildCircuit({ compact = false } = {}) {
  const object = new THREE.Group();
  object.name = 'circuit';

  const arterialTube = new TubeSurface(ARTERIAL_PATH, {
    radius: () => 0.17,
    steps: compact ? 48 : 72,
    radial: compact ? 12 : 16,
  });
  const venousTube = new TubeSurface(VENOUS_PATH, {
    radius: () => 0.2,
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

  // The bands mark the zone rather than pinch one spot. A single ring closing
  // on a tube reads as a stenosis, which is a local lesion — the opposite of
  // what a distributed arteriolar resistance is.
  const bandMaterial = new THREE.MeshBasicMaterial({
    color: PALETTE.resistance,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  const bands = new THREE.Group();
  bands.name = 'resistance-zone';
  for (const u of BAND_POSITIONS) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.07, 10, 28), bandMaterial);
    band.position.copy(ARTERIAL_PATH.getPointAt(u));
    const tangent = ARTERIAL_PATH.getTangentAt(u);
    band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    bands.add(band);
  }

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
    bands,
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

  return {
    object,
    anchors: CIRCUIT_ANCHORS,

    /**
     * @param {{ cardiacOutputLMin: number, systemicResistanceMmHgSPerMl: number,
     *   meanArterialPressureMmHg: number }} metrics from the solved beat
     * @param {{ min: number, max: number }} resistanceDomain
     */
    setState(metrics, resistanceDomain) {
      // Normalised positions inside the ranges the model can reach, so the
      // drawing uses its whole span instead of crowding into a corner.
      const flow = clamp((metrics.cardiacOutputLMin - 2.0) / 6.0);
      const pressure = clamp((metrics.meanArterialPressureMmHg - 40) / 120);
      const resistance = clamp(
        (metrics.systemicResistanceMmHgSPerMl - resistanceDomain.min) /
          (resistanceDomain.max - resistanceDomain.min)
      );

      // Rate rides on speed alone. Doubling the particle count as well would
      // show one change in cardiac output twice and make it look larger than
      // the model said.
      const particleSpeed = 0.55 + flow * 1.25;
      const calibre = lerp(1.06, 0.68, resistance);

      arterialFlow.setRate(particleSpeed);
      venousFlow.setRate(particleSpeed);
      returnFlow.setRate(particleSpeed);
      arterialMaterial.emissiveIntensity = 0.06 + pressure * 0.26;
      bandMaterial.opacity = 0.26 + resistance * 0.54;

      // Narrow the marked zone only. The run leaving the ventricle keeps its
      // calibre, because the resistance being represented is arteriolar.
      arterialTube.refresh((u, base) => {
        const inZone = smoothstep(RESISTANCE_ZONE.from, RESISTANCE_ZONE.from + 0.1, u) *
          (1 - smoothstep(RESISTANCE_ZONE.to - 0.06, RESISTANCE_ZONE.to, u));
        return base * lerp(1, calibre, inZone);
      });
      for (const band of bands.children) band.scale.setScalar(calibre);

      presentation = {
        particleSpeed,
        particleCount,
        returnParticleCount: Math.round(particleCount * 0.7),
        calibre,
        arterialEmissive: arterialMaterial.emissiveIntensity,
        bandOpacity: bandMaterial.opacity,
      };
    },

    /** @returns {null | {particleSpeed:number, particleCount:number, calibre:number}} */
    presentationState() {
      return presentation;
    },

    update(dt) {
      arterialFlow.update(dt);
      venousFlow.update(dt);
      returnFlow.update(dt);
    },

    dispose() {
      arterialFlow.dispose();
      venousFlow.dispose();
      returnFlow.dispose();
    },
  };
}
