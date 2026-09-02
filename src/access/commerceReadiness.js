import { SCENE_MANIFEST } from '../catalog/scenes.js';
import { hasCurrentClinicalReview } from '../catalog/clinicalReview.js';

export const COMMERCE_PLAN = Object.freeze({
  PATIENT: 'patient',
  EDUCATION: 'education',
  COMPLETE: 'complete',
});

const MATURE_FOR_PROFESSIONAL_USE = new Set(['reviewed', 'production']);

/**
 * Whether a scene currently has a sellable professional-use surface.
 *
 * Authored access metadata is not enough. The scene must also be at a mature
 * model stage and covered by a current versioned Clinical Review attestation.
 * Stale, pending, legacy-unversioned and unrecorded review states all fail
 * closed. This is deliberately stricter than free-core access.
 */
export function sceneCapabilityIsCurrent(scene, capability) {
  return Boolean(
    scene &&
      MATURE_FOR_PROFESSIONAL_USE.has(scene.status) &&
      scene.access?.[capability] === true &&
      hasCurrentClinicalReview(scene)
  );
}

/**
 * Pure plan-readiness projection. `scenes` is injectable so tests can prove the
 * policy without editing the real Clinical Review registry.
 */
export function commerceReadiness(
  scenes = SCENE_MANIFEST,
  reviewIsCurrent = hasCurrentClinicalReview
) {
  const supports = (capability) =>
    scenes.some(
      (scene) =>
        MATURE_FOR_PROFESSIONAL_USE.has(scene.status) &&
        scene.access?.[capability] === true &&
        reviewIsCurrent(scene)
    );

  const patient = supports('patient');
  const education = supports('education');

  return Object.freeze({
    patient,
    education,
    complete: patient && education,
    any: patient || education,
  });
}

/** @param {string} plan */
export function planIsSellable(plan, readiness = commerceReadiness()) {
  if (plan === COMMERCE_PLAN.PATIENT) return readiness.patient === true;
  if (plan === COMMERCE_PLAN.EDUCATION) return readiness.education === true;
  if (plan === COMMERCE_PLAN.COMPLETE) return readiness.complete === true;
  return false;
}
