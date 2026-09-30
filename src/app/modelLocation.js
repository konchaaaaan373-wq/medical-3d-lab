/**
 * Where a model sits, as its title card says it above its name.
 *
 * - a disease model: 「病態モデル / 循環」 — the kind (a link to `#/models`) and
 *   the system, in the words the model cards use (`SHOWCASE_SYSTEM_LABELS`);
 * - an anatomy model: 「解剖 / 心臓」 — the anatomy shelf (`#/anatomy`) and the
 *   organ.
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
 * Whether the title card folds maturity, review and scope into 「このモデルに
 * ついて」.
 *
 * @param {object|null|undefined} scene
 * @param {{ titleCard?: { foldTrust?: boolean } }} [meta]
 */
export const foldsAboutThisModel = (scene, meta = {}) =>
  Boolean(meta.titleCard?.foldTrust ?? isPathologyModelScene(scene));
