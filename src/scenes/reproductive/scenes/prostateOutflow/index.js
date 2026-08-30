import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { smoothCurve } from '../../../shared/geometry/tube.js';
import { PROSTATE_OUTFLOW } from '../../../../data/prototypes/reproductive.js';
import { buildProstate } from '../../organs/prostate.js';
import { buildBladder } from '../../../renal/organs/kidney.js';

/**
 * Scene: why a small narrowing matters so much.
 *
 * PROTOTYPE. The gland grows and the channel through it narrows: growth is
 * inwards as well as outwards, which is the one spatial fact this scene is for.
 *
 * **No flow law is applied here.** An earlier version drove the stream from the
 * fourth power of the urethral radius. That is the classical relationship for
 * steady laminar flow in a rigid smooth tube, and micturition is none of those
 * things — the urethra is compliant, the flow is unsteady and partly turbulent,
 * and the stream also depends on detrusor contraction and on a smooth-muscle
 * component of the outlet that no slider here represents. Predicting a flow
 * rate from calibre alone would be a quantitative claim this prototype cannot
 * support, so the stream is shown thinning as the channel narrows and nothing
 * more is asserted.
 *
 * Not modelled: the bladder as a pump, the dynamic (smooth-muscle) component of
 * outlet resistance, symptoms, and any relationship to flow rate in mL/s.
 *
 * The bladder above comes from the renal system unchanged.
 */
function createModel() {
  const object = new THREE.Group();
  const prostate = buildProstate({ color: PROSTATE_OUTFLOW.palette.gland, urethraColor: PROSTATE_OUTFLOW.palette.urethra });

  // Sitting directly on the gland: the bladder neck opens into the prostatic
  // urethra, and a gap between them loses exactly the relationship the scene
  // is about.
  const bladder = buildBladder({ color: PROSTATE_OUTFLOW.palette.bladder, fluidColor: PROSTATE_OUTFLOW.palette.urine });
  bladder.object.position.set(0, 1.32, 0);
  // Clearly the larger of the two: at similar sizes the pair reads as a
  // snowman rather than as a gland sitting under a reservoir.
  bladder.object.scale.setScalar(1.15);
  bladder.setFill(0.7);

  const flowPath = smoothCurve([
    [0, 1.15, 0],
    [0, 0.6, 0.01],
    [0, 0.1, 0.03],
    [0, -0.45, 0.02],
    [0, -1.15, 0],
  ]);
  const flow = createFlowStream({
    curves: [flowPath],
    count: 120,
    color: PROSTATE_OUTFLOW.palette.urine,
    size: 4.6,
    speed: 0.55,
    spread: 0.03,
    seed: 141,
    opacity: 0.85,
  });

  object.add(bladder.object, prostate.object, flow.object);

  let enlargement = 0;

  return {
    object,
    anchors: { ...prostate.anchors, bladderNeck: new THREE.Vector3(-1.25, 1.72, 0.5) },
    setProgress(value) {
      enlargement = value;
      prostate.setEnlargement(enlargement);
    },
    update(dt) {
      // The stream thins as the channel does. Deliberately close to
      // proportional: any steeper exponent would be reading a flow law into a
      // prototype that has no pump, no compliance and no pressure in it.
      const calibre = prostate.calibre(enlargement);
      flow.setRate(0.2 + 1.9 * calibre);
      flow.setOpacity(0.25 + 0.6 * calibre);
      flow.update(dt);
    },
    dispose() {
      flow.dispose();
      prostate.dispose();
    },
  };
}

export default definePrototypeScene({
  copy: PROSTATE_OUTFLOW,
  cameraPose: { position: [0.7, 0.6, 5.2], target: [0, 0.2, 0] },
  createModel,
});
