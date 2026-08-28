import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import { breathShape, oscillate } from '../../../shared/motion/rhythm.js';
import { clamp, smoothstep } from '../../../../utils/math.js';
import { BODY_OVERVIEW } from '../../../../data/prototypes/systemic.js';
import { buildBodyShell } from '../../organs/bodyShell.js';
import { buildBrain } from '../../../nervous/organs/brain.js';
import { buildHeart } from '../../../cardiovascular/organs/heart.js';
import { buildLungs } from '../../../respiratory/organs/lungs.js';
import { buildLiver } from '../../../hepatobiliary/organs/liver.js';
import { buildStomach } from '../../../gastrointestinal/organs/stomach.js';
import { buildColon, buildSmallIntestine } from '../../../gastrointestinal/organs/intestine.js';
import { buildBladder, buildKidney } from '../../../renal/organs/kidney.js';

/**
 * Scene: the whole catalogue, in one body.
 *
 * PROTOTYPE — NOT ANATOMICALLY VALIDATED. Positions and relative sizes are
 * approximate; this is an orientation view, not an atlas. Its job is to answer
 * "where does this scene sit?" and to make the architecture visible: every
 * organ here is the *same builder* the organ's own scene uses, positioned
 * differently. Nothing is modelled twice.
 *
 * The heart beats and the lungs breathe, because a body that is completely
 * still reads as a diagram.
 */
function createModel() {
  const object = new THREE.Group();
  const shell = buildBodyShell();

  /**
   * Each organ, with where it goes and which system reveals it.
   * `at` matches the stage thresholds in the copy.
   */
  const parts = [];
  const place = (name, built, { position, scale, at, rotation }) => {
    built.object.position.set(...position);
    built.object.scale.setScalar(scale);
    if (rotation) built.object.rotation.set(...rotation);
    // Everything fades in, so every material has to be able to.
    const materials = new Set();
    built.object.traverse((child) => {
      if (!child.material) return;
      for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
        if (!materials.has(material)) {
          material.transparent = true;
          material.userData.baseOpacity = material.opacity;
          materials.add(material);
        }
      }
    });
    parts.push({ name, built, at, materials: [...materials] });
    object.add(built.object);
    return built;
  };

  const brain = place('brain', buildBrain(), { position: [0, 3.62, 0.05], scale: 0.62, at: 0 });
  // The lungs, not the heart, fill the chest: the heart sits in the notch the
  // left lung leaves for it. Drawn the other way round — a large heart in front
  // of two small lungs — the thorax reads as a heart with decorations.
  const lungs = place('lungs', buildLungs({ opacity: 0.7 }), { position: [0, 1.62, -0.12], scale: 0.56, at: 0.36 });
  const heart = place('heart', buildHeart(), { position: [0.2, 1.1, 0.3], scale: 0.46, at: 0.18 });
  // A gap below the heart and lungs, where the diaphragm would be. Without it
  // the liver and the stomach ran into the lungs and the trunk read as one mass.
  const liver = place('liver', buildLiver({ opacity: 0.92 }), { position: [-0.34, -0.45, 0.1], scale: 0.5, at: 0.56 });
  const stomach = place('stomach', buildStomach(), { position: [0.66, -0.42, -0.08], scale: 0.4, at: 0.56 });
  const smallBowel = place('small-intestine', buildSmallIntestine(), {
    position: [0, -1.6, 0.14],
    scale: 0.4,
    at: 0.56,
  });
  const colon = place('colon', buildColon(), { position: [0, -1.5, -0.06], scale: 0.44, at: 0.56 });
  // Further out to the side than the bowel reaches, so that they are still
  // visible at the back rather than completely behind it — the retroperitoneal
  // position is the point, but an organ nobody can see teaches nothing.
  const rightKidney = place('right-kidney', buildKidney({ side: 'right' }), {
    position: [-0.86, -0.72, -0.44],
    scale: 0.52,
    at: 0.78,
  });
  const leftKidney = place('left-kidney', buildKidney({ side: 'left' }), {
    position: [0.86, -0.62, -0.44],
    scale: 0.52,
    at: 0.78,
  });
  const bladder = place('bladder', buildBladder(), { position: [0, -2.6, 0.05], scale: 0.6, at: 0.78 });
  bladder.setFill(0.55);

  object.add(shell.object);

  let shown = 0;
  /** Both rhythms carry their own phase; nothing here reads the wall clock. */
  let beat = 0;
  let breath = 0;

  return {
    object,
    anchors: {
      brain: new THREE.Vector3(0.95, 4.0, 0.4),
      heart: new THREE.Vector3(1.2, 1.35, 0.6),
      lungs: new THREE.Vector3(-1.45, 2.15, 0.5),
      liver: new THREE.Vector3(-1.5, -0.35, 0.6),
      stomach: new THREE.Vector3(1.45, 0.05, 0.5),
      intestine: new THREE.Vector3(-1.3, -1.85, 0.7),
      kidney: new THREE.Vector3(1.6, -0.85, -0.3),
      bladder: new THREE.Vector3(0.9, -2.9, 0.5),
    },
    setProgress(value) {
      shown = value;
      for (const part of parts) {
        // Each system is fully there by the time its own stage begins, and
        // stays. Fading in *after* the threshold left the opening frame — the
        // one the scene loads and resets to — as an empty silhouette with a
        // label pointing at a five-percent smudge of brain.
        const reveal = smoothstep(part.at - 0.14, part.at, shown);
        for (const material of part.materials) {
          material.opacity = clamp(material.userData.baseOpacity * reveal, 0, 1);
          material.visible = reveal > 0.01;
        }
      }
    },
    update(dt) {
      // Two rhythms, at their own rates, so the body reads as alive rather
      // than as a still. Neither is a measured rate.
      beat = (beat + dt * 1.05) % 1;
      breath = (breath + (dt * 13) / 60) % 1;
      heart.setBeat(oscillate(beat, 1));
      lungs.setInflation(breathShape(breath) * 0.75);
    },
    dispose() {
      for (const part of parts) part.built.dispose?.();
    },
  };
}

export default definePrototypeScene({
  copy: BODY_OVERVIEW,
  cameraPose: { position: [1.4, 1.2, 13.5], target: [0, 0.4, 0] },
  createModel,
});
