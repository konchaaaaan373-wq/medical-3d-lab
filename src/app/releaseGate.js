/**
 * The browser half of the beta release gate.
 *
 * `src/catalog/release.js` holds the rule; this holds the one place that reads
 * `window`, so the rule stays testable and the answer stays the same on every
 * surface within a page load.
 *
 * ## Keeping development open
 *
 * - `npm run dev` is unlocked outright. Nobody should have to opt in to see
 *   the scene they are working on.
 * - On a built site, `?preview=1` unlocks and is remembered for that browser,
 *   so an internal reviewer follows one link and then navigates normally.
 *   `?preview=0` forgets it again.
 *
 * The parameter is stripped from the address bar afterwards: a reviewer who
 * copies the URL out of it should be sharing the model, not their unlock.
 */
import {
  DEV_UNLOCK_PARAM,
  DEV_UNLOCK_STORAGE_KEY,
  isRouteReleased,
  isSceneReleased,
  resolveDevUnlock,
} from '../catalog/release.js';

/** Vite replaces this at build time; under `node --test` there is no env. */
const devBuild = () => {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
};

/** Storage can be denied outright (private mode, blocked cookies). Never throw. */
const readStored = () => {
  try {
    return window.localStorage?.getItem(DEV_UNLOCK_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
};

const writeStored = (persist) => {
  if (persist == null) return;
  try {
    if (persist) window.localStorage?.setItem(DEV_UNLOCK_STORAGE_KEY, 'on');
    else window.localStorage?.removeItem(DEV_UNLOCK_STORAGE_KEY);
  } catch {
    /* an unlock that cannot be remembered still holds for this page */
  }
};

/** Take `?preview=` back out of the address bar without touching the route. */
const stripParam = () => {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(DEV_UNLOCK_PARAM)) return;
    url.searchParams.delete(DEV_UNLOCK_PARAM);
    window.history?.replaceState?.(window.history.state, '', url.toString());
  } catch {
    /* cosmetic only */
  }
};

let resolved = null;

/**
 * Whether this visitor sees the locked work. Decided once per page load.
 */
export function betaUnlocked() {
  if (resolved != null) return resolved;
  const { unlocked, persist } = resolveDevUnlock({
    search: window.location?.search ?? '',
    stored: readStored(),
    devBuild: devBuild(),
  });
  writeStored(persist);
  if (persist != null) stripParam();
  resolved = unlocked;
  return resolved;
}

/** Whether this route opens for this visitor. */
export const routeOpen = (route) => betaUnlocked() || isRouteReleased(route);

/** Whether this scene opens for this visitor. */
export const sceneOpen = (scene) => betaUnlocked() || isSceneReleased(scene);
