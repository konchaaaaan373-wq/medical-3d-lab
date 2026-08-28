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
  kidney.object.position.set(0, -0.85, 0);
  kidney.object.scale.setScalar(0.95);

  const adrenal = buildAdrenal({
    cortexColor: ADRENAL_RESPONSE.palette.cortex,
    medullaColor: ADRENAL_RESPONSE.palette.medulla,
  });
  adrenal.object.position.set(0, 0.42, 0);

  // The vein the gland drains into, running off towards the midline. Short and
  // curved: as a long straight rod it read as a pointer rather than a vessel.
  const veinCurve = smoothCurve([
    [0.05, 0.36, 0.12],
    [-0.4, 0.5, 0.06],
    [-0.86, 0.58, -0.08],
    [-1.2, 0.5, -0.24],
  ]);
  const vein = new THREE.Mesh(
    new TubeSurface(veinCurve, { radius: (u) => 0.08 + 0.04 * u, steps: 30, radial: 12 }).geometry,
    tissueMaterial({ color: '#6f7fd6', roughness: 0.4, opacity: 0.8 })
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
    count: 60,
    color: ADRENAL_RESPONSE.palette.fast,
    size: 3.6,
    speed: 0.55,
    spread: 0.05,
    seed: 91,
    opacity: 0.08,
  });

  const slow = createFlowStream({
    curves: pathsFrom(adrenal.cortexPoints),
    count: 80,
    color: ADRENAL_RESPONSE.palette.slow,
    size: 3.6,
    speed: 0.26,
    spread: 0.06,
    seed: 92,
    opacity: 0.08,
  });

  object.add(kidney.object, vein, adrenal.object, fast.object, slow.object);

  let stress = 0;

  return {
    object,
    // The gland is the subject, but it is a cap on something much larger: framed
    // on the gland alone the camera closes right in and loses the kidney that
    // says what it is, and framed on both, the gland ends up small and high.
    // `framing.headroom` below opens the shot out from the gland instead.
    focus: adrenal.object,
    // In world coordinates, not the gland's own: the adrenal builder places its
    // anchors relative to itself, and the gland sits above the origin here.
    anchors: {
      cortex: new THREE.Vector3(-0.95, 0.95, 0.4),
      medulla: new THREE.Vector3(0.72, 0.42, 0.45),
      kidney: new THREE.Vector3(1.1, -1.35, 0.4),
      vein: new THREE.Vector3(-1.45, 0.95, 0.2),
    },
    setProgress(value) {
      stress = value;
      // Two different shapes on purpose: the medullary response is already at
      // full height while the cortical one is still climbing, and it fades
      // first. Illustrative timing, not measured kinetics.
      const immediate = smoothstep(0.02, 0.3, stress) * (1 - 0.45 * smoothstep(0.6, 1, stress));
      const sustained = smoothstep(0.4, 0.95, stress);
      // Kept well below full: additive particles on a short path pile up, and
      // the bloom turned the stream into a solid white streak brighter than the
      // gland it was leaving.
      fast.setOpacity(0.05 + 0.32 * immediate);
      slow.setOpacity(0.05 + 0.3 * sustained);
      fast.setRate(0.2 + 2.6 * immediate);
      slow.setRate(0.2 + 1.5 * sustained);
      // The cortex thickens a little under sustained drive — a hint at what
      // chronic stimulation does to a gland, drawn as shape, not as a number.
      const cortexMesh = adrenal.object.getObjectByName('cortex');
      const grow = 1 + 0.12 * sustained;
      cortexMesh.scale.set(grow, grow, grow);
      const medullaMesh = adrenal.object.getObjectByName('medulla');
      medullaMesh.material.emissiveIntensity = 0.34 + 0.4 * immediate;
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
  cameraPose: { position: [0.5, 0.75, 4.0], target: [-0.1, 0.1, 0] },
  // Twice the distance the gland alone would ask for, so the kidney under it
  // stays in the frame as context.
  framing: { headroom: 2.05, lift: 0.05 },
  createModel,
});
