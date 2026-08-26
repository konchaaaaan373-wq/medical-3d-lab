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
  const grouped = organs
    .map((organ) => ({ ...organ, scenes: scenes.filter((scene) => scene.organ === organ.id) }))
    .filter((organ) => organ.scenes.length > 0);

  // A scene naming an organ that does not exist would stay reachable by URL and
  // vanish from the navigation — the kind of failure that is only noticed by
  // whoever goes looking for it. `tests/scene-registry.test.js` fails on it, and
  // this says so in the console for anyone who gets there another way.
  const placed = grouped.reduce((count, organ) => count + organ.scenes.length, 0);
  if (placed !== scenes.length) {
    const orphans = scenes.filter((scene) => !organs.some((organ) => organ.id === scene.organ));
    console.warn(
      `sceneRegistry: ${orphans.length} scene(s) name an organ that is not registered and will not appear in the ` +
        `navigation: ${orphans.map((scene) => `${scene.id} -> "${scene.organ}"`).join(', ')}`
    );
  }
  return grouped;
}

export async function loadScene(id) {
  // Falls back to the same scene `resolveSceneId` does, so an id that gets here
  // without going through it cannot load one scene while the UI marks another
  // as current.
  const entry = SCENES.find((scene) => scene.id === id) ?? SCENES.find((scene) => scene.id === DEFAULT_SCENE_ID);
  const module = await entry.load();
  return module.default;
}
