import * as THREE from 'three';
import { definePrototypeScene } from '../../../shared/PrototypeScene.js';
import { tissueMaterial } from '../../../shared/materials.js';
import { MUSCLE_CONTRACTION } from '../../../../data/prototypes/musculoskeletal.js';
import { buildMuscle } from '../../organs/muscle.js';

/**
 * Scene: from separate twitches to a smooth contraction.
 *
 * PROTOTYPE. The slider is **stimulation frequency**, and everything else
 * follows from it. At low frequency each twitch relaxes completely before the
 * next stimulus; raise it and the next contraction starts before relaxation is
 * finished, so they add — summation — and the muscle no longer returns to rest;
 * raise it further and the ripple disappears into a smooth, sustained
 * shortening. That ladder is the whole point: it is why a muscle can be held
 * steady at all.
 *
 * The shortening drawn here is **concentric** — the muscle shortens against
 * nothing. There is no load, no joint and no tension being represented, so
 * "how hard it is pulling" is not on screen.
 *
 * The stimuli themselves are drawn as a flash at the motor point, and they
 * stay separate at every frequency on the slider. That is the contrast the
 * scene is built around: the input never fuses, the response does.
 *
 * Not modelled: motor units as discrete things (recruitment is a second,
 * separate way of grading force and is not what this slider does), the
 * length-tension relationship, fatigue, and force.
 */
/**
 * Twitch dynamics. `TWITCH_RATE` is the natural frequency in rad/s of the
 * critically damped response — it sets a time to peak of about 60 ms and a
 * twitch lasting roughly a quarter of a second, which is the right order for
 * skeletal muscle and puts fusion in the tens of hertz. Both are presentation
 * values chosen to make the ladder legible; neither is a measurement.
 */
const TWITCH_RATE = 17;
const TWITCH_IMPULSE = 54;
/**
 * What counts as fully shortened. Chosen so that one isolated twitch reaches
 * roughly a third of it and a fused tetanus reaches all of it — the ordering
 * skeletal muscle actually shows. A presentation scale, not a tension.
 */
const FUSED_RESPONSE = 3;

/**
 * How fast the stimulus flash fades, in flashes per second. Fast enough that
 * even at the top of the slider the flashes are still countable — if the marker
 * blurred into a steady glow it would say the stimuli had merged, which is the
 * opposite of what happens.
 */
const FLASH_DECAY = 26;

/** Stimuli per second at the top of the slider. */
const MAX_STIMULUS_HZ = 16;

function createModel() {
  const object = new THREE.Group();
  const muscle = buildMuscle({
    color: MUSCLE_CONTRACTION.palette.muscle,
    tendonColor: MUSCLE_CONTRACTION.palette.tendon,
  });
  object.add(muscle.object);

  // The motor point: where the stimulus arrives. Mounted on the belly's own
  // surface, so it rides the muscle instead of hanging in space beside it.
  const flashMaterial = tissueMaterial({
    color: MUSCLE_CONTRACTION.palette.twitch,
    roughness: 0.3,
    emissiveIntensity: 0,
  });
  const flashMesh = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), flashMaterial);
  muscle.motorPoint.add(flashMesh);

  /** Stimulation frequency, 0..1 of the modelled range. */
  let frequency = 0;
  /** Where in the stimulus interval we are. Accumulated, because the rate moves. */
  let phase = 0;
  /**
   * The mechanical response, as a critically damped second-order system driven
   * by stimuli. Each stimulus is an impulse; the system's own rise and decay
   * are the twitch. Summation then needs no special case — overlapping twitches
   * add, and at high enough frequency the sum stops rippling, which is exactly
   * what fusion is.
   */
  let shortening = 0;
  let velocity = 0;
  /** Brightness of the stimulus marker, 1 at the instant of a stimulus. */
  let flash = 0;

  return {
    object,
    anchors: muscle.anchors,
    setProgress(value) {
      frequency = value;
    },
    update(dt) {
      // Stimuli per second. The phase is carried forward rather than recomputed
      // from the clock: multiplying elapsed time by a rate the slider moves
      // jumps the muscle to an unrelated length, right where the scene is
      // teaching fusion.
      // Zero at the bottom of the slider: at rest there are no stimuli at all.
      const stimuliPerSecond = MAX_STIMULUS_HZ * frequency;

      // Sub-stepped, so the twitch dynamics do not depend on the frame rate.
      const steps = 6;
      const h = Math.min(dt, 1 / 20) / steps;
      for (let i = 0; i < steps; i++) {
        const previous = phase;
        phase = (phase + h * stimuliPerSecond) % 1;
        const stimulated = phase < previous;

        // Critically damped: no overshoot, so a single twitch rises and falls
        // once. TWITCH_RATE sets how long that takes and therefore the
        // frequency at which twitches begin to overlap.
        const impulse = stimulated ? TWITCH_IMPULSE / h : 0;
        if (stimulated) flash = 1;
        flash = Math.max(0, flash - FLASH_DECAY * h);
        const acceleration =
          impulse - 2 * TWITCH_RATE * velocity - TWITCH_RATE * TWITCH_RATE * shortening;
        velocity += acceleration * h;
        shortening += velocity * h;
        if (shortening < 0) {
          shortening = 0;
          if (velocity < 0) velocity = 0;
        }
      }
      // Clamped: a muscle cannot shorten past its own limit however often it is
      // stimulated. Presentation only — no force is being represented.
      muscle.setContraction(Math.min(1, shortening / FUSED_RESPONSE));
      // Presentation. Dark between stimuli rather than dim, so that counting
      // them is possible; the size never changes, because a stimulus does not
      // have an amplitude here.
      flashMaterial.emissiveIntensity = 2.4 * flash;
      flashMesh.visible = frequency > 0;
    },
    dispose() {
      flashMesh.geometry.dispose();
      flashMaterial.dispose();
      muscle.dispose();
    },
  };
}

export default definePrototypeScene({
  copy: MUSCLE_CONTRACTION,
  cameraPose: { position: [1.0, 0.3, 6.0], target: [0, 0, 0] },
  createModel,
});
