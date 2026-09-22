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
  let trustOpened = false;
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

  /**
   * Started *after* the surface is built, and that ordering is load-bearing.
   *
   * Observability appends a floating feedback button straight to `#ui`. The
   * surface appends its skip link. Both arrive behind a dynamic import, so
   * starting this one first made the two a race — and whichever module
   * resolved first went into the DOM first.
   *
   * When observability won, the first Tab stop on the page was the feedback
   * button rather than "skip to content". Measured at roughly one load in six
   * on the model index, whose module is the largest and so loses most often;
   * `verify:ui` reported it four full runs running, on a different surface and
   * viewport each time, which is exactly what a race looks like from the
   * outside and exactly why it was nearly dismissed as a flaky check.
   *
   * `main.js` had this right before the mount table existed: it awaited the
   * surface, then called `observe()`. The order is restored here.
   */
  const startObservability = () =>
    observe({ ui, surface: TELEMETRY_SURFACE[kind] }).then((installed) => {
      observability = installed;
      return installed;
    });
  /** @type {Promise<any>|null} resolved once the surface is on the page. */
  let observabilityReady = null;
  /** The landing hero reports renderer failures before observability exists. */
  const whenObservable = () => observabilityReady ?? Promise.resolve(null);

  if (locked) {
    const { createLockedSurface } = await import('./LockedSurface.js');
    surface = createLockedSurface({ ui, route, accountButton });
  } else if (kind === 'landing') {
    const { createLanding } = await import('./Landing.js');
    surface = createLanding({
      ui,
      accountButton,
      onRendererFailure: async (error, context) => {
        const installed = await whenObservable();
        onRendererFailure(error, { ...context, observability: installed });
      },
    });
  } else if (kind === 'trust') {
    const { createTrust } = await import('./Trust.js');
    surface = await createTrust({ ui, accountButton, focusId: route.focusId ?? null });
    trustOpened = true;
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

  // Everything that appeared while this surface built — including the nodes a
  // surface appends beside its own root and does not remove itself, such as
  // the landing page's skip link.
  const added = [...ui.childNodes].filter((node) => !before.has(node));

  // Started now that the surface and its skip link are in the document, and
  // deliberately *not* awaited.
  //
  // It was awaited, so that the snapshot above would include the feedback
  // trigger it appends. That cost a dynamic import inside the swap's critical
  // path — and the swap does not commit until the mount returns, so for the
  // length of it both the outgoing and the incoming surface were in the
  // document at once. Measured at 300 ms of two stacked `<main>` elements.
  //
  // The snapshot does not need to cover the trigger: `feedback.dispose()`
  // removes the trigger and the overlay itself, and `destroy()` below calls it
  // whether or not this has resolved by then.
  observabilityReady = startObservability();
  void observabilityReady
    .then((installed) => {
      if (trustOpened) installed?.telemetry?.record('trust.open', {});
    })
    .catch((error) => console.warn('[observability] not installed', error));

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
      // Off the page first, disposed second — and that order is the whole
      // point.
      //
      // A surface's own `destroy()` ends by removing its element, but it does
      // the expensive work first: the model index disposes a WebGL hero, which
      // under a software rasteriser is most of a second of synchronous work.
      // With the DOM removal behind it, the outgoing page stayed on screen for
      // the whole teardown *underneath the incoming one* — measured at 870 ms
      // with two `<main>` elements in the document and the page height going
      // 1061 → 2495 → 1434 px, so the reader watched the new page appear below
      // the old one and then the scrollbar jump.
      //
      // Detaching is instant and is all the reader's eye cares about. Whatever
      // the surface then does to release a renderer happens to a subtree that
      // is no longer painted, and `remove()` on an already-detached node is a
      // no-op, so the surface's own teardown is unaffected.
      for (const node of added) node.remove?.();
      try {
        surface?.destroy?.();
        surface?.dispose?.();
      } catch (error) {
        console.warn('navigation: a surface did not tear itself down cleanly', error);
      }
      // It may not have finished installing. Disposing what does not exist yet
      // is the leak this has to avoid, so an unresolved install is disposed
      // when it lands rather than ignored.
      const release = (installed) => {
        try {
          installed?.feedback?.dispose?.();
          installed?.dispose?.();
        } catch (error) {
          console.warn('navigation: observability did not tear down cleanly', error);
        }
      };
      if (observability) release(observability);
      else void observabilityReady?.then(release, () => {});
    },
  };
}
