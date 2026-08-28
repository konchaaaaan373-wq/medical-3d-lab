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

  const airway = buildAirway({
    color: THYROID_HORMONE.palette.trachea,
    // Dimmer than the default cartilage, which is tuned for a scene where the
    // airway is the subject. Here it must not be the brightest thing on screen.
    cartilage: '#9aa6b8',
    rings: 7,
    bronchi: false,
  });
  // The airway builder places the trachea in the chest; here it is only a
  // landmark, so it is brought down to the gland and trimmed to size. Smaller
  // and set back, because at full size a bright white pillar was the first
  // thing the eye landed on in a scene about the thyroid.
  airway.object.position.set(0, -2.4, -0.3);
  airway.object.scale.set(0.78, 0.92, 0.78);

  const thyroid = buildThyroid({
    color: THYROID_HORMONE.palette.gland,
    follicleColor: THYROID_HORMONE.palette.follicle,
  });

  // Short paths from each follicle to just outside the gland, standing in for
  // the capillary bed around it. Kept short on purpose: a long spray of dots
  // leaving the frame is decoration, and the distance travelled would be
  // saying something about circulation that this scene does not model.
  const releasePaths = thyroid.folliclePoints.map((point) => {
    const outward = point.clone().normalize().multiplyScalar(0.3);
    return smoothCurve([
      [point.x, point.y, point.z],
      [point.x + outward.x * 0.55, point.y + outward.y * 0.55 + 0.03, point.z + outward.z * 0.55],
      [point.x + outward.x, point.y + outward.y + 0.07, point.z + outward.z],
    ]);
  });

  const hormone = createFlowStream({
    curves: releasePaths,
    count: 120,
    color: THYROID_HORMONE.palette.hormone,
    size: 4.4,
    speed: 0.42,
    spread: 0.02,
    seed: 81,
    opacity: 0.25,
  });

  object.add(airway.object, thyroid.object, hormone.object);

  let stimulation = 0;

  return {
    object,
    focus: thyroid.object,
    anchors: { ...thyroid.anchors, trachea: new THREE.Vector3(-0.5, 0.95, 0.3) },
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
