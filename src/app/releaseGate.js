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
 * - A build made with `VITE_ALLOW_PREVIEW=1` accepts `?preview=1`, remembers it
 *   for that browser, and forgets it again on `?preview=0` — so an internal
 *   reviewer follows one link to a preview deploy and then navigates normally.
 *
 * The parameter is stripped from the address bar afterwards: a reviewer who
 * copies the URL out of it should be sharing the model, not their unlock.
 *
 * ## And closing production
 *
 * A production build has no unlock at all. `?preview=1`, `?preview=yes`, a
 * remembered `m3l.beta-preview`: none of them opens anything, because the
 * capability is decided when the bundle is built and is simply absent from it.
 *
 * The two things this deliberately does not do:
 *
 * - **Sniff the hostname.** "Is this localhost" is a string comparison against
 *   something the visitor controls in more ways than is comfortable, and it
 *   makes every preview host a configuration nobody wrote down.
 * - **Leave a stored unlock alone.** Preview and production deployments can
 *   share an origin, and `localStorage` outlives a deploy. A production build
 *   that finds a remembered unlock clears it, so the answer cannot be carried
 *   across from a build that allowed it.
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

/**
 * Whether this bundle was built to allow the preview unlock at all.
 *
 * `VITE_ALLOW_PREVIEW=1 npm run build` produces a reviewable build; a plain
 * `npm run build` does not, and no URL can change that after the fact. Vite
 * inlines the value, so the production bundle contains the literal `false` and
 * the branch below is dead code in it.
 */
const previewBuild = () => {
  try {
    return String(import.meta.env?.VITE_ALLOW_PREVIEW ?? '') === '1';
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
    previewBuild: previewBuild(),
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
