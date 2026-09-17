/**
 * Stable landing-hero candidates.
 *
 * This is presentation data, not a publication list. The visible entries are
 * always derived from PUBLIC_MANIFEST. An unfinished model has no manifest row
 * and therefore cannot appear here.
 */
import { PUBLIC_MANIFEST } from '../catalog/publicManifest.js';

/**
 * The rotation the beta is aiming at, brain first.
 *
 * Two organs, because the anatomy of two organs is what the beta is for.
 *
 * - `sceneId` is the model the hero's link opens.
 * - `upgradeSceneId` is the scene whose geometry replaces the lightweight
 *   builder once it has loaded (`landingOrganViewport.js`). It is the organ's
 *   real anatomy model; the builder is what stands in until it arrives.
 *
 * **This is the declared rotation, not the shown one.** `HERO_ROTATION` below
 * is what the hero actually turns through, and it is this list filtered by what
 * the release opens.
 *
 * The heart is the worked example of why the two lists are separate. It sat
 * here, declared, through the whole time `heart-anatomy` existed as a scene and
 * the release refused it — the files it drew were candidates that had been
 * through no asset pipeline — so the hero showed the brain and offered no way
 * to "see the heart". It joined the rotation on 2026-09-15 when the scene
 * passed `betaPublicationProblems()`, **and this file was not edited to make
 * that happen**. That is the whole point of deriving the shown list rather than
 * writing it down.
 *
 * It used to point at `heart-failure` with the coronary anatomy loaded behind
 * it, on the reasoning that the heart had no anatomy scene of its own. That is
 * exactly the substitution this release does not make: a disease model is not
 * an anatomy model with a different label. Where each organ stands is recorded
 * in `src/catalog/anatomy.js`, and every organ still here and not shown is
 * waiting on the same gate the heart went through.
 */
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
  // Published 2026-09-16. A published organ that is not declared here can never
  // reach the hero: `heroOrgansForModels` keeps only the candidates the release
  // actually opens, so an entry missing from this list is an organ the chooser
  // silently cannot show. That is the shape of bug F-121 was about.
  Object.freeze({
    organ: 'lungs',
    sceneId: 'lung-anatomy',
    upgradeSceneId: 'lung-anatomy',
    kickerEn: 'ANATOMY',
    kickerJa: '解剖',
    lineEn: 'Rotate and zoom the lungs to inspect how the lobes and the airways between them are arranged.',
    lineJa: '肺を回転・拡大し、肺葉と気道の位置関係を確認できます。',
  }),
  Object.freeze({
    organ: 'liver',
    sceneId: 'liver-anatomy',
    upgradeSceneId: 'liver-anatomy',
    kickerEn: 'ANATOMY',
    kickerJa: '解剖',
    lineEn: 'Rotate and zoom the liver to inspect how its segments and the gallbladder are arranged.',
    lineJa: '肝臓を回転・拡大し、区域と胆嚢の位置関係を確認できます。',
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
