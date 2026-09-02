import { SCENE_MANIFEST } from '../catalog/scenes.js';

/**
 * Product capabilities are declared on the scene manifest itself.
 *
 * The catalogue is the one place a scene is declared to exist, so it also owns
 * whether reviewed professional-use surfaces have been authored for that scene.
 * This prevents a second hand-maintained paid-scene registry from drifting as
 * the catalogue grows toward dozens or hundreds of scenes.
 *
 * The core model and basic explanation remain free in every case. Paid surfaces
 * are allowed only on reviewed/production scenes; runtime access fails closed if
 * a lower-maturity scene is accidentally given an `access` declaration, and CI
 * separately treats that declaration as an error.
 */

const PAID_READY_STATUSES = new Set(['reviewed', 'production']);

const FREE_ONLY = Object.freeze({
  core: 'free',
  basicExplanation: 'free',
  patient: false,
  education: false,
});

function featureSet(scene) {
  if (!scene || !PAID_READY_STATUSES.has(scene.status)) return FREE_ONLY;
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

/** Compatibility/read-only view used by product tests and guide registries. */
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
 * Compact product labels used by catalogue surfaces. They describe availability,
 * not the current viewer's entitlement state.
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
