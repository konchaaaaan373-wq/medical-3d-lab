import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { createRandom, lerp, smoothstep } from '../../../../utils/math.js';
import { SPLEEN_FILTRATION } from '../../../../data/prototypes/hematologic.js';
import { buildSpleen } from '../../organs/spleen.js';

/**
 * Scene: a filter that works by geometry.
 *
 * PROTOTYPE. Two populations on the same route: one crosses the pulp and leaves
 * by the vein, one stops inside. The proportion is the slider, and the organ
 * grows as the retained population does.
 *
 * This is a schematic, not a count: nothing here is a cell, and no fraction on
 * screen corresponds to a measurable one. Immune function, white pulp and
 * platelet pooling are not modelled at all.
 */
function createModel() {
  const object = new THREE.Group();
  const spleen = buildSpleen({ color: SPLEEN_FILTRATION.palette.spleen });

  // Both vessels meet the organ at the hilum and taper as they branch into it.
  // Straight, constant-calibre tubes read as rods laid against the spleen.
  //
  // Where the hilum is comes from the organ, which declares it, rather than
  // from four coordinates typed here (architecture rule 1). They are offsets
  // from it, so the vessels follow the notch instead of having to be moved in
  // step with it by hand. Running medially — away from the hilum, towards the
  // midline — is also the direction the splenic vessels actually take.
  const { hilum } = spleen;
  const at = (dx, dy, dz) => [hilum.x + dx, hilum.y + dy, hilum.z + dz];
  const arteryCurve = smoothCurve([
    at(-1.6, 0.67, -0.1),
    at(-0.95, 0.37, 0.02),
    at(-0.5, 0.15, 0.02),
    at(-0.3, 0.05, 0),
  ]);
  const veinCurve = smoothCurve([
    at(-0.25, -0.3, 0),
    at(-0.6, -0.45, 0.04),
    at(-1.05, -0.67, 0.02),
    at(-1.65, -1.0, -0.08),
  ]);
  const inlet = arteryCurve.getPointAt(1);
  const outlet = veinCurve.getPointAt(0);
  const artery = new THREE.Mesh(
    new TubeSurface(arteryCurve, { radius: (u) => 0.13 - 0.05 * u, steps: 30, radial: 14 }).geometry,
    tissueMaterial({ color: SPLEEN_FILTRATION.palette.artery, roughness: 0.4, opacity: 0.9 })
  );
  const vein = new THREE.Mesh(
    new TubeSurface(veinCurve, { radius: (u) => 0.1 + 0.06 * u, steps: 30, radial: 14 }).geometry,
    tissueMaterial({ color: SPLEEN_FILTRATION.palette.vein, roughness: 0.4, opacity: 0.9 })
  );

  // Routes through the pulp: in at the hilum, out at the hilum, by way of the
  // parenchyma. Deterministic, so the picture is the same on every reload.
  const random = createRandom(101);
  const throughPaths = [];
  const trappedPaths = [];
  for (let i = 0; i < 8; i++) {
    // Into the bulk of the organ, which lies away from the hilum: the pulp is
    // on the convex diaphragmatic side, not on the notch the vessels enter by.
    const depth = 0.35 + random() * 0.75;
    const wander = new THREE.Vector3(
      -Math.sign(hilum.x) * depth,
      (random() - 0.5) * 1.6,
      (random() - 0.5) * 0.6
    );
    throughPaths.push(
      smoothCurve([
        [inlet.x, inlet.y, inlet.z],
        [wander.x * 0.6, wander.y * 0.7, wander.z],
        [wander.x, wander.y, wander.z],
        [wander.x * 0.5, wander.y * 0.4 - 0.2, wander.z * 0.6],
        [outlet.x, outlet.y, outlet.z],
      ])
    );
    // A retained cell goes in and stops: the path ends in the pulp.
    trappedPaths.push(
      smoothCurve([
        [inlet.x, inlet.y, inlet.z],
        [wander.x * 0.7, wander.y * 0.8, wander.z * 0.9],
        [wander.x, wander.y, wander.z],
      ])
    );
  }

  const inflow = createFlowStream({
    curves: [arteryCurve],
    count: 70,
    color: SPLEEN_FILTRATION.palette.artery,
    size: 5.0,
    speed: 0.4,
    spread: 0.045,
    seed: 111,
    opacity: 0.85,
  });
  const through = createFlowStream({
    curves: [...throughPaths, veinCurve],
    count: 190,
    color: SPLEEN_FILTRATION.palette.vein,
    size: 4.4,
    speed: 0.2,
    spread: 0.05,
    seed: 112,
    opacity: 0.7,
  });
  const retained = createFlowStream({
    curves: trappedPaths,
    count: 120,
    color: SPLEEN_FILTRATION.palette.retained,
    size: 4.8,
    speed: 0.1,
    spread: 0.05,
    seed: 113,
    opacity: 0.05,
  });

  object.add(spleen.object, artery, vein, inflow.object, through.object, retained.object);

  let stiffened = 0;

  return {
    object,
    anchors: spleen.anchors,
    setProgress(value) {
      stiffened = value;
      retained.setOpacity(0.05 + 0.8 * smoothstep(0.1, 0.9, stiffened));
      through.setOpacity(lerp(0.75, 0.45, stiffened));
      // Splenomegaly: the organ that holds them back gets bigger. A shape
      // change to make the consequence visible — not a measured volume.
      const size = 1 + 0.3 * smoothstep(0.35, 1, stiffened);
      spleen.object.scale.set(size, size, size);
    },
    update(dt) {
      inflow.setRate(1);
      through.setRate(lerp(1, 0.6, stiffened));
      retained.setRate(0.5 + stiffened);
      inflow.update(dt);
      through.update(dt);
      retained.update(dt);
    },
    dispose() {
      inflow.dispose();
      through.dispose();
      retained.dispose();
    },
  };
}

export default definePrototypeScene({
  copy: SPLEEN_FILTRATION,
  cameraPose: { position: [-0.8, 0.6, 6.2], target: [-0.2, 0, 0] },
  createModel,
});
