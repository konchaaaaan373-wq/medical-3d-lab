/**
 * Which organ the landing hero is showing today.
 *
 * The hero used to be one scene forever. During the beta the thing being
 * spread is the organ models themselves, so the hero is one of them and it
 * changes — the page is not the same page every week, and a visitor who came
 * back for the brain finds the lungs and clicks through to a second model.
 *
 * The rotation is by calendar day and by UTC, so it is the same for everyone
 * who opens the page at the same time and it is a pure function of the date.
 * No randomness: a hero that differs between two people looking at the same
 * link is a support question, not a feature.
 *
 * Labels come from `catalog/taxonomy.js`. Only the order, the line of copy and
 * which model the hero opens live here.
 */

/**
 * The rotation, brain first.
 *
 * `sceneId` is the organ model this hero opens. The heart has no anatomy scene
 * of its own yet — every heart scene in the catalogue is about a disease — so
 * it opens the whole-body view, which is built from this same heart builder.
 */
export const HERO_ORGANS = Object.freeze([
  Object.freeze({
    organ: 'brain',
    sceneId: 'brain-anatomy',
    lineEn: 'Gyri, sulci and the deep structures underneath them.',
    lineJa: '脳回と脳溝、そしてその下にある深部構造。',
  }),
  Object.freeze({
    organ: 'heart',
    sceneId: 'body-overview',
    lineEn: 'The chambers and great vessels, in their place in the body.',
    lineJa: '心房・心室と大血管を、体の中の位置関係のまま。',
  }),
  Object.freeze({
    organ: 'lungs',
    sceneId: 'breathing-lungs',
    lineEn: 'Five lobes, two fissures, and the airway that reaches them.',
    lineJa: '5つの肺葉と葉間裂、そこへ届く気道。',
  }),
  Object.freeze({
    organ: 'liver',
    sceneId: 'liver-portal-flow',
    lineEn: 'The lobes, and the portal blood that crosses them.',
    lineJa: '肝葉と、そこを通り抜ける門脈血。',
  }),
  Object.freeze({
    organ: 'kidney',
    sceneId: 'urinary-filtration',
    lineEn: 'Cortex, medulla and pelvis — where the filtrate leaves.',
    lineJa: '皮質・髄質・腎盂。濾過された尿が出ていく道筋。',
  }),
]);

/**
 * Day zero of the rotation. Chosen as the beta release date so the first day
 * shows the brain, which is what the hero is being introduced with.
 */
export const HERO_ROTATION_EPOCH_UTC = Date.UTC(2026, 8, 6);

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * How many whole UTC days separate a date from the epoch. Negative before it,
 * which the caller's modulo folds back into range.
 *
 * @param {Date} date
 */
export function heroRotationDay(date = new Date()) {
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.round((midnight - HERO_ROTATION_EPOCH_UTC) / DAY_MS);
}

/**
 * The organ the hero opens with on a given day.
 *
 * @param {Date} [date]
 * @param {ReadonlyArray<typeof HERO_ORGANS[number]>} [rotation]
 */
export function featuredHeroOrgan(date = new Date(), rotation = HERO_ORGANS) {
  const length = rotation.length;
  if (!length) return null;
  const day = heroRotationDay(date);
  return rotation[((day % length) + length) % length];
}

/** @param {string} organId */
export const heroOrganById = (organId) =>
  HERO_ORGANS.find((entry) => entry.organ === organId) ?? null;
