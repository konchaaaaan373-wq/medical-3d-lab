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
 * PROTOTYPE. Remodelling happens at discrete sites, and at each site it is a
 * *sequence*, not a tug-of-war: resorption first, then a reversal pause, then
 * formation into the space that was made. The sites here run at staggered
 * phases, so at any instant some are resorbing, some are between, and some are
 * filling — which is what makes the bone look busy while its shape holds.
 *
 * The slider is the **balance** between how much each cycle removes and how
 * much it puts back. It does not speed the cycles up; it changes what they
 * leave behind. The cortical thinning and the widened marrow cavity are the
 * accumulated result of running at that balance for years, not of the handful
 * of cycles on screen — a single site moves far too little bone to see.
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
  /** Where each site is in its own resorption → reversal → formation cycle. */
  let phase = 0;

  /**
   * The remodelling sequence at one site, as two 0..1 activities.
   *
   * Resorption occupies the first part of the cycle, formation the last, and
   * between them is the reversal period when neither is happening. In life
   * formation takes much longer than resorption; the proportions here follow
   * that ordering without claiming its duration.
   */
  const sequence = (sitePhase) => {
    const t = ((sitePhase % 1) + 1) % 1;
    const window = (from, to) => {
      if (t < from || t > to) return 0;
      return Math.sin((Math.PI * (t - from)) / (to - from)) ** 2;
    };
    return { resorbing: window(0, 0.28), forming: window(0.42, 1) };
  };

  return {
    object,
    // The streams reach well past the bone on both sides; framing on all of it
    // left the bone off-centre with a column of empty space beside it.
    focus: bone.object,
    anchors: bone.anchors,
    setProgress(value) {
      balance = value;
      bone.setCavity(balance);
    },
    update(dt) {
      // One cycle takes a few seconds on screen. That is a presentation rate:
      // a real remodelling cycle takes months, and nothing here depends on
      // the number chosen.
      phase = (phase + dt * 0.12) % 1;

      // The sites are staggered, so the bone shows the whole sequence at once
      // rather than pulsing in unison. Two representative phases drive the two
      // streams; what each site *leaves behind* is the balance, and that is
      // what has already been applied to the shape above.
      const early = sequence(phase);
      const late = sequence(phase + 0.5);
      const resorbing = Math.max(early.resorbing, late.resorbing);
      const forming = Math.max(early.forming, late.forming);

      // A negative balance means each cycle puts back less than it took, so
      // formation is the activity that thins out — not resorption that races.
      resorption.setOpacity(0.06 + 0.85 * resorbing);
      formation.setOpacity(0.06 + 0.85 * forming * lerp(1, 0.35, balance));
      resorption.setRate(0.5 + 1.2 * resorbing);
      formation.setRate((0.5 + 1.2 * forming) * lerp(1, 0.45, balance));
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
