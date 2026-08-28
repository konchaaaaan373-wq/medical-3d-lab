import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import { oscillate } from '../../../shared/motion/rhythm.js';
import { clamp, smoothstep } from '../../../../utils/math.js';
import { UTERINE_CYCLE } from '../../../../data/prototypes/reproductive.js';
import { buildUterus } from '../../organs/uterus.js';

/**
 * Scene: one organ, one recurring change.
 *
 * PROTOTYPE. The slider runs through a cycle and the lining rebuilds and is
 * lost. The muscular wall is deliberately unchanged throughout, because
 * "which layer is doing the changing" is the thing that is easy to get wrong
 * from a diagram.
 *
 * The thickness curve below is a shape, not data: it rises through the first
 * half, plateaus, and returns. No day numbers, no hormones, no measurements in
 * millimetres — those belong to a scene with a model behind it.
 */
function createModel() {
  const object = new THREE.Group();
  const uterus = buildUterus({
    myometrium: UTERINE_CYCLE.palette.myometrium,
    endometrium: UTERINE_CYCLE.palette.endometrium,
    ovary: UTERINE_CYCLE.palette.ovary,
    tube: UTERINE_CYCLE.palette.tube,
  });
  object.add(uterus.object);

  let cycle = 0;

  return {
    object,
    anchors: uterus.anchors,
    setProgress(value) {
      cycle = value;
      // Rebuild through the first half, hold, then fall away at the very end
      // as the cycle returns to its start.
      const grown = smoothstep(0.05, 0.55, cycle);
      const lost = smoothstep(0.9, 1, cycle);
      uterus.setLining(clamp(grown - lost * 0.85));
    },
    update(dt, elapsed) {
      // The myometrium is quietly active even between contractions; a very
      // small idle motion, so the organ does not read as a still image.
      const idle = 1 + 0.006 * oscillate(elapsed, 0.18);
      uterus.object.scale.set(idle, idle, idle);
    },
    dispose() {
      uterus.dispose();
    },
  };
}

export default definePrototypeScene({
  copy: UTERINE_CYCLE,
  cameraPose: { position: [0.6, 0.5, 5.0], target: [0, 0.05, 0] },
  createModel,
});
