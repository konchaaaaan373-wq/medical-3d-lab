import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { smoothCurve } from '../../../shared/geometry/tube.js';
import { lerp, smoothstep } from '../../../../utils/math.js';
import { INTESTINAL_TRANSIT } from '../../../../data/prototypes/gastrointestinal.js';
import { buildColon, buildSmallIntestine } from '../../organs/intestine.js';

/**
 * Scene: what "transit" actually is.
 *
 * PROTOTYPE. The same contractions that mix can propel; what changes is how
 * many there are and whether they travel. The slider moves between those two
 * patterns and the contents visibly stop dawdling.
 *
 * Not modelled: absorption, villi, the ileocaecal valve as a valve, bowel
 * length, and any transit time that could be read as hours.
 */
function createModel() {
  const object = new THREE.Group();
  const small = buildSmallIntestine({ color: INTESTINAL_TRANSIT.palette.small });
  // The colon sits behind and around the small-bowel coil, as it does in life.
  // The offset goes into the builder so that the curve the contents follow and
  // the anchors the labels hang from move with it.
  const colon = buildColon({ color: INTESTINAL_TRANSIT.palette.colon, offset: [0, 0, -0.35] });

  // Both curves are already where their tubes are drawn, so the contents run
  // inside the bowel rather than beside it.
  const lumen = smoothCurve([
    ...small.curve.getSpacedPoints(26).map((p) => [p.x, p.y, p.z]),
    ...colon.curve.getSpacedPoints(20).map((p) => [p.x, p.y, p.z]),
  ]);
  const contents = createFlowStream({
    curves: [lumen],
    count: 200,
    color: INTESTINAL_TRANSIT.palette.content,
    size: 4.6,
    speed: 0.06,
    spread: 0.08,
    seed: 17,
    opacity: 0.55,
  });

  object.add(small.object, colon.object, contents.object);

  let pattern = 0;
  let phase = 0;

  return {
    object,
    anchors: { ...small.anchors, ...colon.anchors },
    setProgress(value) {
      pattern = value;
    },
    update(dt, elapsed) {
      phase = (phase + dt * lerp(0.05, 0.22, pattern)) % 1;
      small.setMotility(phase, pattern);
      // The colon joins in late and gently: its bursts are the last thing to
      // appear, not a scaled copy of small-bowel activity.
      colon.setMotility((phase * 0.45) % 1, smoothstep(0.55, 1, pattern));

      contents.setRate(0.3 + 3.4 * pattern * pattern);
      contents.setOpacity(0.4 + 0.3 * pattern);
      contents.update(dt);
    },
    dispose() {
      contents.dispose();
      small.dispose();
      colon.dispose();
    },
  };
}

export default definePrototypeScene({
  copy: INTESTINAL_TRANSIT,
  cameraPose: { position: [0.4, 0.2, 11.2], target: [0, -0.2, 0] },
  createModel,
});
