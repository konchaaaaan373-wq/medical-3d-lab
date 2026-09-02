/**
 * The app's view of the catalogue.
 *
 * The catalogue itself lives in `src/catalog/` — `taxonomy.js` says what
 * systems and organs exist, `scenes.js` says what scenes exist, and
 * `catalog/index.js` answers questions about them. This module is the small
 * adapter the rest of the app talks to.
 */
import {
  DEFAULT_SCENE_ID,
  EXPLORER_ROUTE,
  LAB_ROUTE,
  LANDING_ROUTE,
  SCENES as CATALOG_SCENES,
  loadScene,
  resolveSceneId as resolveSlug,
  sceneById,
  sceneRoute,
  systemsWithScenes as catalogSystemsWithScenes,
} from '../catalog/index.js';

export {
  DEFAULT_SCENE_ID,
  EXPLORER_ROUTE,
  LAB_ROUTE,
  LANDING_ROUTE,
  loadScene,
  sceneById,
  sceneRoute,
};

/** UI-shaped scene entries. */
export const SCENES = CATALOG_SCENES.map((scene) => ({
  ...scene,
  label: scene.titleEn,
  labelJa: scene.titleJa,
}));

export const PUBLIC_SCENES = SCENES.filter((scene) => scene.status !== 'prototype');
export const LAB_SCENES = SCENES.filter((scene) => scene.status === 'prototype');

/**
 * Systems for the fixed scene navigator.
 *
 * `auto` reads only the current scene's catalogue status. A public scene never
 * lists Prototype work beside reviewed/alpha content; a Lab scene does the
 * inverse. Both remain projections of the same manifest.
 */
export const systemsWithScenes = (scope = 'auto') => {
  let resolvedScope = scope;
  if (scope === 'auto') {
    const hash = globalThis.window?.location?.hash ?? '';
    const currentId = resolveSlug(hash);
    resolvedScope = sceneById(currentId)?.status === 'prototype' ? 'lab' : 'public';
  }

  const scenes =
    resolvedScope === 'public'
      ? PUBLIC_SCENES
      : resolvedScope === 'lab'
        ? LAB_SCENES
        : SCENES;
  return catalogSystemsWithScenes(scenes);
};

/** Resolves `#/scene-id` from the URL, falling back to the historic default scene. */
export function resolveSceneId(hash = window.location.hash) {
  return resolveSlug(hash);
}
