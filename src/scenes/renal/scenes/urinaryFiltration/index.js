import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { lerp, smoothstep } from '../../../../utils/math.js';
import { travellingWave } from '../../../shared/motion/rhythm.js';
import { URINARY_FILTRATION } from '../../../../data/prototypes/renal.js';
import { buildBladder, buildKidney, buildUreter } from '../../organs/kidney.js';

/**
 * Scene: one route, three jobs.
 *
 * PROTOTYPE. Filtration is continuous, transport is active, storage is
 * intermittent — and they are three different organs doing three different
 * things along the same path. The slider fills the bladder; the kidneys keep
 * working regardless, which is the point.
 *
 * Not modelled: the nephron, anything about what is filtered or reabsorbed,
 * pressures, volumes, and micturition.
 */
function createModel() {
  const object = new THREE.Group();

  const right = buildKidney({ side: 'right', color: URINARY_FILTRATION.palette.kidney, medullaColor: URINARY_FILTRATION.palette.medulla });
  const left = buildKidney({ side: 'left', color: URINARY_FILTRATION.palette.kidney, medullaColor: URINARY_FILTRATION.palette.medulla });
  right.object.position.set(-1.55, 1.35, 0);
  left.object.position.set(1.55, 1.5, 0);

  const bladder = buildBladder({ color: URINARY_FILTRATION.palette.tract, fluidColor: URINARY_FILTRATION.palette.urine });
  bladder.object.position.set(0, -1.75, 0.15);

  const rightUreter = buildUreter(
    [
      [-1.55 + right.hilum.x, 1.35 + right.hilum.y, 0],
      [-1.1, 0.5, 0.05],
      [-0.8, -0.5, 0.1],
      [-0.42, -1.35, 0.15],
      [-0.12, -1.72, 0.15],
    ],
    { color: URINARY_FILTRATION.palette.tract }
  );
  const leftUreter = buildUreter(
    [
      [1.55 + left.hilum.x, 1.5 + left.hilum.y, 0],
      [1.05, 0.6, 0.05],
      [0.78, -0.45, 0.1],
      [0.4, -1.35, 0.15],
      [0.12, -1.72, 0.15],
    ],
    { color: URINARY_FILTRATION.palette.tract }
  );

  object.add(right.object, left.object, rightUreter.object, leftUreter.object, bladder.object);

  // Filtrate forming inside each kidney, in the kidney's own frame.
  const filtrationStreams = [
    { kidney: right, seed: 61 },
    { kidney: left, seed: 62 },
  ].map(({ kidney, seed }) => {
    const stream = createFlowStream({
      curves: kidney.filtrationPaths,
      count: 110,
      color: URINARY_FILTRATION.palette.urine,
      size: 4.2,
      speed: 0.34,
      spread: 0.035,
      seed,
      opacity: 0.75,
    });
    kidney.object.add(stream.object);
    return stream;
  });

  const ureterFlow = createFlowStream({
    curves: [rightUreter.curve, leftUreter.curve],
    count: 90,
    color: URINARY_FILTRATION.palette.urine,
    size: 4.6,
    speed: 0.2,
    spread: 0.02,
    seed: 63,
    opacity: 0.85,
  });
  object.add(ureterFlow.object);

  let filling = 0;
  let phase = 0;

  return {
    object,
    anchors: {
      rightCortex: new THREE.Vector3(-2.6, 2.2, 0.5),
      rightHilum: new THREE.Vector3(-0.7, 1.2, 0.5),
      leftCortex: new THREE.Vector3(2.7, 2.35, 0.5),
      ureter: new THREE.Vector3(-1.35, -0.55, 0.5),
      // In world coordinates: the bladder builder's own anchor is relative to
      // the bladder, and the bladder sits low in this scene. Spread in as it
      // came, the label floated a body's width above the organ it names.
      bladder: new THREE.Vector3(0.95, -2.05, 0.6),
    },
    setProgress(value) {
      filling = value;
      bladder.setFill(filling);
    },
    update(dt) {
      // Ureteric peristalsis: a bolus travels down, so the tube visibly pushes
      // rather than leaks. Two waves, slow, independent of how full the
      // bladder is.
      phase = (phase + dt * 0.22) % 1;
      for (const ureter of [rightUreter, leftUreter]) {
        ureter.surface.refresh((u, base) => base * (1 + 1.5 * travellingWave(u, phase, { width: 0.05, count: 2 })));
      }

      // Filtration does not stop when the bladder is full; only the last part
      // of the route changes with filling.
      for (const stream of filtrationStreams) {
        stream.setRate(1);
        stream.update(dt);
      }
      ureterFlow.setRate(lerp(0.9, 0.55, smoothstep(0.8, 1, filling)));
      ureterFlow.update(dt);
    },
    dispose() {
      for (const stream of filtrationStreams) stream.dispose();
      ureterFlow.dispose();
      rightUreter.dispose();
      leftUreter.dispose();
    },
  };
}

export default definePrototypeScene({
  copy: URINARY_FILTRATION,
  cameraPose: { position: [0.5, 0.5, 9.4], target: [0, 0.05, 0] },
  createModel,
});
