import { SCENES } from '../catalog/index.js';
import { isSceneReleased } from '../catalog/release.js';
import { hasAuthoredPatientGuide } from '../data/patientGuideIndex.js';
import { betaUnlocked } from '../app/releaseGate.js';
import { professionalUseSurfaceReady } from './sceneUses.js';

/**
 * Where "患者説明" may be offered as a purpose — the one answer every entrance,
 * header and switch asks.
 *
 * ## The rule
 *
 * A model offers patient explanation when **all** of these hold:
 *
 * 1. the release opens the model at all (`isSceneReleased`);
 * 2. its maturity and its versioned clinical review permit a professional use
 *    (`professionalUseSurfaceReady` — `reviewed`/`production` *and* a current
 *    review record, not a legacy or stale one);
 * 3. the catalogue declares a patient mode for it (`access.patient`);
 * 4. a patient explanation is actually written for it.
 *
 * That is the same decision `featuresForScene(...).patient` makes for the
 * console's own button — plus (4), which the server enforces anyway — held
 * together by `tests/patient-purpose.test.js`. There is no second list to keep
 * in step.
 *
 * **Paying is not part of it.** Whether the reader holds the patient
 * entitlement decides whether the explanation *opens*, and the screen says so
 * with a lock; it does not decide whether the purpose exists. A model with no
 * patient explanation shows no patient entrance at all, because an entrance
 * nobody can use is a dead end.
 *
 * ## Preview builds
 *
 * Under the preview unlock (`VITE_ALLOW_PREVIEW=1` + `?preview=1`) the question
 * is "is one written" — the same substitution `installAccess` makes so an
 * unreviewed explanation can be read before anybody is asked to sign it. That
 * branch is compiled out of a production bundle with `betaUnlocked()`; nothing
 * here opens a model the release holds closed.
 *
 * Light on purpose: this module is asked on the landing page, so it reads the
 * guide *index*, never the guides themselves (F-99).
 */

/** `node --test` has no `window`; the safe answer is "not unlocked". */
function safeUnlocked() {
  try {
    return betaUnlocked();
  } catch {
    return false;
  }
}

/**
 * Whether the released product offers patient explanation on this scene.
 *
 * @param {object|null|undefined} scene
 * @param {{released?: (scene: object) => boolean}} [options] the release
 *   decision, injectable so a test can ask about a scene the release has not
 *   opened *yet* — the case this function exists for
 * @param {{reviewReady?: (scene: object) => boolean}} [options] the maturity
 *   and clinical-review decision, injectable for the same reason
 */
export function patientExplanationReleased(
  scene,
  { released = isSceneReleased, reviewReady = professionalUseSurfaceReady } = {}
) {
  return Boolean(
    scene &&
      released(scene) &&
      reviewReady(scene) &&
      scene.access?.patient === true &&
      hasAuthoredPatientGuide(scene.id)
  );
}

/**
 * Whether this build offers patient explanation on this scene.
 *
 * @param {object|null|undefined} scene
 * @param {{unlocked?: boolean}} [options] the preview unlock, injectable for tests
 */
export function patientExplanationAvailable(scene, { unlocked = safeUnlocked() } = {}) {
  if (!scene) return false;
  if (unlocked) return hasAuthoredPatientGuide(scene.id);
  return patientExplanationReleased(scene);
}

/**
 * Every scene this build offers patient explanation on, in catalogue order.
 *
 * @param {{unlocked?: boolean, scenes?: ReadonlyArray<object>}} [options]
 */
export function patientExplanationScenes({ unlocked = safeUnlocked(), scenes = SCENES } = {}) {
  return scenes.filter((scene) => patientExplanationAvailable(scene, { unlocked }));
}
