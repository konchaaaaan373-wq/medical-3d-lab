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
 * PROTOTYPE. The gland grows, the channel through it narrows, and the stream
 * falls away much faster than the calibre does — flow through a tube depends
 * steeply on its radius. The exponent used here (fourth power) is the classical
 * relationship for steady laminar flow, used as a *qualitative* shape: nothing
 * on screen is a flow rate, and a real stream is neither steady nor laminar.
 *
 * The bladder above comes from the renal system unchanged.
 */
function createModel() {
  const object = new THREE.Group();
  const prostate = buildProstate({ color: PROSTATE_OUTFLOW.palette.gland, urethraColor: PROSTATE_OUTFLOW.palette.urethra });

  const bladder = buildBladder({ color: PROSTATE_OUTFLOW.palette.bladder, fluidColor: PROSTATE_OUTFLOW.palette.urine });
  bladder.object.position.set(0, 1.65, 0);
  bladder.object.scale.setScalar(0.95);
  bladder.setFill(0.75);

  const flowPath = smoothCurve([
    [0, 1.5, 0],
    [0, 0.9, 0.01],
    [0, 0.2, 0.03],
    [0, -0.5, 0.02],
    [0, -1.35, 0],
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
    anchors: { ...prostate.anchors, bladderNeck: new THREE.Vector3(-1.1, 1.75, 0.5) },
    setProgress(value) {
      enlargement = value;
      prostate.setEnlargement(enlargement);
    },
    update(dt) {
      // Flow falls with the fourth power of the calibre: halving the radius
      // costs far more than half the stream. Shown, not asserted.
      const calibre = prostate.calibre(enlargement);
      const stream = Math.pow(calibre, 4);
      flow.setRate(0.15 + 2.6 * stream);
      flow.setOpacity(0.25 + 0.65 * stream);
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
