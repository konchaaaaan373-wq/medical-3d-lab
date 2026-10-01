/**
 * Which model cards have a poster, and the route that photographs each one.
 *
 * `MODEL_SHOWCASE` is keyed by **scene id**, and a scene's route is its
 * **slug** — the two differ for some scenes (`copd-hyperinflation` is
 * `#/copd`). The capture script used the key as the route, so a poster named
 * for one of those would have opened `#/copd-hyperinflation`, which the router
 * does not know, and photographed the default scene under the wrong name.
 * Resolved here through the catalogue, so the script and its test ask the
 * same thing.
 */
import { sceneById, sceneRoute } from '../../src/catalog/index.js';
import { MODEL_SHOWCASE } from '../../src/data/modelShowcase.js';

/**
 * @param {{ only?: string[], showcase?: Record<string, {poster?: string|null}> }} [options]
 *   `only` names scenes by id or by slug
 * @returns {{ id: string, route: string, poster: string }[]}
 */
export function posterTargets({ only = [], showcase = MODEL_SHOWCASE } = {}) {
  return Object.entries(showcase)
    .filter(([, entry]) => entry.poster)
    .map(([id, entry]) => {
      const scene = sceneById(id);
      if (!scene) throw new Error(`MODEL_SHOWCASE names "${id}", which is not a scene in the catalogue`);
      return { id, route: sceneRoute(scene), poster: entry.poster };
    })
    .filter((target) => !only.length || only.includes(target.id) || only.includes(target.route.replace(/^#\//, '')));
}
