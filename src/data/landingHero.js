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
 * Two organs, because two organs are what the beta opens.
 *
 * - `sceneId` is the model the hero's link opens.
 * - `upgradeSceneId` is the scene whose geometry replaces the lightweight
 *   builder once it has loaded (`landingOrganViewport.js`). It is the organ's
 *   real anatomy model; the builder is what stands in until it arrives.
 *
 * The heart has no anatomy scene of its own — every heart scene in the
 * catalogue is about a disease — so its link opens heart failure, the model
 * this project treats as its reference implementation, while the geometry that
 * replaces the builder is the coronary anatomy, which is the most accurate
 * heart in the repository. That the heart has no anatomy model of its own is a
 * recorded gap, not a decision: see `src/catalog/anatomy.js`.
 */
export const HERO_ORGANS = Object.freeze([
  Object.freeze({
    organ: 'brain',
    sceneId: 'brain-anatomy',
    upgradeSceneId: 'brain-anatomy',
    kickerEn: 'ANATOMY',
    kickerJa: '解剖',
    lineEn: 'Gyri, sulci and the deep structures underneath them.',
    lineJa: '脳回と脳溝、そしてその下にある深部構造。',
  }),
  Object.freeze({
    organ: 'heart',
    sceneId: 'heart-failure',
    upgradeSceneId: 'myocardial-ischemia',
    kickerEn: 'CORONARY ANATOMY',
    kickerJa: '冠動脈解剖',
    lineEn: 'The chambers, the great vessels, and the arteries that feed the muscle.',
    lineJa: '心房・心室と大血管、そして心筋を養う冠動脈。',
  }),
]);

/**
 * Day zero of the rotation. Chosen as the beta release date so the first day
 * shows the brain, which is what the hero is being introduced with. With two
 * organs the hero alternates day by day.
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
