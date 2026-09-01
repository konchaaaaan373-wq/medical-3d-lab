import { SCENE_MANIFEST } from '../catalog/scenes.js';
import { clinicalReviewForScene } from '../catalog/clinicalReview.js';

/**
 * Product capabilities are declared on the scene manifest itself, but the
 * professional-use surface is only *activated* after a versioned Clinical
 * Review attestation exists for the current trust lineage.
 *
 * This distinction matters for the two legacy production scenes: Heart Failure
 * and Amyloid-β keep their accurate core model free and keep their authored
 * Patient/Education guides in the repository, but those professional modes fail
 * closed while their clinical-review state is `legacy-unversioned`.
 *
 * Once a reviewer signs a specific commit and the registry becomes `reviewed`,
 * the existing manifest declaration automatically re-enables the authored
 * product modes; there is no second paid-scene list to edit.
 */

const PAID_READY_STATUSES = new Set(['reviewed', 'production']);

const FREE_ONLY = Object.freeze({
  core: 'free',
  basicExplanation: 'free',
  patient: false,
  education: false,
});

function hasVersionedClinicalReview(scene) {
  return clinicalReviewForScene(scene)?.reviewStatus === 'reviewed';
}

function featureSet(scene) {
  if (!scene || !PAID_READY_STATUSES.has(scene.status) || !hasVersionedClinicalReview(scene)) {
    return FREE_ONLY;
  }
  const patient = scene.access?.patient === true;
  const education = scene.access?.education === true;
  if (!patient && !education) return FREE_ONLY;
  return Object.freeze({
    core: 'free',
    basicExplanation: 'free',
    patient,
    education,
  });
}

function sceneFor(sceneOrId) {
  if (sceneOrId && typeof sceneOrId === 'object') return sceneOrId;
  return SCENE_MANIFEST.find((scene) => scene.id === sceneOrId) ?? null;
}

/**
 * Compatibility/read-only view of every authored product declaration.
 *
 * A key can remain present while its professional features resolve to `false`:
 * that means content is authored but trust-gated, not that it was deleted.
 */
export const SCENE_PRODUCT_FEATURES = Object.freeze(
  Object.fromEntries(
    SCENE_MANIFEST.filter((scene) => scene.access?.patient === true || scene.access?.education === true).map(
      (scene) => [scene.id, featureSet(scene)]
    )
  )
);

/**
 * @param {string|{id?:string,status?:string,access?:object}} sceneOrId
 */
export function featuresForScene(sceneOrId) {
  return featureSet(sceneFor(sceneOrId));
}

/**
 * Compact product labels used by catalogue surfaces. They describe currently
 * available product modes, not merely authored-but-unreviewed content.
 *
 * @param {string|{id?:string,status?:string,access?:object}} sceneOrId
 */
export function productBadgesForScene(sceneOrId) {
  const features = featuresForScene(sceneOrId);
  const badges = [
    Object.freeze({ id: 'core', kind: 'free', label: 'Free model', labelJa: 'モデル無料' }),
  ];
  if (features.patient) {
    badges.push(Object.freeze({ id: 'patient', kind: 'paid', label: 'Patient', labelJa: '患者説明' }));
  }
  if (features.education) {
    badges.push(Object.freeze({ id: 'education', kind: 'paid', label: 'Education', labelJa: '医学教育' }));
  }
  return badges;
}
