/**
 * Every disease theme is registered here and loaded on demand.
 *
 * Adding a theme = add a folder under `src/scenes/` that exports a scene class
 * implementing the interface documented in `AmyloidBetaScene`, then add one
 * entry below. Nothing else in the app needs to change.
 */
export const SCENES = [
  {
    id: 'amyloid-beta',
    label: 'Amyloid-β accumulation',
    load: () => import('../scenes/amyloidBeta/index.js'),
  },
  // { id: 'heart-failure', label: 'Heart failure', load: () => import('../scenes/heartFailure/index.js') },
];

export const DEFAULT_SCENE_ID = SCENES[0].id;

/** Resolves `#/scene-id` from the URL, falling back to the default theme. */
export function resolveSceneId(hash = window.location.hash) {
  const id = hash.replace(/^#\/?/, '').trim();
  return SCENES.some((scene) => scene.id === id) ? id : DEFAULT_SCENE_ID;
}

export async function loadScene(id) {
  const entry = SCENES.find((scene) => scene.id === id) ?? SCENES[0];
  const module = await entry.load();
  return module.default;
}
