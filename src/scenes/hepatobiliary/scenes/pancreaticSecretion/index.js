import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { smoothstep } from '../../../../utils/math.js';
import { PANCREATIC_SECRETION } from '../../../../data/prototypes/hepatobiliary.js';
import { buildPancreas } from '../../organs/pancreas.js';
import { buildDuodenum } from '../../../gastrointestinal/organs/intestine.js';

/**
 * Scene: the same gland secreting in two directions.
 *
 * PROTOTYPE. The thing worth seeing is that the two secretions do not share a
 * route: enzymes travel along the duct and out into the bowel, while islet
 * hormones leave sideways into a vessel and never enter the duct at all.
 *
 * Not modelled: which enzymes, which hormones, the stimuli that trigger either,
 * and any quantity of anything.
 */
function createModel() {
  const object = new THREE.Group();
  const pancreas = buildPancreas({
    color: PANCREATIC_SECRETION.palette.gland,
    ductColor: PANCREATIC_SECRETION.palette.duct,
    isletColor: PANCREATIC_SECRETION.palette.islet,
  });
  // Scaled and placed so the pancreatic head sits inside the C of it, which is
  // the one spatial fact this pair of organs is for.
  const duodenum = buildDuodenum();
  duodenum.object.position.set(-0.42, -0.12, -0.12);
  duodenum.object.scale.setScalar(0.72);

  // A vein running behind the gland — where the islets secrete to. Curved and
  // kept short: drawn as a long straight rod it read as a ruler, not a vessel.
  const veinCurve = smoothCurve([
    [-1.15, -0.72, -0.5],
    [-0.35, -0.62, -0.56],
    [0.5, -0.44, -0.52],
    [1.25, -0.2, -0.4],
  ]);
  const veinMesh = new THREE.Mesh(
    new TubeSurface(veinCurve, { radius: (u) => 0.13 - 0.05 * u, steps: 40, radial: 12 }).geometry,
    tissueMaterial({ color: '#6f7fd6', roughness: 0.4, opacity: 0.85 })
  );

  // Exocrine: along the duct, out through the head into the duodenum.
  const enzymePath = smoothCurve([
    ...pancreas.curve.getSpacedPoints(10).reverse().map((p) => [p.x, p.y, p.z]),
    [-1.72, -0.6, 0.1],
    [-1.85, -0.85, 0.1],
  ]);
  const enzymes = createFlowStream({
    curves: [enzymePath],
    count: 130,
    color: PANCREATIC_SECRETION.palette.enzyme,
    size: 4.6,
    speed: 0.3,
    spread: 0.035,
    seed: 51,
    opacity: 0.5,
  });

  // Endocrine: short hops from each islet to the vein behind the gland.
  const hormonePaths = pancreas.isletPoints.map((point) =>
    smoothCurve([
      [point.x, point.y, point.z],
      [point.x - 0.05, point.y - 0.3, point.z - 0.25],
      [point.x - 0.1, point.y - 0.55, veinCurve.getPointAt(0.5).z + 0.05],
    ])
  );
  const hormones = createFlowStream({
    curves: hormonePaths,
    count: 90,
    color: PANCREATIC_SECRETION.palette.islet,
    size: 5.2,
    speed: 0.4,
    spread: 0.03,
    seed: 52,
    opacity: 0.2,
  });

  object.add(veinMesh, pancreas.object, duodenum.object, enzymes.object, hormones.object);

  let drive = 0;

  return {
    object,
    // The gland is the subject; the duodenum and the vein are context.
    focus: pancreas.object,
    anchors: { ...pancreas.anchors, duodenum: new THREE.Vector3(-2.1, -1.05, 0.5) },
    setProgress(value) {
      drive = value;
      // The exocrine stream leads; the islet response is shown building later,
      // which is a teaching order, not a measured time course.
      enzymes.setOpacity(0.25 + 0.6 * smoothstep(0.1, 0.6, drive));
      hormones.setOpacity(0.15 + 0.75 * smoothstep(0.5, 0.95, drive));
    },
    update(dt) {
      enzymes.setRate(0.35 + 2.2 * smoothstep(0.1, 0.8, drive));
      hormones.setRate(0.3 + 2.0 * smoothstep(0.45, 1, drive));
      enzymes.update(dt);
      hormones.update(dt);
    },
    dispose() {
      enzymes.dispose();
      hormones.dispose();
      pancreas.dispose();
      duodenum.dispose();
    },
  };
}

export default definePrototypeScene({
  copy: PANCREATIC_SECRETION,
  // Looking slightly down on it: seen edge-on, a gland this flat is a line.
  cameraPose: { position: [0.35, 1.5, 5.4], target: [0, 0.05, 0] },
  createModel,
});
