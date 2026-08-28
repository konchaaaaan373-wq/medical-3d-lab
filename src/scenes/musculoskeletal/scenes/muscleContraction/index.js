import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import { oscillate } from '../../../shared/motion/rhythm.js';
import { lerp, smoothstep } from '../../../../utils/math.js';
import { MUSCLE_CONTRACTION } from '../../../../data/prototypes/musculoskeletal.js';
import { buildMuscle } from '../../organs/muscle.js';

/**
 * Scene: from separate twitches to a smooth contraction.
 *
 * PROTOTYPE. The slider raises activation, and two things change together: the
 * twitches come faster until they fuse, and the depth of shortening rises. That
 * fusion is the whole point — it is why a muscle can be held steady at all.
 *
 * Not modelled: motor units as discrete things, the length-tension
 * relationship, fatigue, force, or a joint for any of it to act on.
 */
function createModel() {
  const object = new THREE.Group();
  const muscle = buildMuscle({
    color: MUSCLE_CONTRACTION.palette.muscle,
    tendonColor: MUSCLE_CONTRACTION.palette.tendon,
  });
  object.add(muscle.object);

  let activation = 0;

  return {
    object,
    anchors: muscle.anchors,
    setProgress(value) {
      activation = value;
    },
    update(dt, elapsed) {
      // Rate rises with activation; the individual twitches stop being
      // separable once they overlap, which is what fusion looks like.
      const rate = lerp(1.1, 9, activation);
      const twitch = oscillate(elapsed, rate);
      const fusion = smoothstep(0.35, 0.8, activation);
      // Below fusion the muscle relaxes fully between twitches; above it, it
      // never returns to rest and the mean shortening carries the movement.
      const level = lerp(twitch, 0.55 + 0.45 * twitch, fusion);
      muscle.setContraction(level * lerp(0.25, 1, activation));
    },
    dispose() {
      muscle.dispose();
    },
  };
}

export default definePrototypeScene({
  copy: MUSCLE_CONTRACTION,
  cameraPose: { position: [1.0, 0.3, 6.0], target: [0, 0, 0] },
  createModel,
});
