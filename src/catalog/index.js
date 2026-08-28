/**
 * Queries over the catalogue.
 *
 * Everything the app asks about scenes goes through here: which scenes exist,
 * where a scene sits in the body, what its route is, and whether the catalogue
 * is internally consistent. Keeping the questions in one place is what lets the
 * navigation, the explorer and the tests stay in agreement as the list grows.
 */
import { ORGANS, SYSTEMS, STATUS_IDS, organById, organsOfSystem, statusById, systemById } from './taxonomy.js';
import { SCENE_MANIFEST, PLANNED_SCENES } from './scenes.js';

/** Manifest entries with the optional fields filled in. */
export const SCENES = SCENE_MANIFEST.map((entry) => ({
  ...entry,
  slug: entry.slug ?? entry.id,
  // A scene about the stomach also draws the oesophagus; `organs` is what the
  // explorer uses to decide an organ is covered, `organ` is where it is filed.
  organs: entry.organs ?? [entry.organ],
  disease: entry.disease ?? null,
  tags: entry.tags ?? [],
}));

export { PLANNED_SCENES, SYSTEMS, ORGANS, STATUS_IDS, statusById, systemById, organById };

/** The route for a scene, as written in an href. */
export const sceneRoute = (scene) => `#/${scene.slug}`;

/** The explorer's own route — the one page that is not a scene. */
export const EXPLORER_SLUG = 'organs';
export const EXPLORER_ROUTE = `#/${EXPLORER_SLUG}`;

/** Named rather than positional: reordering the catalogue must not change what opens. */
export const DEFAULT_SCENE_ID = 'amyloid-beta';

/** @param {string} id */
export const sceneById = (id) => SCENES.find((scene) => scene.id === id) ?? null;
/** @param {string} slug */
export const sceneBySlug = (slug) => SCENES.find((scene) => scene.slug === slug) ?? null;

/** Every scene that shows this organ, whether it is filed under it or not. */
export const scenesForOrgan = (organId) => SCENES.filter((scene) => scene.organs.includes(organId));

/**
 * The scenes worth listing under an organ on the explorer.
 *
 * A scene that draws an organ from another system — the whole-body view draws
 * nine of them — is not listed under each one. It is a real answer to "what
 * shows the stomach?", but repeating the same card under ten organs buries the
 * scenes that are actually about them, and the whole-body view is one click
 * away in its own section.
 */
export const scenesListedForOrgan = (organId) =>
  scenesForOrgan(organId).filter(
    (scene) => scene.organ === organId || scene.system === organById(organId)?.system
  );

/** Scenes filed under a system, in registration order. */
export const scenesForSystem = (systemId) => SCENES.filter((scene) => scene.system === systemId);

/** Disease scenes that are declared but not built, for one organ. */
export const plannedForOrgan = (organId) => PLANNED_SCENES.filter((entry) => entry.organ === organId);

/**
 * The catalogue as the explorer draws it: systems, each with its organs, each
 * organ with the scenes that show it. Systems with no scenes at all are left
 * out — a heading that leads nowhere is worse than no heading.
 */
export function systemsWithOrgans() {
  return SYSTEMS.map((system) => ({
    ...system,
    scenes: scenesForSystem(system.id),
    organs: organsOfSystem(system.id).map((organ) => ({
      ...organ,
      scenes: scenesListedForOrgan(organ.id),
      planned: plannedForOrgan(organ.id),
    })),
  })).filter((system) => system.scenes.length > 0);
}

/**
 * The switcher's two rows: systems that have scenes, each with its scenes.
 *
 * The top level of the in-scene navigation is the system rather than the organ,
 * because at twenty-odd organs an organ row no longer fits on a phone — and
 * "which system" is the question a viewer can actually answer from memory.
 */
export function systemsWithScenes(scenes = SCENES, systems = SYSTEMS) {
  const grouped = systems
    .map((system) => ({ ...system, scenes: scenes.filter((scene) => scene.system === system.id) }))
    .filter((system) => system.scenes.length > 0);

  // A scene naming a system that does not exist would stay reachable by URL and
  // vanish from the navigation — the kind of failure only noticed by whoever
  // goes looking. `tests/catalog.test.js` fails on it; this says so in the
  // console for anyone who gets there another way.
  const placed = grouped.reduce((count, system) => count + system.scenes.length, 0);
  if (placed !== scenes.length) {
    const orphans = scenes.filter((scene) => !systems.some((system) => system.id === scene.system));
    console.warn(
      `catalog: ${orphans.length} scene(s) name a system that is not registered and will not appear in the ` +
        `navigation: ${orphans.map((scene) => `${scene.id} -> "${scene.system}"`).join(', ')}`
    );
  }
  return grouped;
}

/** Resolves `#/<slug>` to a scene id, falling back to the default scene. */
export function resolveSceneId(hash = '') {
  const slug = String(hash).replace(/^#\/?/, '').trim();
  return sceneBySlug(slug)?.id ?? DEFAULT_SCENE_ID;
}

/**
 * Loads a scene's module and returns its class.
 *
 * Falls back to the same scene `resolveSceneId` does, so an id that arrives
 * here without passing through it cannot load one scene while the navigation
 * marks another as current.
 */
export async function loadScene(id) {
  const entry = sceneById(id) ?? sceneById(DEFAULT_SCENE_ID);
  const module = await entry.load();
  return module.default;
}

/**
 * Everything structurally wrong with the catalogue, as human-readable lines.
 *
 * Returned rather than thrown so both the test suite and a dev-mode console
 * check can use it. It is deliberately cheap: no scene module is imported, so
 * this stays callable at start-up without pulling in any Three.js.
 */
export function validateCatalog(scenes = SCENES) {
  const problems = [];
  const seenIds = new Set();
  const seenSlugs = new Set();

  for (const scene of scenes) {
    const where = `scene "${scene.id ?? '(no id)'}"`;
    if (!scene.id) problems.push('a scene has no id');
    else if (seenIds.has(scene.id)) problems.push(`${where}: duplicate id`);
    else seenIds.add(scene.id);

    if (!scene.slug) problems.push(`${where}: no slug`);
    else if (seenSlugs.has(scene.slug)) problems.push(`${where}: duplicate slug "${scene.slug}"`);
    else seenSlugs.add(scene.slug);

    if (scene.slug === EXPLORER_SLUG) problems.push(`${where}: slug collides with the explorer route`);
    if (!systemById(scene.system)) problems.push(`${where}: unknown system "${scene.system}"`);
    if (!organById(scene.organ)) problems.push(`${where}: unknown organ "${scene.organ}"`);
    for (const organ of scene.organs) {
      if (!organById(organ)) problems.push(`${where}: unknown organ "${organ}" in organs[]`);
    }
    if (!scene.organs.includes(scene.organ)) problems.push(`${where}: organs[] does not include its own organ`);
    if (organById(scene.organ) && organById(scene.organ).system !== scene.system) {
      problems.push(`${where}: organ "${scene.organ}" does not belong to system "${scene.system}"`);
    }
    if (!STATUS_IDS.includes(scene.status)) problems.push(`${where}: unknown status "${scene.status}"`);
    if (typeof scene.load !== 'function') problems.push(`${where}: load is not a function`);
    if (!scene.titleEn || !scene.titleJa) problems.push(`${where}: needs a title in both languages`);
    if (!scene.description || !scene.descriptionJa) problems.push(`${where}: needs a description in both languages`);
  }

  for (const organ of ORGANS) {
    if (!systemById(organ.system)) problems.push(`organ "${organ.id}": unknown system "${organ.system}"`);
  }
  for (const planned of PLANNED_SCENES) {
    if (!organById(planned.organ)) problems.push(`planned "${planned.disease}": unknown organ "${planned.organ}"`);
  }
  if (!sceneById(DEFAULT_SCENE_ID)) problems.push(`DEFAULT_SCENE_ID "${DEFAULT_SCENE_ID}" is not a registered scene`);

  return problems;
}
