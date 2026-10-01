/**
 * Where a disease model sits, as its title card says it above its name:
 * 「病態モデル / 循環」 — the kind (a link to `#/models`) and the system, in the
 * words the model cards use (`SHOWCASE_SYSTEM_LABELS`).
 *
 * Also whether the model folds its trust into 「このモデルについて」: every
 * disease model does, by default (ADR 2026-09-30); a scene may still ask.
 *
 * Pure — read off the catalogue — so the rule is testable without the title
 * card's DOM and stylesheets.
 */
import { PATHOLOGY_ROUTE } from '../catalog/index.js';
import { PATHOLOGY_CATEGORY, isPathologyModelScene } from '../catalog/pathologyModels.js';
import { SHOWCASE_SYSTEM_LABELS } from '../data/modelShowcase.js';

/**
 * Null for anything that is not a disease model — an anatomy model too.
 *
 * An anatomy scene's header already names the organ it is on (the organ strip,
 * with the current one marked), so 「解剖 / 脳」 on its title card said it twice
 * — and cost the model a corner. The title card is not one of the bands the
 * camera frames into (it does not cross the middle of the frame), so a taller
 * card does not move the model out of its way: it covers it. The brain's
 * front-top was 28px under the card at 1280x800, and `verify:anatomy` read it
 * as a tour click that landed on the card instead of the inferior frontal
 * sulcus.
 *
 * @param {object|null|undefined} scene a catalogue entry
 * @returns {null | { kind: 'disease', parent: {href: string, en: string, ja: string},
 *   where: {en: string, ja: string}|null }}
 */
export function modelLocation(scene) {
  if (!scene || !isPathologyModelScene(scene)) return null;
  return {
    kind: 'disease',
    parent: { href: PATHOLOGY_ROUTE, en: PATHOLOGY_CATEGORY.en, ja: PATHOLOGY_CATEGORY.ja },
    where: SHOWCASE_SYSTEM_LABELS[scene.system] ?? null,
  };
}

/**
 * Whether the title card folds maturity, review and scope into 「このモデルに
 * ついて」.
 *
 * @param {object|null|undefined} scene
 * @param {{ titleCard?: { foldTrust?: boolean } }} [meta]
 */
export const foldsAboutThisModel = (scene, meta = {}) =>
  Boolean(meta.titleCard?.foldTrust ?? isPathologyModelScene(scene));

/**
 * Whether the scene's scope panel goes inside 「このモデルについて」.
 *
 * A scope is reference by default — what the model shows and does not — and
 * the fold is where reference lives. A scope the scene marked `primary` is not
 * reference: it is the question the lesson is built on (circulation's "can MAP
 * stay near 70 while CO and DO₂ rise?"), and folding every disease model by
 * default hid it behind a closed line. So a primary scope stays in the column
 * unless the scene folds it itself, as cardiac-output does (`foldTrust`).
 *
 * @param {{ modelScope?: { primary?: boolean }|null, titleCard?: { foldTrust?: boolean } }} [meta]
 */
export const scopeInAboutFold = (meta = {}) =>
  !meta.modelScope?.primary || meta.titleCard?.foldTrust === true;
