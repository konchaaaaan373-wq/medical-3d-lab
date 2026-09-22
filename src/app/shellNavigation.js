import { installDeparture } from './departure.js';
import { isDocumentSurface } from './documentSurfaces.js';
import { destinationSubject, openingMessage } from './destinationName.js';
import { resolveRoute, sameRoute } from './router.js';
import { routeOpen } from './releaseGate.js';
import { recordSceneVisit } from './sceneLibrary.js';

/**
 * Moving between reading surfaces without replacing the document.
 *
 * ## What this is for
 *
 * The landing page, the model index, the publication record and the legal
 * documents are DOM. Reaching one of them used to cost a full document load —
 * the bundle re-parsed, the account layer re-initialised, `#ui` torn down to
 * nothing and the next surface assembled in front of the reader — because the
 * departure rule was written for the one route that genuinely needs it.
 *
 * Here the next surface is **built before the current one is taken down**, so
 * there is no moment with nothing on screen and therefore nothing to cover.
 * That is the whole difference: not a faster spinner, no spinner.
 *
 * ## The three things a swap has to do that a document load did for free
 *
 * A new document resets the viewport, moves focus to the top of the page and
 * tells a screen reader that a new page arrived. A swap does none of those
 * unless it is made to, and a route change that leaves the reader's focus on a
 * link that no longer exists is worse than the reload it replaced:
 *
 * 1. **Scroll.** Back to the top, because this is a different page. The one
 *    exception is a destination that names an element — a `#/trust?model=…`
 *    link points at one record among seventy, and landing at the top of the
 *    page would lose exactly the thing that was asked for. The surface itself
 *    handles that case, so the scroll reset here happens first and the
 *    surface's own focus wins.
 * 2. **Focus.** To the new surface's skip target, or its `<h1>`. Made
 *    programmatically focusable and then released again, so the outline
 *    appears for a keyboard user arriving deliberately and the element does
 *    not join the tab order afterwards.
 * 3. **Announcement.** A live region naming the page that arrived. Without it
 *    a screen-reader user gets silence, which is the accessibility failure
 *    that single-page navigation is best known for.
 *
 * ## And what it must not do
 *
 * It must not be the only way to reach a page. Every mount is awaited, and if
 * one fails — a chunk that will not load, a surface that throws while
 * building — `installDeparture` falls back to the document load it replaced.
 * A navigation architecture is allowed to be fast; it is not allowed to be a
 * new way for a link to do nothing.
 */

/** Read once per document: which language the announcement speaks. */
const announcementFor = (hash, language) =>
  destinationSubject(hash, language) ?? (language === 'en' ? 'Page loaded' : 'ページを表示しました');

/**
 * The live region that tells a screen reader a new page arrived.
 *
 * `role="status"` rather than `aria-live="assertive"`: a page change is worth
 * announcing and is not worth interrupting whatever is already being read.
 */
function createAnnouncer(doc) {
  const node = doc.createElement('p');
  node.className = 'visually-hidden';
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  doc.body.append(node);
  return {
    say(text) {
      // Cleared first: repeating the same string into a live region that
      // already holds it announces nothing at all.
      node.textContent = '';
      requestAnimationFrame(() => {
        node.textContent = text;
      });
    },
    destroy() {
      node.remove();
    },
  };
}

/**
 * Where a keyboard user should be standing after a swap.
 *
 * The skip target if the surface declared one, its first heading otherwise.
 * `tabindex="-1"` is added only for the duration of the focus call so the
 * heading does not become a permanent tab stop.
 */
function focusSurfaceStart(ui) {
  const target =
    ui.querySelector('[data-skip-target]') ??
    ui.querySelector('main h1, h1') ??
    ui.querySelector('main');
  if (!target) return;
  const hadTabIndex = target.hasAttribute('tabindex');
  if (!hadTabIndex) target.setAttribute('tabindex', '-1');
  try {
    target.focus({ preventScroll: true });
  } catch {
    /* focusing is a courtesy; never let it stop a navigation */
  }
  if (!hadTabIndex) {
    // Removed on the way out of the focus so the outline has already been
    // computed. Leaving it would put a heading in everybody's tab order.
    target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });
  }
}

/**
 * Mount the document surface this hash names, and keep mounting the next one
 * for as long as the reader stays among them.
 *
 * @param {object} options
 * @param {HTMLElement} options.ui
 * @param {{kind: string}} options.route the route this document opened on
 * @param {boolean} options.open whether the release gate opens that route
 * @param {HTMLElement|null} options.accountButton
 * @param {(options: object) => Promise<any>} options.observe
 * @param {Function} options.mountDocumentSurface
 * @param {'en'|'ja'} [options.language]
 * @param {(error: Error, context: object) => void} [options.onRendererFailure]
 * @param {Window} [options.windowRef]
 * @param {Document} [options.doc]
 */
export async function installShellNavigation({
  ui,
  route,
  open,
  accountButton,
  observe,
  mountDocumentSurface,
  language = 'ja',
  onRendererFailure = () => {},
  windowRef = globalThis.window,
  doc = globalThis.document,
}) {
  const announcer = createAnnouncer(doc);
  let current = await mountDocumentSurface({
    route,
    ui,
    accountButton,
    open,
    observe,
    onRendererFailure,
  });

  /**
   * Which route the reader currently wants, asked of the address bar.
   *
   * Not a counter. A swap is asynchronous — a chunk to fetch, a surface to
   * build — and three things can happen in the middle of one: the reader goes
   * Back to where they were, the reader picks a third destination, or both.
   * A token tracks the first of those and misses the others, and the failure
   * is the one this whole file exists to avoid: the page showing one route
   * while the address bar says another.
   *
   * Reproduced before it was fixed — `#/organs`, press "Publication & review",
   * press Back 20 ms later, and the document settled with the Trust page on
   * screen under `#/organs` with `data-route="trust"`. The address bar is the
   * only thing that knows the answer, so it is what gets asked.
   */
  const stillWanted = (hash) => sameRoute(windowRef.location.hash, hash);

  /**
   * One swap at a time.
   *
   * Two mounts building into `#ui` at once is not a race this can win by being
   * careful inside either of them: both append, both snapshot what they
   * appended, and whichever tears down second removes nodes the other is
   * using. They are queued instead, and a queued swap that is no longer wanted
   * by the time its turn comes does nothing at all.
   */
  let queue = Promise.resolve();

  /**
   * Saying "working on it" without taking the page away.
   *
   * A swap deliberately shows no veil — the old page stays up until the new one
   * is ready, which is the whole reason it feels instant. But "shows nothing"
   * and "acknowledges nothing" are different things, and measured first visits
   * to a surface took 420–1200 ms while its chunk arrived. A second of a press
   * doing visibly nothing is its own failure, and the reader's next move is to
   * press again.
   *
   * So: a marker on `<html>` that a stylesheet turns into a thin bar, and only
   * once the swap has already taken longer than a transition a reader would
   * read as instant. Under that threshold nothing appears at all, because a bar
   * that flashes for 60 ms is noise rather than information.
   */
  const NAVIGATION_FELT_MS = 160;
  let pendingIndicator = null;

  function showWorking() {
    if (pendingIndicator !== null) return;
    pendingIndicator = setTimeout(() => {
      pendingIndicator = null;
      doc.documentElement.dataset.navigating = '';
    }, NAVIGATION_FELT_MS);
  }

  function stopWorking() {
    if (pendingIndicator !== null) {
      clearTimeout(pendingIndicator);
      pendingIndicator = null;
    }
    delete doc.documentElement.dataset.navigating;
  }

  /**
   * Build the destination, then take the current surface down.
   *
   * The order is the point. Building first means a failure leaves the reader
   * on a working page rather than on an empty one, and it means the old
   * surface is still painted while the new one's chunk arrives — which is why
   * this needs no veil.
   *
   * @param {string} hash
   * @returns {Promise<boolean>} false when the caller should load a document
   */
  function swapTo(hash) {
    const run = queue.then(() => performSwap(hash), () => performSwap(hash));
    // The queue must not inherit a rejection, or every later swap short-circuits.
    queue = run.then(() => {}, () => {});
    return run;
  }

  async function performSwap(hash) {
    // Nobody wants this any more — a later navigation arrived while this one
    // was queued. `true` rather than `false`: the caller reads `false` as
    // "load a document instead", and loading a document for an abandoned
    // destination would take the reader somewhere they have already left.
    if (!stillWanted(hash)) {
      stopWorking();
      return true;
    }

    const next = resolveRoute(hash);
    const nextOpen = routeOpen(next);
    const asLocked = nextOpen ? next : { kind: 'locked' };
    if (!isDocumentSurface(asLocked)) return false;

    const previous = current;
    showWorking();
    let mounted;
    try {
      mounted = await mountDocumentSurface({
        route: next,
        ui,
        accountButton,
        open: nextOpen,
        observe,
        onRendererFailure,
      });
    } catch (error) {
      console.error('navigation: the destination did not build', error);
      stopWorking();
      return false;
    }

    // Asked again, because building took time. Discard rather than commit: the
    // surface is in the document but nothing else has moved, so removing it
    // and putting `data-route` back leaves exactly what was there before.
    if (!stillWanted(hash)) {
      try {
        mounted.destroy();
      } catch (error) {
        console.warn('navigation: an abandoned surface did not tear down cleanly', error);
      }
      if (previous?.state) doc.documentElement.dataset.route = previous.state;
      stopWorking();
      return true;
    }

    current = mounted;
    stopWorking();
    try {
      previous?.destroy();
    } catch (error) {
      // The new surface is already up. A messy teardown is a leak, not a
      // broken navigation, and reloading now would undo a swap that worked.
      console.warn('navigation: the previous surface did not tear down cleanly', error);
    }

    // The scene library records where a reader has been. A swap never reaches
    // a scene, but keeping the call here means the one place that answers
    // "was this a page view" stays the one place.
    if (next.kind === 'scene') recordSceneVisit(next.sceneId);

    windowRef.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
    focusSurfaceStart(ui);
    announcer.say(announcementFor(hash, ui.dataset.lang === 'en' ? 'en' : 'ja'));
    return true;
  }

  const departure = installDeparture({
    windowRef,
    doc,
    shownHash: windowRef.location.hash,
    language,
    describe: (hash) => openingMessage(hash, ui.dataset.lang === 'en' ? 'en' : 'ja'),
    onSwap: swapTo,
  });

  return {
    departure,
    currentSurface: () => current,
    destroy() {
      stopWorking();
      departure.destroy();
      announcer.destroy();
      current?.destroy();
    },
  };
}
