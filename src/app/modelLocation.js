/**
 * Where a model sits, as its title card says it above its name.
 *
 * - a disease model: 「病態モデル / 循環」 — the kind (a link to `#/models`) and
 *   the system, in the words the model cards use (`SHOWCASE_SYSTEM_LABELS`);
 * - an anatomy model: 「解剖 / 心臓」 — the anatomy shelf (`#/anatomy`) and the
 *   organ. The menu's shelves say this; the title card does not (below).
 *
 * Also whether the model folds its trust into 「このモデルについて」: every
 * disease model does, by default (ADR 2026-09-30); a scene may still ask.
 *
 * Pure — read off the catalogue — so the rule is testable without the title
 * card's DOM and stylesheets.
 */
import { ANATOMY_ROUTE, PATHOLOGY_ROUTE, organById } from '../catalog/index.js';
import { PATHOLOGY_CATEGORY, isPathologyModelScene } from '../catalog/pathologyModels.js';
import { SHOWCASE_SYSTEM_LABELS } from '../data/modelShowcase.js';

/**
 * @param {object|null|undefined} scene a catalogue entry
 * @returns {null | { kind: 'disease'|'anatomy', parent: {href: string, en: string, ja: string},
 *   where: {en: string, ja: string}|null }}
 */
export function modelLocation(scene) {
  if (!scene) return null;
  if (isPathologyModelScene(scene)) {
    return {
      kind: 'disease',
      parent: { href: PATHOLOGY_ROUTE, en: PATHOLOGY_CATEGORY.en, ja: PATHOLOGY_CATEGORY.ja },
      where: SHOWCASE_SYSTEM_LABELS[scene.system] ?? null,
    };
  }
  const organ = organById(scene.organ);
  return {
    kind: 'anatomy',
    parent: { href: ANATOMY_ROUTE, en: 'Anatomy', ja: '解剖' },
    where: organ ? { en: organ.label, ja: organ.labelJa } : null,
  };
}

/**
 * The trail the title card puts above the model's name — a disease model's only.
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
 */
export function titleTrailFor(scene) {
  const location = modelLocation(scene);
  return location?.kind === 'disease' ? location : null;
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
