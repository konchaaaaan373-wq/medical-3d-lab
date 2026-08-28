/**
 * The app's view of the catalogue.
 *
 * The catalogue itself lives in `src/catalog/` — `taxonomy.js` says what
 * systems and organs exist, `scenes.js` says what scenes exist, and
 * `catalog/index.js` answers questions about them. This module is the small
 * adapter the rest of the app talks to. It exists because the UI components
 * read `label`/`labelJa` rather than `titleEn`/`titleJa`, and because the app
 * should not have to know which of the catalogue's queries it depends on.
 *
 * Adding a scene does not mean touching this file. See
 * `docs/adding-a-scene.md`.
 */
import {
  DEFAULT_SCENE_ID,
  EXPLORER_ROUTE,
  SCENES as CATALOG_SCENES,
  loadScene,
  resolveSceneId as resolveSlug,
  sceneById,
  sceneRoute,
  systemsWithScenes as catalogSystemsWithScenes,
} from '../catalog/index.js';

export { DEFAULT_SCENE_ID, EXPLORER_ROUTE, loadScene, sceneById, sceneRoute };

/**
 * Scene entries in the shape the UI components read.
 * `label` is the scene's own name; the organ and system names come from the
 * taxonomy, so a scene never has to repeat them.
 */
export const SCENES = CATALOG_SCENES.map((scene) => ({
  ...scene,
  label: scene.titleEn,
  labelJa: scene.titleJa,
}));

/** Systems that have at least one scene, each with its scenes — the switcher's two rows. */
export const systemsWithScenes = () => catalogSystemsWithScenes(SCENES);

/** Resolves `#/scene-id` from the URL, falling back to the default scene. */
export function resolveSceneId(hash = window.location.hash) {
  return resolveSlug(hash);
}
