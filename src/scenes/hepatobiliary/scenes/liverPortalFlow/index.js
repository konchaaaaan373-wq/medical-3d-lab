import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { lerp, smoothstep } from '../../../../utils/math.js';
import { LIVER_PORTAL_FLOW } from '../../../../data/prototypes/hepatobiliary.js';
import { buildGallbladder, buildLiver } from '../../organs/liver.js';
import { buildDuodenum } from '../../../gastrointestinal/organs/intestine.js';

/**
 * Scene: everything from the gut goes through here first.
 *
 * PROTOTYPE. Two flows, one organ: portal blood entering at the porta hepatis,
 * crossing the parenchyma and leaving by the hepatic veins; and bile going the
 * other way, out of the gallbladder and down to the duodenum after a meal.
 *
 * The duodenum is borrowed from the gastrointestinal system rather than
 * redrawn here — organ geometry is shared across systems on purpose.
 *
 * Not modelled: sinusoids, lobular architecture, the hepatic artery's separate
 * supply, actual flow rates, and anything about what the liver does to what
 * passes through it.
 */
function createModel() {
  const object = new THREE.Group();
  const liver = buildLiver({ color: LIVER_PORTAL_FLOW.palette.liver });
  const gallbladder = buildGallbladder();
  const duodenum = buildDuodenum();
  duodenum.object.position.set(0.35, -1.35, 0.15);
  duodenum.object.scale.setScalar(0.8);

  const vesselMaterial = tissueMaterial({ color: LIVER_PORTAL_FLOW.palette.portal, roughness: 0.4, opacity: 0.85 });
  const outflowMaterial = tissueMaterial({ color: LIVER_PORTAL_FLOW.palette.hepatic, roughness: 0.4, opacity: 0.85 });

  // Portal vein: up from the gut into the porta hepatis, then branching.
  const portalTrunk = smoothCurve([
    [0.1, -2.1, 0.55],
    [0.0, -1.5, 0.6],
    [-0.1, -1.0, 0.62],
    [-0.15, -0.7, 0.6],
  ]);
  const portalMesh = new THREE.Mesh(
    new TubeSurface(portalTrunk, { radius: (u) => 0.16 - 0.03 * u, steps: 40, radial: 14 }).geometry,
    vesselMaterial
  );

  // Hepatic veins: out of the superior surface towards the inferior vena cava.
  const hepaticTrunk = smoothCurve([
    [-0.1, 0.5, -0.2],
    [-0.05, 0.9, -0.25],
    [0.0, 1.6, -0.3],
  ]);
  const hepaticMesh = new THREE.Mesh(
    new TubeSurface(hepaticTrunk, { radius: (u) => 0.13 + 0.03 * u, steps: 30, radial: 14 }).geometry,
    outflowMaterial
  );

  // Paths through the parenchyma: in at the porta, out at the hepatic veins.
  // Four of them, fanning into both lobes, so the crossing reads as a spread
  // rather than as a single pipe.
  const throughLiver = [
    [[-0.15, -0.7, 0.6], [-0.9, -0.25, 0.4], [-1.35, 0.2, 0.1], [-0.7, 0.45, -0.15], [-0.1, 0.5, -0.2]],
    [[-0.15, -0.7, 0.6], [-0.5, -0.1, 0.55], [-0.3, 0.35, 0.15], [-0.1, 0.5, -0.2]],
    [[-0.15, -0.7, 0.6], [0.5, -0.3, 0.35], [1.1, 0.05, 0.05], [0.4, 0.4, -0.1], [-0.1, 0.5, -0.2]],
    [[-0.15, -0.7, 0.6], [-1.5, -0.1, -0.15], [-1.0, 0.35, -0.3], [-0.1, 0.5, -0.2]],
  ].map((points) => smoothCurve(points));

  const portalFlow = createFlowStream({
    curves: [smoothCurve(portalTrunk.getSpacedPoints(6).map((p) => [p.x, p.y, p.z])), ...throughLiver],
    count: 220,
    color: LIVER_PORTAL_FLOW.palette.portal,
    size: 5.0,
    speed: 0.24,
    spread: 0.09,
    seed: 41,
    opacity: 0.8,
  });

  const hepaticFlow = createFlowStream({
    curves: [hepaticTrunk],
    count: 60,
    color: LIVER_PORTAL_FLOW.palette.hepatic,
    size: 5.4,
    speed: 0.34,
    spread: 0.06,
    seed: 42,
    opacity: 0.85,
  });

  // Cystic duct → common bile duct → duodenum.
  const bileDuctCurve = smoothCurve([
    [-0.55, -0.95, 0.5],
    [-0.35, -1.25, 0.42],
    [-0.15, -1.7, 0.3],
    [0.05, -2.05, 0.2],
  ]);
  const bileDuctMesh = new THREE.Mesh(
    new TubeSurface(bileDuctCurve, { radius: () => 0.055, steps: 30, radial: 10 }).geometry,
    tissueMaterial({ color: LIVER_PORTAL_FLOW.palette.bile, roughness: 0.35, emissiveIntensity: 0.1 })
  );

  const bileFlow = createFlowStream({
    curves: [bileDuctCurve],
    count: 60,
    color: LIVER_PORTAL_FLOW.palette.bile,
    size: 4.4,
    speed: 0.3,
    spread: 0.03,
    seed: 43,
    opacity: 0,
  });

  object.add(
    liver.object,
    gallbladder.object,
    duodenum.object,
    portalMesh,
    hepaticMesh,
    bileDuctMesh,
    portalFlow.object,
    hepaticFlow.object,
    bileFlow.object
  );

  let digestion = 0;

  return {
    object,
    anchors: {
      ...liver.anchors,
      ...gallbladder.anchors,
      duodenum: new THREE.Vector3(-1.3, -2.0, 0.6),
    },
    setProgress(value) {
      digestion = value;
      // The gallbladder empties as digestion gets going; between meals it fills.
      gallbladder.setFill(1 - smoothstep(0.35, 0.85, digestion));
      bileFlow.setOpacity(0.9 * smoothstep(0.4, 0.7, digestion));
    },
    update(dt) {
      const splanchnic = lerp(0.6, 1.9, digestion);
      portalFlow.setRate(splanchnic);
      hepaticFlow.setRate(splanchnic);
      bileFlow.setRate(smoothstep(0.4, 0.8, digestion) * 1.6);
      portalFlow.update(dt);
      hepaticFlow.update(dt);
      bileFlow.update(dt);
    },
    dispose() {
      portalFlow.dispose();
      hepaticFlow.dispose();
      bileFlow.dispose();
      duodenum.dispose();
    },
  };
}

export default definePrototypeScene({
  copy: LIVER_PORTAL_FLOW,
  cameraPose: { position: [0.8, 0.5, 8.2], target: [-0.2, -0.35, 0] },
  createModel,
});
