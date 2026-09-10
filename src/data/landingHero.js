/**
 * Stable landing-hero candidates.
 *
 * This is presentation data, not a publication list. The visible entries are
 * always derived from PUBLIC_MANIFEST. An unfinished model has no manifest row
 * and therefore cannot appear here.
 */
import { PUBLIC_MANIFEST } from '../catalog/publicManifest.js';

export const HERO_ORGANS = Object.freeze([
  Object.freeze({
    organ: 'brain',
    sceneId: 'brain-anatomy',
    upgradeSceneId: 'brain-anatomy',
    kickerEn: 'ANATOMY',
    kickerJa: '解剖',
    lineEn: 'Rotate and zoom the brain to inspect the spatial relationship between its colour-coded structures.',
    lineJa: '脳を回転・拡大し、色分けされた部位の位置関係を確認できます。',
  }),
  Object.freeze({
    organ: 'heart',
    sceneId: 'heart-anatomy',
    upgradeSceneId: 'heart-anatomy',
    kickerEn: 'ANATOMY',
    kickerJa: '解剖',
    lineEn: 'Rotate and zoom the heart to inspect the spatial relationship between its structures.',
    lineJa: '心臓を回転・拡大し、部位ごとの位置関係を確認できます。',
  }),
]);

/**
 * Join presentation data to rows the release contract actually publishes.
 * The row's route is carried through so a fixture can exercise a future model
 * without registering that model in production data.
 */
export function heroOrgansForModels(models, candidates = HERO_ORGANS) {
  const rows = new Map((models ?? []).map((row) => [row.sceneId, row]));
  return Object.freeze(
    candidates
      .filter((entry) => rows.has(entry.sceneId))
      .map((entry) => Object.freeze({ ...entry, route: rows.get(entry.sceneId).route }))
  );
}

/** What may be shown in production today. */
export const HERO_ROTATION = heroOrgansForModels(PUBLIC_MANIFEST.models);

/**
 * The initial model is deliberately stable. More published models add an
 * explicit chooser; the calendar never changes what a returning visitor sees.
 *
 * @param {Date} [_date] retained for call-site compatibility
 * @param {ReadonlyArray<typeof HERO_ORGANS[number]>} [models]
 */
export function featuredHeroOrgan(_date = new Date(), models = HERO_ROTATION) {
  return models[0] ?? null;
}

/**
 * Retained for consumers on the contract-fixed branch. Calendar position no
 * longer affects the hero, so every date belongs to the same stable slot.
 */
export function heroRotationDay(_date = new Date()) {
  return 0;
}

/** @param {string} organId */
export const heroOrganById = (organId) =>
  HERO_ROTATION.find((entry) => entry.organ === organId) ?? null;
