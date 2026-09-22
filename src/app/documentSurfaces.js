/**
 * Every route that is a document rather than a viewport, and how to put one on
 * screen — and, just as importantly, how to take it off again.
 *
 * ## Why this is a table rather than a chain of ifs in `main.js`
 *
 * It was the chain of ifs. Each branch set `data-route`, imported a surface,
 * created it and returned, and the whole thing ran exactly once per document
 * because the only way to reach another route was to load another document.
 * Nothing needed a teardown, so nothing had one, and `main.js` grew a copy of
 * the same five lines per route.
 *
 * Making a route change a swap rather than a reload turns the missing halves
 * into the important ones: a surface now has to say what it added to the page
 * and how to remove it, and the answer has to be the same shape for all of
 * them. That is what this file is.
 *
 * ## What "remove it" has to mean
 *
 * Surfaces append to `#ui`, and `#ui` is not theirs alone: the account modal
 * lives there for the life of the page, and so does anything else the shell
 * installs once. Clearing `#ui` between surfaces would take the sign-in dialog
 * with it — which is the kind of regression a swap is supposed to avoid, not
 * cause.
 *
 * So a mount records the nodes that appeared while it ran and removes exactly
 * those. That covers what a surface's own `destroy()` forgets — the landing
 * page's skip link is appended beside its `<main>` and is not removed by it —
 * without this file needing to know what any surface is made of.
 *
 * Observability is mounted per surface because a surface is a page view: it
 * records the visit, labels errors with where they happened and hangs the
 * feedback trigger somewhere the reader can reach. It is therefore torn down
 * per surface too, or every navigation would leave another feedback button
 * behind it.
 */
import { readUiLanguagePreference } from './sceneShellBridge.js';
import { isDocumentSurface } from './router.js';

/**
 * The `data-route` value each route kind renders as.
 *
 * Lab is the explorer with a different scope, not a different page, and the
 * stylesheets that make a document scroll are keyed on the value rather than
 * on the kind. Anything not listed here is not a document surface.
 */
const ROUTE_ELEMENT_STATE = Object.freeze({
  landing: 'landing',
  explorer: 'explorer',
  lab: 'explorer',
  trust: 'trust',
  legal: 'legal',
});

/** What telemetry calls each surface. */
const TELEMETRY_SURFACE = Object.freeze({
  landing: 'landing',
  explorer: 'explorer',
  lab: 'lab',
  trust: 'trust',
  legal: 'landing',
  locked: 'landing',
});

/** Re-exported so a caller with this module already open need not find it. */
export { isDocumentSurface };

/**
 * Put a document surface on screen.
 *
 * @param {object} options
 * @param {{kind: string, docId?: string, focusId?: string|null}} options.route
 * @param {HTMLElement} options.ui
 * @param {HTMLElement|null} [options.accountButton]
 * @param {boolean} [options.open] false when the release gate holds this route
 *   closed, which renders the locked surface instead of the route's own.
 * @param {(options: object) => Promise<any>} options.observe
 * @param {(error: Error, context: object) => void} [options.onRendererFailure]
 * @param {boolean} [options.applyState] whether to put this surface's
 *   `data-route` on `<html>` now. A swap says no and applies the returned
 *   `state` when it commits — see below.
 * @returns {Promise<{destroy: () => void, state: string}>}
 */
export async function mountDocumentSurface({
  route,
  ui,
  accountButton = null,
  open = true,
  observe,
  onRendererFailure = () => {},
  applyState = true,
}) {
  const locked = !open;
  const kind = locked ? 'locked' : route.kind;
  const state = locked ? 'locked' : ROUTE_ELEMENT_STATE[route.kind];
  if (!state) throw new Error(`not a document surface: ${route.kind}`);

  // Not while a swap is building.
  //
  // `data-route` decides the page's ground, and the surface being replaced is
  // still on screen for the length of the mount — a dynamic import plus the
  // build, measured between 100 and 600 ms. Setting it here painted the
  // *outgoing* surface on the *incoming* surface's ground for that whole time:
  // leaving the landing page for the publication record turned a dark page
  // pale underneath text written for a dark page, which is worse than the
  // blank frame the swap was built to remove.
  //
  // The initial mount has nothing to replace, so it applies immediately.
  if (applyState) document.documentElement.dataset.route = state;
  // Seed the persisted language before the surface builds, so its first paint
  // is already in the reader's language rather than in the default one. Each
  // surface's own toggle takes over from here.
  const language = readUiLanguagePreference();
  ui.dataset.lang = language;
  document.documentElement.setAttribute('lang', language);

  const before = new Set(ui.childNodes);
  let surface = null;
  let observability = null;

  const observabilityReady = observe({ ui, surface: TELEMETRY_SURFACE[kind] })
    .then((installed) => {
      observability = installed;
      return installed;
    });

  if (locked) {
    const { createLockedSurface } = await import('./LockedSurface.js');
    surface = createLockedSurface({ ui, route, accountButton });
  } else if (kind === 'landing') {
    const { createLanding } = await import('./Landing.js');
    surface = createLanding({
      ui,
      accountButton,
      onRendererFailure: async (error, context) => {
        const installed = await observabilityReady;
        onRendererFailure(error, { ...context, observability: installed });
      },
    });
  } else if (kind === 'trust') {
    const { createTrust } = await import('./Trust.js');
    surface = await createTrust({ ui, accountButton, focusId: route.focusId ?? null });
    void observabilityReady.then((installed) => installed?.telemetry.record('trust.open', {}));
  } else if (kind === 'legal') {
    const { createLegal } = await import('./Legal.js');
    surface = createLegal({ ui, docId: route.docId, accountButton });
  } else {
    const { createExplorer } = await import('./Explorer.js');
    surface = createExplorer({
      ui,
      accountButton,
      scope: kind === 'lab' ? 'lab' : 'public',
    });
  }

  // Waited for before the snapshot below, not because the surface needs it —
  // it does not — but because the feedback trigger it mounts is appended to
  // `#ui` asynchronously. A snapshot taken before that lands would not include
  // the trigger, and a swap that happened in the same window would leave one
  // behind on every navigation.
  await observabilityReady.catch((error) => {
    console.warn('[observability] not installed', error);
    return null;
  });

  // Everything that appeared while this surface built — including the nodes a
  // surface appends beside its own root and does not remove itself.
  const added = [...ui.childNodes].filter((node) => !before.has(node));

  return {
    surface,
    /**
     * The `data-route` value this surface renders as.
     *
     * Returned rather than only applied, because a swap does not apply it here
     * — it applies it at the moment it commits, so the ground and the page
     * change together. See `applyState` above.
     */
    state,
    destroy() {
      // The surface's own teardown first: it is the only thing that knows how
      // to dispose a WebGL hero or unsubscribe a keyboard shortcut.
      try {
        surface?.destroy?.();
        surface?.dispose?.();
      } catch (error) {
        console.warn('navigation: a surface did not tear itself down cleanly', error);
      }
      try {
        observability?.feedback?.dispose?.();
        observability?.dispose?.();
      } catch (error) {
        console.warn('navigation: observability did not tear down cleanly', error);
      }
      // Whatever is left of what this mount added. An element the surface
      // already removed is simply no longer in the document and `remove()` is
      // a no-op on it.
      for (const node of added) node.remove?.();
    },
  };
}
