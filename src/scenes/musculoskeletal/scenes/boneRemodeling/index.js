import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { smoothCurve } from '../../../shared/geometry/tube.js';
import { lerp } from '../../../../utils/math.js';
import { BONE_REMODELING } from '../../../../data/prototypes/musculoskeletal.js';
import { buildBone } from '../../organs/bone.js';

/**
 * Scene: bone as a balance rather than a structure.
 *
 * PROTOTYPE. Two opposing streams on the same surface — material leaving and
 * material arriving. At the left of the slider they match and the bone keeps
 * its shape; move right and removal wins, the cavity widens and the cortex
 * thins while the outside barely changes.
 *
 * The streams are a schematic of cell activity. There are no osteoclasts or
 * osteoblasts here, no mineral, no time course, and no bone density.
 */
function createModel() {
  const object = new THREE.Group();
  const bone = buildBone({ color: BONE_REMODELING.palette.cortex, marrowColor: BONE_REMODELING.palette.marrow });

  // Resorption: outwards off the cortical surface. Formation: inwards onto it.
  const outward = [];
  const inward = [];
  for (const point of bone.surfacePoints) {
    const away = new THREE.Vector3(point.x, 0, point.z).normalize().multiplyScalar(0.55);
    outward.push(
      smoothCurve([
        [point.x, point.y, point.z],
        [point.x + away.x * 0.6, point.y + 0.1, point.z + away.z * 0.6],
        [point.x + away.x * 1.5, point.y + 0.22, point.z + away.z * 1.5],
      ])
    );
    inward.push(
      smoothCurve([
        [point.x + away.x * 1.5, point.y - 0.22, point.z + away.z * 1.5],
        [point.x + away.x * 0.6, point.y - 0.1, point.z + away.z * 0.6],
        [point.x, point.y, point.z],
      ])
    );
  }

  const resorption = createFlowStream({
    curves: outward,
    count: 120,
    color: BONE_REMODELING.palette.resorption,
    size: 4.6,
    speed: 0.3,
    spread: 0.05,
    seed: 121,
    opacity: 0.6,
  });
  const formation = createFlowStream({
    curves: inward,
    count: 120,
    color: BONE_REMODELING.palette.formation,
    size: 4.6,
    speed: 0.3,
    spread: 0.05,
    seed: 122,
    opacity: 0.6,
  });

  object.add(bone.object, resorption.object, formation.object);

  let balance = 0;

  return {
    object,
    // The streams reach well past the bone on both sides; framing on all of it
    // left the bone off-centre with a column of empty space beside it.
    focus: bone.object,
    anchors: bone.anchors,
    setProgress(value) {
      balance = value;
      bone.setCavity(balance);
      // The two streams are equal at the left of the slider and separate as it
      // moves — the imbalance is the message, so it is drawn as a difference
      // between two visible rates rather than stated in a caption.
      resorption.setOpacity(lerp(0.55, 0.95, balance));
      formation.setOpacity(lerp(0.55, 0.22, balance));
    },
    update(dt) {
      resorption.setRate(lerp(1, 1.8, balance));
      formation.setRate(lerp(1, 0.45, balance));
      resorption.update(dt);
      formation.update(dt);
    },
    dispose() {
      resorption.dispose();
      formation.dispose();
    },
  };
}

export default definePrototypeScene({
  copy: BONE_REMODELING,
  cameraPose: { position: [1.6, 0.6, 6.4], target: [0, -0.05, 0] },
  createModel,
});
