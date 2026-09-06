/**
 * What the current release actually opens to the public.
 *
 * The catalogue says which scenes *exist*; this file says which of them are
 * finished enough to be handed to somebody who arrived from a social post.
 * Everything else stays in the repository, stays buildable, stays testable and
 * keeps being developed — it is simply answered with "to be updated" instead of
 * being opened.
 *
 * ## Why the split is anatomy vs. disease
 *
 * An organ model answers "what does this look like, and how does it move".
 * Its claim is a shape. A disease model answers "what is going wrong, and by
 * how much" — it puts numbers on a screen, and those numbers are only worth
 * showing once the model layer, the evidence dossier, the model card and the
 * scope panel are all in place (see `docs/adding-a-scene.md`). The beta ships
 * the first kind and holds back the second. `scene.disease` is already the
 * catalogue's own name for that difference, so nothing new has to be kept in
 * sync: a scene declared with a disease is locked, one without is open.
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

/** Bump to `'public'` — one line — when the disease models are ready to open. */
export const RELEASE_CHANNEL = 'beta';

/**
 * An organ model: anatomy, or the normal motion of one organ. No disease, no
 * clinical read-out.
 *
 * @param {{disease?: string|null}|null} scene
 */
export const isOrganModel = (scene) => Boolean(scene) && !scene.disease;

/** Whether this scene is open in the current release channel. */
export const isSceneReleased = (scene) =>
  RELEASE_CHANNEL !== 'beta' ? Boolean(scene) : isOrganModel(scene);

/** The organ models the beta ships, in catalogue order. */
export const RELEASED_SCENES = SCENES.filter(isSceneReleased);

/** Declared, built, and deliberately not open yet. */
export const LOCKED_SCENES = SCENES.filter((scene) => !isSceneReleased(scene));

/**
 * Product-shell routes that stay open.
 *
 * The landing page and the catalogue are how a visitor reaches an organ model
 * at all. The legal documents are open because a person may need them on a
 * device that cannot start WebGL, and `#/trust` because saying which models are
 * reviewed — and which are not — is more honest with the locked ones listed
 * than with the page hidden.
 *
 * `lab` is not here: it is the experimental surface, and in the beta the
 * prototypes it used to hold are the public organ models. It stays reachable
 * to a developer through the unlock below.
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
