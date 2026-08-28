import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { smoothCurve } from '../../../shared/geometry/tube.js';
import { lerp, smoothstep } from '../../../../utils/math.js';
import { UPPER_GI } from '../../../../data/prototypes/gastrointestinal.js';
import { buildEsophagus, buildStomach } from '../../organs/stomach.js';

/**
 * Scene: a swallow, then the stomach working on what arrived.
 *
 * PROTOTYPE. One idea: peristalsis is a travelling narrowing, and the same
 * mechanism reads as *transport* in the oesophagus and as *mixing* in the
 * stomach only because of where the waves are deep and how often they come.
 *
 * The progression axis is how hard the stomach is working, not a clock and not
 * a disease. Not modelled: gastric acid and enzymes, receptive relaxation, the
 * sphincters as real valves, and any timing that could be called a gastric
 * emptying rate.
 */
function createModel() {
  const object = new THREE.Group();
  const stomach = buildStomach({ color: UPPER_GI.palette.stomach, pylorusColor: UPPER_GI.palette.mucosa });
  const esophagus = buildEsophagus({ color: UPPER_GI.palette.esophagus });

  // Contents follow the lumen: down the oesophagus, round the stomach, out
  // through the pylorus. One path, so the particles cannot leave the organ.
  const lumen = smoothCurve([
    ...esophagus.curve.getSpacedPoints(8).map((p) => [p.x, p.y, p.z]),
    ...stomach.curve.getSpacedPoints(14).map((p) => [p.x, p.y, p.z]),
    [-1.5, -0.12, 0],
  ]);
  const contents = createFlowStream({
    curves: [lumen],
    count: 130,
    color: UPPER_GI.palette.content,
    size: 5.0,
    speed: 0.1,
    spread: 0.13,
    seed: 5,
    opacity: 0.6,
  });

  object.add(esophagus.object, stomach.object, contents.object);

  let motility = 0;
  let phase = 0;

  return {
    object,
    anchors: { ...stomach.anchors, ...esophagus.anchors },
    setProgress(value) {
      motility = value;
    },
    update(dt, elapsed) {
      // The wave train advances a little faster as motility rises; both organs
      // read the same phase so the swallow and the gastric wave stay one
      // sequence rather than two loops that drift apart.
      phase = (phase + dt * lerp(0.16, 0.3, motility)) % 1;

      // A swallow is a single wave and happens whether or not the stomach is
      // busy; it is the one motion present at rest.
      esophagus.setWave(phase, 0.55 + 0.35 * motility);

      // Gastric waves appear with motility and deepen towards the antrum.
      const gastric = smoothstep(0.12, 0.75, motility);
      stomach.setWave(phase, gastric, { count: motility > 0.7 ? 3 : 2 });

      contents.setRate(0.25 + 2.4 * motility);
      contents.setOpacity(0.45 + 0.3 * motility);
      contents.update(dt);
    },
    dispose() {
      contents.dispose();
      stomach.dispose();
      esophagus.dispose();
    },
  };
}

export default definePrototypeScene({
  copy: UPPER_GI,
  cameraPose: { position: [0.6, 1.1, 9.6], target: [0.1, 0.55, 0] },
  createModel,
});
