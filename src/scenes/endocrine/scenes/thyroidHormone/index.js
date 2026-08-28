import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { smoothCurve } from '../../../shared/geometry/tube.js';
import { smoothstep } from '../../../../utils/math.js';
import { THYROID_HORMONE } from '../../../../data/prototypes/endocrine.js';
import { buildThyroid } from '../../organs/thyroid.js';
import { buildAirway } from '../../../respiratory/organs/airway.js';

/**
 * Scene: where thyroid hormone goes when it is released.
 *
 * PROTOTYPE. The gland is drawn translucent so the follicles inside it are
 * visible, and each follicle sends particles outwards into the surrounding
 * capillary bed as stimulation rises. The trachea is borrowed from the
 * respiratory system: it is the landmark that makes the thyroid identifiable,
 * and re-drawing it here would be a copy.
 *
 * Not modelled: iodine, TSH, T3/T4 as distinct molecules, the feedback loop, or
 * any hormone concentration.
 */
function createModel() {
  const object = new THREE.Group();

  const airway = buildAirway({ color: THYROID_HORMONE.palette.trachea, rings: 7, bronchi: false });
  // The airway builder places the trachea in the chest; here it is only a
  // landmark, so it is brought down to the gland and trimmed to size.
  airway.object.position.set(0, -2.6, -0.18);
  airway.object.scale.setScalar(1.05);

  const thyroid = buildThyroid({
    color: THYROID_HORMONE.palette.gland,
    follicleColor: THYROID_HORMONE.palette.follicle,
  });

  // Short paths from each follicle outwards, standing in for the capillary bed.
  const releasePaths = thyroid.folliclePoints.map((point) => {
    const outward = point.clone().normalize().multiplyScalar(0.55);
    return smoothCurve([
      [point.x, point.y, point.z],
      [point.x + outward.x * 0.6, point.y + outward.y * 0.6 + 0.05, point.z + outward.z * 0.6],
      [point.x + outward.x * 1.4, point.y + outward.y * 1.4 + 0.16, point.z + outward.z * 1.4],
    ]);
  });

  const hormone = createFlowStream({
    curves: releasePaths,
    count: 180,
    color: THYROID_HORMONE.palette.hormone,
    size: 5.0,
    speed: 0.42,
    spread: 0.02,
    seed: 81,
    opacity: 0.25,
  });

  object.add(airway.object, thyroid.object, hormone.object);

  let stimulation = 0;

  return {
    object,
    anchors: { ...thyroid.anchors, trachea: new THREE.Vector3(-0.55, 1.15, 0.3) },
    setProgress(value) {
      stimulation = value;
      hormone.setOpacity(0.18 + 0.72 * smoothstep(0.05, 0.85, stimulation));
    },
    update(dt) {
      hormone.setRate(0.3 + 2.2 * stimulation);
      hormone.update(dt);
    },
    dispose() {
      hormone.dispose();
      thyroid.dispose();
      airway.dispose();
    },
  };
}

export default definePrototypeScene({
  copy: THYROID_HORMONE,
  cameraPose: { position: [0.4, 0.25, 3.9], target: [0, -0.05, 0] },
  createModel,
});
