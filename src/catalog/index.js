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
import { LEGAL_SLUGS } from '../data/legalRoutes.js';

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

/** Public product and experimental work are two views over one registry. */
export const PUBLIC_SCENES = SCENES.filter((scene) => scene.status !== 'prototype');
export const LAB_SCENES = SCENES.filter((scene) => scene.status === 'prototype');

export { PLANNED_SCENES, SYSTEMS, ORGANS, STATUS_IDS, statusById, systemById, organById };

/** The route for a scene, as written in an href. */
export const sceneRoute = (scene) => `#/${scene.slug}`;

/** Product-shell routes. Published scene URLs remain unchanged. */
export const LANDING_ROUTE = '#/';
export const EXPLORER_SLUG = 'organs';
export const EXPLORER_ROUTE = `#/${EXPLORER_SLUG}`;
export const LAB_SLUG = 'lab';
export const LAB_ROUTE = `#/${LAB_SLUG}`;

/**
 * Slugs the product shell has already claimed.
 *
 * A scene whose slug collided with one of these would stay reachable by URL
 * while the shell answered instead — the kind of failure only noticed by
 * whoever goes looking. Legal document slugs come from their own module, so
 * adding a document cannot silently shadow a scene.
 */
export const RESERVED_ROUTE_SLUGS = Object.freeze([
  EXPLORER_SLUG,
  'explore',
  LAB_SLUG,
  'experimental',
  'trust',
  'evidence',
  'home',
  ...LEGAL_SLUGS,
]);

/** Named rather than positional: reordering the catalogue must not change legacy fallback behaviour. */
export const DEFAULT_SCENE_ID = 'amyloid-beta';

/** @param {string} id */
export const sceneById = (id) => SCENES.find((scene) => scene.id === id) ?? null;
/** @param {string} slug */
export const sceneBySlug = (slug) => SCENES.find((scene) => scene.slug === slug) ?? null;

/** Every scene that shows this organ, whether it is filed under it or not. */
export const scenesForOrgan = (organId, scenes = SCENES) =>
  scenes.filter((scene) => scene.organs.includes(organId));

/**
 * The scenes worth listing under an organ on an explorer surface.
 *
 * A scene that draws an organ from another system — the whole-body view draws
 * nine of them — is not listed under each one. It is a real answer to "what
 * shows the stomach?", but repeating the same card under ten organs buries the
 * scenes that are actually about them, and the whole-body view is one click
 * away in its own section.
 */
export const scenesListedForOrgan = (organId, scenes = SCENES) =>
  scenesForOrgan(organId, scenes).filter(
    (scene) => scene.organ === organId || scene.system === organById(organId)?.system
  );

/** Scenes filed under a system, in registration order. */
export const scenesForSystem = (systemId, scenes = SCENES) =>
  scenes.filter((scene) => scene.system === systemId);

/** Disease scenes that are declared but not built, for one organ. */
export const plannedForOrgan = (organId) => PLANNED_SCENES.filter((entry) => entry.organ === organId);

/**
 * The catalogue as an explorer draws it: systems, each with its organs, each
 * organ with scenes and optionally planned work.
 *
 * Passing a scene subset is how the public catalogue and Lab remain views over
 * the same registry rather than two registries that can drift.
 */
export function systemsWithOrgans(
  scenes = SCENES,
  { includePlanned = true, includeEmptyOrgans = true } = {}
) {
  return SYSTEMS.map((system) => {
    const systemScenes = scenesForSystem(system.id, scenes);
    const organs = organsOfSystem(system.id)
      .map((organ) => ({
        ...organ,
        scenes: scenesListedForOrgan(organ.id, scenes),
        planned: includePlanned ? plannedForOrgan(organ.id) : [],
      }))
      .filter(
        (organ) =>
          includeEmptyOrgans || organ.scenes.length > 0 || organ.planned.length > 0
      );

    return { ...system, scenes: systemScenes, organs };
  }).filter(
    (system) =>
      system.scenes.length > 0 || system.organs.some((organ) => organ.planned.length > 0)
  );
}

/**
 * The switcher's systems that have scenes.
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

/** Resolves `#/<slug>` to a scene id, falling back to the historic default scene. */
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

    if (RESERVED_ROUTE_SLUGS.includes(scene.slug)) {
      problems.push(`${where}: slug "${scene.slug}" collides with a product-shell route`);
    }
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

    if (scene.access != null) {
      if (!scene.access || typeof scene.access !== 'object' || Array.isArray(scene.access)) {
        problems.push(`${where}: access must be an object`);
      } else {
        const allowed = new Set(['patient', 'education']);
        for (const key of Object.keys(scene.access)) {
          if (!allowed.has(key)) problems.push(`${where}: unknown access capability "${key}"`);
        }
        for (const key of allowed) {
          if (key in scene.access && typeof scene.access[key] !== 'boolean') {
            problems.push(`${where}: access.${key} must be boolean`);
          }
        }
        if (scene.access.patient !== true && scene.access.education !== true) {
          problems.push(`${where}: access declaration enables no paid capability`);
        }
        if (!['reviewed', 'production'].includes(scene.status)) {
          problems.push(`${where}: paid access requires reviewed or production status`);
        }
      }
    }

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
