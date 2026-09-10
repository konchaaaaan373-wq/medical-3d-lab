import { SCENE_MANIFEST } from '../catalog/scenes.js';
import { clinicalReviewForScene } from '../catalog/clinicalReview.js';
import { patientGuideFor } from '../data/patientGuides.js';
import { educationGuideFor } from '../data/educationGuides.js';

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

function featureSet(scene, { requireClinicalReview = true } = {}) {
  if (!scene || !PAID_READY_STATUSES.has(scene.status)) return FREE_ONLY;
  if (requireClinicalReview && !hasVersionedClinicalReview(scene)) return FREE_ONLY;
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
 * The same declaration with the clinical-review requirement lifted — **for an
 * internal preview build and nothing else**.
 *
 * Today no scene in the registry is `reviewed`: everything is `pending`,
 * `stale` or `legacy-unversioned`. That is the correct answer for the public
 * product and it also means the authored patient explanation cannot be looked
 * at *at all* — not by a reviewer, not by whoever has to decide whether it is
 * good enough to sign. A mode nobody can open is a mode nobody can improve.
 *
 * So this exists to answer "what would this scene offer if the review existed",
 * and only `installAccess` asks it, and only when `betaUnlocked()` — which is a
 * build-time capability absent from production, the same one that opens an
 * unreleased scene. Every catalogue surface keeps asking `featuresForScene`,
 * so cards, badges and the use filter go on describing the public product
 * truthfully.
 *
 * **It is not a way in.** A preview build still requires a signed-in session
 * and a server that grants the entitlement; this only decides whether the
 * button is built.
 *
 * @param {string|{id?:string,status?:string,access?:object}} sceneOrId
 */
export function authoredFeaturesForScene(sceneOrId) {
  const scene = sceneFor(sceneOrId);
  if (!scene) return FREE_ONLY;
  // Asked of the writing rather than of the manifest.
  //
  // `access.patient` is a product claim, and the catalogue's own rules say an
  // `alpha` scene may not make one — rightly: an alpha model is still moving.
  // But the question here is not "does this scene offer a patient mode", it is
  // "is there a patient explanation written for it that somebody could read".
  // The guides answer that themselves, so nothing has to be declared on an
  // unfinished scene to let a reviewer see its copy.
  const patient = Boolean(patientGuideFor(scene.id));
  const education = Boolean(educationGuideFor(scene.id));
  if (!patient && !education) return FREE_ONLY;
  return Object.freeze({ core: 'free', basicExplanation: 'free', patient, education });
}

/**
 * Whether "patient explanation" may be shown as a use a reader can act on.
 *
 * The catalogue declares the contexts a scene is *intended* for. Patient
 * explanation is the one of them that is safety-gated: it becomes visible on a
 * card, and selectable in the explorer's use filter, under exactly the rule the
 * paid patient mode uses — a reviewed/production model with a versioned clinical
 * review of the current lineage. An unreviewed alpha model is never presented
 * as intended for a patient, however it is declared.
 *
 * @param {string|{id?:string,status?:string,uses?:string[]}} sceneOrId
 */
export function patientUseEnabled(sceneOrId) {
  const scene = sceneFor(sceneOrId);
  if (!scene || !(scene.uses ?? []).includes('patient')) return false;
  return PAID_READY_STATUSES.has(scene.status) && hasVersionedClinicalReview(scene);
}

/**
 * The declared uses a surface may present today: every non-patient context as
 * declared, and patient explanation only when `patientUseEnabled`.
 *
 * @param {string|{id?:string,status?:string,uses?:string[]}} sceneOrId
 * @returns {string[]}
 */
export function activeUsesForScene(sceneOrId) {
  const scene = sceneFor(sceneOrId);
  const declared = scene?.uses ?? ['education'];
  return declared.filter((use) => use !== 'patient' || patientUseEnabled(scene));
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
