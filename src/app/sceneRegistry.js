/**
 * Every scene is registered here and loaded on demand.
 *
 * Adding a scene = add a folder under `src/scenes/` that exports a scene class
 * implementing the interface documented in `AmyloidBetaScene`, then add one
 * entry below and say which organ it belongs to. Nothing else in the app needs
 * to change.
 */

/**
 * The top level of the navigation, because that is the level the subjects
 * actually differ at.
 *
 * "Amyloid-β" and "Heart failure" side by side read as two things of the same
 * kind, and they are not: one is a molecular process in the brain and the other
 * a mechanical failure of the heart. Anything added later — a second cardiac
 * scene, a renal one — has the same problem, and grouping by organ is the split
 * that survives it.
 *
 * Ordered head to toe, which is also the order the scenes happen to have been
 * built in, so nothing about what the site opens on changes.
 */
export const ORGANS = [
  { id: 'brain', label: 'Brain', labelJa: '脳' },
  { id: 'heart', label: 'Heart', labelJa: '心臓' },
];

export const SCENES = [
  {
    id: 'amyloid-beta',
    organ: 'brain',
    label: 'Amyloid-β',
    labelJa: 'アミロイドβ',
    load: () => import('../scenes/amyloidBeta/index.js'),
  },
  {
    id: 'heart-failure',
    organ: 'heart',
    label: 'Heart failure',
    labelJa: '心不全',
    load: () => import('../scenes/heartFailure/index.js'),
  },
];

/**
 * Named rather than positional: the organ tabs can be reordered without
 * silently changing what the site opens on.
 */
export const DEFAULT_SCENE_ID = 'amyloid-beta';

/** Resolves `#/scene-id` from the URL, falling back to the default scene. */
export function resolveSceneId(hash = window.location.hash) {
  const id = hash.replace(/^#\/?/, '').trim();
  return SCENES.some((scene) => scene.id === id) ? id : DEFAULT_SCENE_ID;
}

/**
 * The organs, each with its own scenes, in registration order.
 * Organs with no scenes are left out — a tab that leads nowhere is worse than
 * no tab.
 */
export function organsWithScenes(scenes = SCENES, organs = ORGANS) {
  return organs
    .map((organ) => ({ ...organ, scenes: scenes.filter((scene) => scene.organ === organ.id) }))
    .filter((organ) => organ.scenes.length > 0);
}

/** Which organ a scene belongs to, or null if it names one that does not exist. */
export function organIdFor(sceneId, scenes = SCENES) {
  return scenes.find((scene) => scene.id === sceneId)?.organ ?? null;
}

export async function loadScene(id) {
  const entry = SCENES.find((scene) => scene.id === id) ?? SCENES[0];
  const module = await entry.load();
  return module.default;
}
