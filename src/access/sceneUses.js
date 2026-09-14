import { hasCurrentClinicalReview } from '../catalog/clinicalReview.js';

const PROFESSIONAL_USE_READY_STATUSES = new Set(['reviewed', 'production']);

/**
 * Catalogue maturity needed before a scene may expose a professional-use
 * surface. Clinical review is intentionally a separate gate.
 *
 * @param {{status?:string}|null|undefined} scene
 */
export function professionalUseStatusReady(scene) {
  return Boolean(scene && PROFESSIONAL_USE_READY_STATUSES.has(scene.status));
}

/**
 * A patient/professional surface may be presented only when both the model
 * maturity and the versioned clinical review are current.
 *
 * This module deliberately contains no patient/education guide imports. The
 * fixed scene navigator is loaded with the 3D shell, so asking whether a label
 * may be shown must never drag the authored guide payload into model start-up.
 *
 * @param {{id?:string,status?:string}|null|undefined} scene
 */
export function professionalUseSurfaceReady(scene) {
  return professionalUseStatusReady(scene) && hasCurrentClinicalReview(scene);
}

/**
 * Whether patient explanation may be shown as an actionable use today.
 *
 * @param {{id?:string,status?:string,uses?:string[]}|null|undefined} scene
 */
export function patientUseEnabledForScene(scene) {
  return Boolean(
    scene
      && (scene.uses ?? []).includes('patient')
      && professionalUseSurfaceReady(scene)
  );
}

/**
 * Uses that navigation/catalogue surfaces may present today. Non-patient uses
 * remain descriptive catalogue metadata; patient explanation fails closed on
 * the same versioned review gate as the paid surface.
 *
 * @param {{id?:string,status?:string,uses?:string[]}|null|undefined} scene
 * @returns {string[]}
 */
export function activeUsesForSceneEntry(scene) {
  const declared = scene?.uses ?? ['education'];
  return declared.filter((use) => use !== 'patient' || patientUseEnabledForScene(scene));
}
