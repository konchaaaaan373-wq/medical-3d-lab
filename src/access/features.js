/**
 * Product capabilities by scene.
 *
 * This registry is deliberately explicit. A prototype becoming available in the
 * catalogue must never accidentally become a paid clinical/teaching product just
 * because it happens to expose a similarly named method. Only reviewed content
 * that has been intentionally authored for a use case is listed here.
 *
 * The core model remains free. `patient` and `education` describe whether this
 * scene has a paid use-case surface built around that same model.
 */

const FREE_ONLY = Object.freeze({
  core: 'free',
  basicExplanation: 'free',
  patient: false,
  education: false,
});

export const SCENE_PRODUCT_FEATURES = Object.freeze({
  'amyloid-beta': Object.freeze({
    core: 'free',
    basicExplanation: 'free',
    patient: true,
    education: true,
  }),
  'heart-failure': Object.freeze({
    core: 'free',
    basicExplanation: 'free',
    patient: true,
    education: true,
  }),
  'copd-hyperinflation': Object.freeze({
    core: 'free',
    basicExplanation: 'free',
    patient: true,
    education: true,
  }),
  'asthma-heterogeneity': Object.freeze({
    core: 'free',
    basicExplanation: 'free',
    patient: true,
    education: true,
  }),
  'portal-hypertension': Object.freeze({
    core: 'free',
    basicExplanation: 'free',
    patient: true,
    education: true,
  }),
});

/**
 * @param {string|{id?:string}} sceneOrId
 */
export function featuresForScene(sceneOrId) {
  const id = typeof sceneOrId === 'string' ? sceneOrId : sceneOrId?.id;
  return SCENE_PRODUCT_FEATURES[id] ?? FREE_ONLY;
}

/**
 * Compact product labels used by catalogue surfaces. They describe availability,
 * not the current viewer's entitlement state.
 *
 * @param {string|{id?:string}} sceneOrId
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
