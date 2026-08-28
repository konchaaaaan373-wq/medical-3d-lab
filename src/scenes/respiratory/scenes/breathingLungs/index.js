import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { breathCycle } from '../../../shared/motion/rhythm.js';
import { lerp } from '../../../../utils/math.js';
import { BREATHING_LUNGS } from '../../../../data/prototypes/respiratory.js';
import { buildLungs } from '../../organs/lungs.js';
import { buildAirway } from '../../organs/airway.js';

/**
 * Scene: breathing.
 *
 * PROTOTYPE. One cycle, one axis: the progression slider sets how deep the
 * breath is, and the same asymmetric cycle simply gets bigger. Air moves down
 * the airway on inspiration and back up on expiration, at a rate that follows
 * the cycle rather than a constant drift — the direction reversal is the part
 * worth seeing.
 *
 * What is not here: the diaphragm and chest wall (the actual pump), gas
 * exchange, and any relationship between the depth axis and a real tidal
 * volume in millilitres.
 */
function createModel() {
  const object = new THREE.Group();
  const lungs = buildLungs({ color: BREATHING_LUNGS.palette.lung, opacity: 0.94 });
  const airway = buildAirway({
    color: BREATHING_LUNGS.palette.airway,
    cartilage: BREATHING_LUNGS.palette.cartilage,
  });

  const air = createFlowStream({
    curves: airway.airPaths,
    count: 150,
    color: BREATHING_LUNGS.palette.air,
    size: 5.2,
    speed: 0.5,
    spread: 0.07,
    seed: 31,
    opacity: 0.75,
  });

  object.add(lungs.object, airway.object, air.object);

  /** Depth of breathing, 0..1 — how much of the modelled excursion is used. */
  let depth = 0;
  let previous = 0;

  return {
    object,
    anchors: { ...lungs.anchors, ...airway.anchors },
    setProgress(value) {
      depth = value;
    },
    update(dt, elapsed) {
      // Faster breathing as well as deeper: both change with demand, and a
      // deep breath at a resting rate reads as a sigh rather than as effort.
      const rate = lerp(13, 22, depth);
      const cycle = breathCycle(elapsed, rate);
      const excursion = lerp(0.3, 1, depth);
      lungs.setInflation(cycle * excursion);

      // Air follows the cycle: in while the lungs are filling, out while they
      // empty, and briefly still at the turn.
      const velocity = (cycle - previous) / Math.max(dt, 1e-4);
      previous = cycle;
      air.setRate(THREE.MathUtils.clamp(velocity * 1.6, -3, 3));
      air.setOpacity(0.35 + 0.5 * Math.min(1, Math.abs(velocity)));
      air.update(dt);
    },
    dispose() {
      air.dispose();
      airway.dispose();
    },
  };
}

export default definePrototypeScene({
  copy: BREATHING_LUNGS,
  cameraPose: { position: [1.6, 1.4, 11.8], target: [0, 0.35, 0] },
  createModel,
});
