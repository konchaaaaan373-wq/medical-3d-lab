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
 * which model the hero opens live here — and whether an organ is offered at all
 * comes from `catalog/publicManifest.js`, never from this file.
 */
import { publicModelById } from '../catalog/publicManifest.js';

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
 * a scene and which the release does not open — it is built on a candidate
 * asset and its great vessels are missing — so today the hero still shows the
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
    lineEn: 'Gyri, sulci and the deep structures underneath them.',
    lineJa: '脳回と脳溝、そしてその下にある深部構造。',
  }),
  Object.freeze({
    organ: 'heart',
    sceneId: 'heart-anatomy',
    upgradeSceneId: 'heart-anatomy',
    kickerEn: 'ANATOMY',
    kickerJa: '解剖',
    lineEn: 'The chambers, the valves, the great vessels and the arteries that feed the muscle.',
    lineJa: '心房・心室、弁、大血管、そして心筋を養う冠動脈。',
  }),
]);

/**
 * What the hero actually rotates through: the declared entries whose model is
 * open today.
 *
 * Derived rather than maintained, so the one list of organs stays the target
 * and the release stays the only thing that decides whether an organ is
 * offered. An entry naming a scene that is not open is simply not shown —
 * never shown as a card that apologises, and never quietly repointed at a
 * neighbouring model.
 */
export const HERO_ROTATION = Object.freeze(
  HERO_ORGANS.filter((entry) => publicModelById(entry.sceneId) !== null)
);

/**
 * Day zero of the rotation. Chosen as the beta release date so the first day
 * shows the brain, which is what the hero is being introduced with. With two
 * organs the hero alternates day by day; with one, every day is the brain.
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
export function featuredHeroOrgan(date = new Date(), rotation = HERO_ROTATION) {
  const length = rotation.length;
  if (!length) return null;
  const day = heroRotationDay(date);
  return rotation[((day % length) + length) % length];
}

/** @param {string} organId */
export const heroOrganById = (organId) =>
  HERO_ROTATION.find((entry) => entry.organ === organId) ?? null;
