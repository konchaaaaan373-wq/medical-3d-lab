import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { clamp, smoothstep } from '../../../../utils/math.js';
import { ADRENAL_RESPONSE } from '../../../../data/prototypes/endocrine.js';
import { buildAdrenal } from '../../organs/adrenal.js';
import { buildKidney } from '../../../renal/organs/kidney.js';

/**
 * Scene: one capsule, two clocks.
 *
 * PROTOTYPE. The medulla's stream appears almost as soon as the slider moves;
 * the cortex's builds later and outlasts it. That difference in timing is the
 * only claim this scene makes, and it is qualitative — the curves below are
 * shaped for legibility, not fitted to measured hormone levels.
 *
 * The kidney underneath comes from the renal system, unchanged: it is here as
 * the landmark that says where an adrenal gland is.
 */
function createModel() {
  const object = new THREE.Group();

  const kidney = buildKidney({ side: 'left', color: ADRENAL_RESPONSE.palette.kidney, opacity: 0.7 });
  kidney.object.position.set(0, -0.75, 0);
  kidney.object.scale.setScalar(1.15);

  const adrenal = buildAdrenal({
    cortexColor: ADRENAL_RESPONSE.palette.cortex,
    medullaColor: ADRENAL_RESPONSE.palette.medulla,
  });
  adrenal.object.position.set(0, 0.42, 0);

  // The vein the gland drains into, running off towards the midline.
  const veinCurve = smoothCurve([
    [0.1, 0.3, 0.2],
    [-0.5, 0.45, 0.25],
    [-1.15, 0.62, 0.2],
    [-1.8, 0.7, 0.1],
  ]);
  const vein = new THREE.Mesh(
    new TubeSurface(veinCurve, { radius: (u) => 0.07 + 0.03 * u, steps: 30, radial: 12 }).geometry,
    tissueMaterial({ color: '#6f7fd6', roughness: 0.4, opacity: 0.75 })
  );

  const pathsFrom = (points) =>
    points.map((point) =>
      smoothCurve([
        [point.x, point.y + 0.42, point.z],
        [point.x * 0.5, point.y + 0.5, point.z * 0.5 + 0.1],
        [veinCurve.getPointAt(0.35).x, veinCurve.getPointAt(0.35).y, veinCurve.getPointAt(0.35).z],
        [veinCurve.getPointAt(1).x, veinCurve.getPointAt(1).y, veinCurve.getPointAt(1).z],
      ])
    );

  const fast = createFlowStream({
    curves: pathsFrom([adrenal.medullaPoint]),
    count: 90,
    color: ADRENAL_RESPONSE.palette.fast,
    size: 5.4,
    speed: 0.55,
    spread: 0.035,
    seed: 91,
    opacity: 0.1,
  });

  const slow = createFlowStream({
    curves: pathsFrom(adrenal.cortexPoints),
    count: 110,
    color: ADRENAL_RESPONSE.palette.slow,
    size: 4.8,
    speed: 0.26,
    spread: 0.045,
    seed: 92,
    opacity: 0.1,
  });

  object.add(kidney.object, vein, adrenal.object, fast.object, slow.object);

  let stress = 0;

  return {
    object,
    anchors: {
      ...adrenal.anchors,
      kidney: new THREE.Vector3(1.15, -1.35, 0.4),
      vein: new THREE.Vector3(-1.95, 1.15, 0.3),
    },
    setProgress(value) {
      stress = value;
      // Two different shapes on purpose: the medullary response is already at
      // full height while the cortical one is still climbing, and it fades
      // first. Illustrative timing, not measured kinetics.
      const immediate = smoothstep(0.02, 0.3, stress) * (1 - 0.45 * smoothstep(0.6, 1, stress));
      const sustained = smoothstep(0.4, 0.95, stress);
      fast.setOpacity(0.08 + 0.85 * immediate);
      slow.setOpacity(0.08 + 0.8 * sustained);
      fast.setRate(0.2 + 2.6 * immediate);
      slow.setRate(0.2 + 1.5 * sustained);
      // The cortex thickens a little under sustained drive — a hint at what
      // chronic stimulation does to a gland, drawn as shape, not as a number.
      const cortexMesh = adrenal.object.getObjectByName('cortex');
      const grow = 1 + 0.12 * sustained;
      cortexMesh.scale.set(grow, grow, grow);
      const medullaMesh = adrenal.object.getObjectByName('medulla');
      medullaMesh.material.emissiveIntensity = 0.22 + 0.5 * immediate;
    },
    update(dt) {
      fast.update(dt);
      slow.update(dt);
    },
    dispose() {
      fast.dispose();
      slow.dispose();
    },
  };
}

export default definePrototypeScene({
  copy: ADRENAL_RESPONSE,
  cameraPose: { position: [0.6, 0.9, 4.4], target: [-0.15, -0.05, 0] },
  createModel,
});
