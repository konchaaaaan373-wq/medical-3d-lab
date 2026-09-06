/**
 * What the current release actually opens.
 *
 * The catalogue says which scenes *exist*; this file says which of them are
 * finished enough to be handed to somebody who arrived from a social post.
 * Everything else stays in the repository, stays buildable, stays testable and
 * keeps being developed — it is simply answered with "to be updated" instead of
 * being opened.
 *
 * ## Two organs, and nothing schematic
 *
 * The beta opens the brain and the heart, and only at `alpha` or better.
 *
 * Those are the two organs this project has actually invested in, and the bar
 * is the one the catalogue already enforces: a `prototype` is "形は概略、動きは
 * 仮" by its own definition, so a beta made of prototypes would be handing a
 * first-time visitor the least-finished half of the work while the models that
 * have a model layer, an evidence dossier and a model card stayed hidden. Two
 * finished organs say more about what this is than twenty sketches.
 *
 * Note what this is *not*: it is not "anatomy only". There is no anatomy-grade
 * heart scene in the catalogue — every heart scene is about a disease — so
 * opening the heart means opening heart failure, low cardiac output and
 * myocardial ischaemia, numbers included. Those three carry their own scope
 * panels and their review state is shown on every card and on `#/trust`, which
 * is where a claim about a number is answered.
 *
 * ## This is a curtain, not a lock
 *
 * The gate runs in the browser and the scene modules are still in the build.
 * It exists so that a visitor is not shown work that is not ready, not to
 * protect a secret. Do not put anything behind it that would matter if it were
 * read — and do not add a second "is this really locked" check on the server
 * for the same reason.
 */
import { SCENES, sceneById } from './index.js';

/** Bump to `'public'` — one line — when the whole catalogue is ready to open. */
export const RELEASE_CHANNEL = 'beta';

/** The organs the beta is being spread with. */
export const BETA_ORGANS = Object.freeze(['brain', 'heart']);

/**
 * Maturity a scene needs before the beta will open it.
 *
 * `prototype` is excluded by name rather than by listing the three that are
 * allowed, so that a status added later fails closed at the test rather than
 * silently joining the release.
 */
export const BETA_EXCLUDED_STATUS = 'prototype';

/**
 * An organ model: anatomy, or the normal motion of one organ. No disease, no
 * clinical read-out.
 *
 * Kept because the Explorer prints it on every card, and because it is the
 * honest name for the difference between the two kinds of scene. It is no
 * longer what decides the release — see above.
 *
 * @param {{disease?: string|null}|null} scene
 */
export const isOrganModel = (scene) => Boolean(scene) && !scene.disease;

/** Whether this scene is open in the current release channel. */
export const isSceneReleased = (scene) => {
  if (!scene) return false;
  if (RELEASE_CHANNEL !== 'beta') return true;
  return BETA_ORGANS.includes(scene.organ) && scene.status !== BETA_EXCLUDED_STATUS;
};

/** The models the beta ships, in catalogue order. */
export const RELEASED_SCENES = SCENES.filter(isSceneReleased);

/** Declared, built, and deliberately not open yet. */
export const LOCKED_SCENES = SCENES.filter((scene) => !isSceneReleased(scene));

/**
 * What a crawler is allowed to see: a scene has to be **both** open and public.
 *
 * Two independent reasons to withhold a page, and a set that satisfies only one
 * of them is a bug in whichever channel it is not checked in:
 *
 * - **Not open** — a static page inviting a reader to "open the interactive
 *   model" that then answers "to be updated" is a promise the site cannot keep.
 * - **Prototype** — its shape and motion are provisional by definition, and a
 *   search result is exactly where that caveat gets stripped off.
 *
 * Taking `RELEASED_SCENES` alone was wrong and would not have shown until the
 * beta ended: `isSceneReleased` returns true for everything once the channel
 * changes, so the day this opens is the day fourteen prototypes are published
 * to the crawlable surface. Taking `PUBLIC_SCENES` alone was the state before
 * the beta, and it published nine models nobody could open.
 */
export const CRAWLABLE_SCENES = SCENES.filter(
  (scene) => isSceneReleased(scene) && scene.status !== BETA_EXCLUDED_STATUS
);

/**
 * Product-shell routes that stay open.
 *
 * The landing page and the catalogue are how a visitor reaches a model at all.
 * The legal documents are open because a person may need them on a device that
 * cannot start WebGL, and `#/trust` because saying which models are reviewed —
 * and which are not — is more honest with the locked ones listed than with the
 * page hidden.
 *
 * `lab` is not here: it is the experimental surface, and every scene on it is
 * a prototype the beta is holding back. It stays reachable to a developer
 * through the unlock below.
 */
const RELEASED_ROUTE_KINDS = new Set(['landing', 'explorer', 'trust', 'legal']);

/**
 * @param {{kind:string, sceneId?:string}} route a `resolveRoute` result
 */
export function isRouteReleased(route) {
  if (!route) return false;
  if (route.kind === 'scene') return isSceneReleased(sceneById(route.sceneId));
  return RELEASED_ROUTE_KINDS.has(route.kind);
}

/** `?preview=1` opens everything; `?preview=0` closes it again. */
export const DEV_UNLOCK_PARAM = 'preview';

/** Where the answer is remembered, so a developer sets it once per browser. */
export const DEV_UNLOCK_STORAGE_KEY = 'm3l.beta-preview';

const OFF_VALUES = new Set(['', '0', 'false', 'off', 'no']);

/**
 * Resolve the developer unlock from the three things that can say so.
 *
 * Pure, so the whole rule is testable: the browser wiring in
 * `src/app/releaseGate.js` is the only part that touches `window`.
 *
 * @param {{search?:string, stored?:string|null, devBuild?:boolean}} [input]
 * @returns {{unlocked:boolean, persist:boolean|null}} `persist` is what the
 *   caller should write to storage: `true` to remember, `false` to forget,
 *   `null` to leave whatever is there alone.
 */
export function resolveDevUnlock({ search = '', stored = null, devBuild = false } = {}) {
  // `npm run dev` is a developer, by definition. Never make them type a query
  // parameter to see the work they are in the middle of.
  if (devBuild) return { unlocked: true, persist: null };

  const requested = new URLSearchParams(search).get(DEV_UNLOCK_PARAM);
  if (requested != null) {
    const unlocked = !OFF_VALUES.has(requested.trim().toLowerCase());
    return { unlocked, persist: unlocked };
  }
  return { unlocked: stored === 'on', persist: null };
}
