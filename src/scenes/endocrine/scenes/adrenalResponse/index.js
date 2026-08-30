import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import { createFlowStream } from '../../../shared/motion/flow.js';
import { TubeSurface, smoothCurve } from '../../../shared/geometry/tube.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { ADRENAL_RESPONSE } from '../../../../data/prototypes/endocrine.js';
import { adrenalResponseAt, minutesAtProgress } from './response.js';
import { buildAdrenal } from '../../organs/adrenal.js';
import { buildKidney } from '../../../renal/organs/kidney.js';

/**
 * Scene: one capsule, two pathways, two clocks.
 *
 * PROTOTYPE. The control is **time after a stressor**, not "how stressed" —
 * the whole subject of the scene is a separation in time, and an intensity
 * slider cannot show one. Drag it and the neural signal arrives, the medulla
 * empties into the vein, and both are already fading before ACTH has finished
 * reaching the cortex.
 *
 * The two limbs are drawn as two pathways because they are two pathways:
 *
 * - a **nerve** running to the medulla, carrying an impulse that stops when
 *   the stressor stops;
 * - an **artery** carrying ACTH from the pituitary to the cortex, which is
 *   still delivering long after the nerve has gone quiet.
 *
 * They share one draining vein, which is anatomy — the gland has one — and
 * not a shared pathway. Everything on screen is a reading of
 * `response.js`; nothing here decides when a curve should rise.
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

  // The splanchnic nerve, ending on the chromaffin cells themselves. Drawn
  // running *through* the cortex without branching in it, because that is the
  // point: the medulla is innervated tissue and the cortex is not on this path.
  const nerveCurve = smoothCurve([
    [1.25, 1.18, -0.52],
    [0.86, 0.93, -0.36],
    [0.42, 0.68, -0.18],
    [0.02, 0.5, -0.02],
  ]);
  const nerve = new THREE.Mesh(
    new TubeSurface(nerveCurve, { radius: () => 0.035, steps: 34, radial: 8 }).geometry,
    tissueMaterial({ color: ADRENAL_RESPONSE.palette.nerve, roughness: 0.88, opacity: 0.9 })
  );

  // The arterial supply to the cortex. ACTH is not delivered along a nerve; it
  // has to be made in the pituitary, released into the blood and carried here,
  // and that journey is most of why the cortical limb is late.
  const arteryCurve = smoothCurve([
    [-1.34, 1.2, 0.48],
    [-0.88, 0.98, 0.44],
    [-0.5, 0.73, 0.34],
    [-0.28, 0.56, 0.22],
  ]);
  const artery = new THREE.Mesh(
    new TubeSurface(arteryCurve, { radius: (u) => 0.062 - 0.022 * u, steps: 30, radial: 10 }).geometry,
    tissueMaterial({ color: ADRENAL_RESPONSE.palette.artery, roughness: 0.55, opacity: 0.42 })
  );

  const drainingPathsFrom = (points) =>
    points.map((point) =>
      smoothCurve([
        [point.x, point.y + 0.42, point.z],
        [point.x * 0.5, point.y + 0.5, point.z * 0.5 + 0.1],
        [veinCurve.getPointAt(0.35).x, veinCurve.getPointAt(0.35).y, veinCurve.getPointAt(0.35).z],
        [veinCurve.getPointAt(1).x, veinCurve.getPointAt(1).y, veinCurve.getPointAt(1).z],
      ])
    );

  // Inbound: the impulse down the nerve. Few and quick, so it reads as a
  // volley rather than a river — and so that it visibly stops.
  const impulse = createFlowStream({
    curves: [nerveCurve],
    count: 26,
    color: ADRENAL_RESPONSE.palette.impulse,
    size: 4.2,
    speed: 1.15,
    spread: 0.012,
    seed: 93,
    opacity: 0.06,
  });

  // Inbound: ACTH arriving in the blood.
  const acth = createFlowStream({
    curves: [arteryCurve],
    count: 48,
    color: ADRENAL_RESPONSE.palette.acth,
    size: 4.4,
    speed: 0.34,
    spread: 0.035,
    seed: 94,
    opacity: 0.06,
  });

  // Outbound: catecholamines from the medulla, cortisol from the cortex.
  const catecholamines = createFlowStream({
    curves: drainingPathsFrom([adrenal.medullaPoint]),
    count: 60,
    color: ADRENAL_RESPONSE.palette.fast,
    size: 3.6,
    speed: 0.55,
    spread: 0.05,
    seed: 91,
    opacity: 0.08,
  });

  const cortisol = createFlowStream({
    curves: drainingPathsFrom(adrenal.cortexPoints),
    count: 80,
    color: ADRENAL_RESPONSE.palette.slow,
    size: 3.6,
    speed: 0.26,
    spread: 0.06,
    seed: 92,
    opacity: 0.08,
  });

  object.add(
    kidney.object,
    vein,
    nerve,
    artery,
    adrenal.object,
    impulse.object,
    acth.object,
    catecholamines.object,
    cortisol.object
  );

  const rest = adrenalResponseAt(0);
  const cortexMesh = adrenal.object.getObjectByName('cortex');
  const medullaMesh = adrenal.object.getObjectByName('medulla');

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
      // Laid out so the screen splits the way the gland does: the endocrine
      // route down the left, the neural route down the right.
      cortex: new THREE.Vector3(-0.85, 0.1, 0.6),
      medulla: new THREE.Vector3(0.72, 0.42, 0.45),
      kidney: new THREE.Vector3(1.1, -1.35, 0.4),
      vein: new THREE.Vector3(-1.45, 0.45, -0.35),
      nerve: new THREE.Vector3(1.5, 1.35, -0.55),
      artery: new THREE.Vector3(-1.6, 1.12, 0.5),
    },
    setProgress(value) {
      const state = adrenalResponseAt(minutesAtProgress(value));

      // Presentation only. Each stream keeps a visible floor, because baseline
      // secretion never stops, and the *emphasis* is scaled from that floor to
      // the peak so that a two-fold rise in cortisol is as readable as a
      // ten-fold one in catecholamines. Two limbs on very different scales
      // cannot share one linear brightness ramp and both stay legible; what is
      // exaggerated here is contrast, never timing.
      const aboveRest = (level, floor) => Math.max(0, (level - floor) / (1 - floor));
      const catecholamineEmphasis = aboveRest(state.catecholamine, rest.catecholamine);
      const cortisolEmphasis = aboveRest(state.cortisol, rest.cortisol);
      const acthEmphasis = aboveRest(state.acth, rest.acth);

      impulse.setOpacity(0.02 + 0.6 * state.neuralDrive);
      impulse.setRate(0.05 + 3.4 * state.neuralDrive);

      acth.setOpacity(0.05 + 0.4 * acthEmphasis);
      acth.setRate(0.2 + 1.8 * acthEmphasis);

      catecholamines.setOpacity(0.05 + 0.32 * catecholamineEmphasis);
      catecholamines.setRate(0.2 + 2.6 * catecholamineEmphasis);

      cortisol.setOpacity(0.05 + 0.3 * cortisolEmphasis);
      cortisol.setRate(0.2 + 1.5 * cortisolEmphasis);

      medullaMesh.material.emissiveIntensity = 0.34 + 0.4 * catecholamineEmphasis;
      // The cortex is not redrawn as bigger. Nothing grows a gland in ninety
      // minutes; the thickening that chronic drive does produce belongs to a
      // scene whose axis is days, not this one.
      cortexMesh.material.emissiveIntensity = 0.06 + 0.16 * cortisolEmphasis;
    },
    update(dt) {
      impulse.update(dt);
      acth.update(dt);
      catecholamines.update(dt);
      cortisol.update(dt);
    },
    dispose() {
      impulse.dispose();
      acth.dispose();
      catecholamines.dispose();
      cortisol.dispose();
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
