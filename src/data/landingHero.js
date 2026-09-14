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
 * the release opens. The heart entry names `heart-anatomy`, which now exists as
 * a scene and which the release does not open — it is built on candidate assets
 * that have been through no asset pipeline — so today the hero still shows the
 * brain and offers no way to "see the heart".
 *
 * It used to point at `heart-failure` with the coronary anatomy loaded behind
 * it, on the reasoning that the heart had no anatomy scene of its own. That is
 * exactly the substitution this release does not make: a disease model is not
 * an anatomy model with a different label. The gap is recorded in
 * `src/catalog/anatomy.js`, and the heart returns to the rotation the day
 * `heart-anatomy` passes `betaPublicationProblems()` — with no edit here.
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
  Object.freeze({
    organ: 'lungs',
    sceneId: 'lung-anatomy',
    upgradeSceneId: 'lung-anatomy',
    kickerEn: 'ANATOMY',
    kickerJa: '解剖',
    lineEn: 'Five lobes, the bronchi that fill them and the vessels that reach them, each one selectable by name.',
    lineJa: '5 つの肺葉と、そこへ入る気管支・血管を、名前で個別に選択できます。',
  }),
  Object.freeze({
    organ: 'liver',
    sceneId: 'liver-anatomy',
    upgradeSceneId: 'liver-anatomy',
    kickerEn: 'ANATOMY',
    kickerJa: '解剖',
    lineEn: "Couinaud's eight segments, drawn as the portal and hepatic veins divide them.",
    lineJa: 'Couinaud の 8 区域を、門脈と肝静脈が分ける形で見られます。',
  }),
  Object.freeze({
    organ: 'kidney',
    sceneId: 'kidney-anatomy',
    upgradeSceneId: 'kidney-anatomy',
    kickerEn: 'ANATOMY',
    kickerJa: '解剖',
    lineEn: 'Cut it coronally and the cortex, the pyramids between the columns and the collecting system are on the face.',
    lineJa: '冠状断で切ると、皮質・腎柱に挟まれた錐体・集合系が断面に出ます。',
  }),
  Object.freeze({
    organ: 'stomach',
    sceneId: 'stomach-anatomy',
    upgradeSceneId: 'stomach-anatomy',
    kickerEn: 'ANATOMY',
    kickerJa: '解剖',
    lineEn: 'Five named regions from the cardia to the pylorus, and a cut that opens the stomach rather than filling it.',
    lineJa: '噴門部から幽門まで 5 つの部位。切断は胃を「開き」ます。',
  }),
  Object.freeze({
    organ: 'esophagus',
    sceneId: 'esophagus-anatomy',
    upgradeSceneId: 'esophagus-anatomy',
    kickerEn: 'ANATOMY',
    kickerJa: '解剖',
    lineEn: 'Three lengths and three constrictions, with the arch and the bronchus that make the second one.',
    lineJa: '3 つの部位と 3 つの狭窄部。第 2 狭窄を作る大動脈弓と気管支も見られます。',
  }),
  Object.freeze({
    organ: 'colon',
    sceneId: 'intestine-anatomy',
    upgradeSceneId: 'intestine-anatomy',
    kickerEn: 'ANATOMY',
    kickerJa: '解剖',
    lineEn: 'The colon framing the small bowel, each named length its own shape and colour.',
    lineJa: '小腸を囲む結腸。名前のついた各部が形と色で分かれています。',
  }),
  Object.freeze({
    organ: 'gallbladder',
    sceneId: 'biliary-anatomy',
    upgradeSceneId: 'biliary-anatomy',
    kickerEn: 'ANATOMY',
    kickerJa: '解剖',
    lineEn: 'The duct system from the hepatic ducts to the papilla, with the gallbladder on its own duct.',
    lineJa: '肝管から乳頭部までの胆道。胆嚢は自分の管で繋がっています。',
  }),
  Object.freeze({
    organ: 'pancreas',
    sceneId: 'pancreas-anatomy',
    upgradeSceneId: 'pancreas-anatomy',
    kickerEn: 'ANATOMY',
    kickerJa: '解剖',
    lineEn: 'Head, neck, body and tail, and a section that shows the duct running through the gland.',
    lineJa: '膵頭部・頸部・体部・尾部。断面では膵管が腺の中を走ります。',
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
