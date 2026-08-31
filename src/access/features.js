import { SCENE_MANIFEST } from '../catalog/scenes.js';

/**
 * Product capability helpers.
 *
 * `src/catalog/scenes.js` is the declaration source of truth. This file only
 * normalises that catalogue metadata for the access/UI layer; it must not keep
 * a second list of paid scene ids.
 *
 * The core model and basic mechanism explanation remain free. Patient and
 * Education are optional professional-use surfaces declared explicitly by the
 * catalogue entry.
 */

const FREE_ONLY = Object.freeze({
  core: 'free',
  basicExplanation: 'free',
  patient: false,
  education: false,
});

const SCENE_BY_ID = new Map(SCENE_MANIFEST.map((scene) => [scene.id, scene]));

function normalise(scene) {
  if (!scene) return FREE_ONLY;
  return Object.freeze({
    core: 'free',
    basicExplanation: 'free',
    patient: Boolean(scene.product?.patient),
    education: Boolean(scene.product?.education),
  });
}

/**
 * Backward-compatible derived map used by tests/content coverage checks. It is
 * generated from the catalogue rather than authored separately.
 */
export const SCENE_PRODUCT_FEATURES = Object.freeze(
  Object.fromEntries(
    SCENE_MANIFEST.filter((scene) => scene.product?.patient || scene.product?.education).map((scene) => [
      scene.id,
      normalise(scene),
    ])
  )
);

/**
 * @param {string|{id?:string,product?:any}} sceneOrId
 */
export function featuresForScene(sceneOrId) {
  const scene = typeof sceneOrId === 'string' ? SCENE_BY_ID.get(sceneOrId) : sceneOrId;
  return normalise(scene);
}

/**
 * Compact product labels used by catalogue surfaces. They describe availability,
 * not the current viewer's entitlement state.
 *
 * @param {string|{id?:string,product?:any}} sceneOrId
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
