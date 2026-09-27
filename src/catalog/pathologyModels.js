/**
 * Which scenes are "病態モデル" — the category a mechanism scene's breadcrumb
 * names and `#/pathology` lists.
 *
 * Read off the model profile, not off a list: a scene is in the category when
 * it computes or shows a mechanism (`mechanismLevel` is anything but `none`) or
 * when the catalogue says it is about a disease. Anatomy scenes are neither,
 * so the anatomy models and this category cannot overlap.
 *
 * Which of them a reader may open is still the release gate's decision; this
 * module only says what the category is.
 */
import { MECHANISM_LEVEL, modelProfileForScene } from './modelProfiles.js';

export const PATHOLOGY_CATEGORY = Object.freeze({ en: 'Disease models', ja: '病態モデル' });

/** @param {{disease?: unknown, modelProfile?: string}|null|undefined} scene */
export function isPathologyModelScene(scene) {
  if (!scene) return false;
  if (scene.disease) return true;
  const level = modelProfileForScene(scene)?.mechanismLevel;
  return Boolean(level) && level !== MECHANISM_LEVEL.NONE;
}

/** @param {ReadonlyArray<object>} scenes */
export const pathologyModelScenes = (scenes) => scenes.filter(isPathologyModelScene);
