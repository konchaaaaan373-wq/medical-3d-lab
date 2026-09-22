import { isInPageAnchor, resolveRoute, sameRoute } from './router.js';

/**
 * What "leaving this document" means, in one place.
 *
 * ## Not every route change is a departure
 *
 * It used to be. Every hash change to a different route reloaded the page, and
 * the justification was real but too wide: *a scene* owns a renderer, a GPU
 * context and an animation loop, and a new document is the one certain way not
 * to carry them into the next page. The landing page, the model index, the
 * publication record and the legal documents own none of those things. They
 * were paying a scene's price anyway.
 *
 * Measured on the built site, that price was the product's worst moment.
 * Opening the publication record from a model and coming back cost two full
 * document loads; every transition tore `#ui` down to nothing, painted the
 * next surface's background over the blank, and assembled the page in front of
 * the reader. Between two reading surfaces there was nothing to protect.
 *
 * So the rule is now per transition rather than per hash change:
 *
 * - **Either side is a scene** → a new document, as before, veiled.
 * - **Neither side is a scene** → swap the surface inside this document. The
 *   shell, the account state and the scroll restoration survive, and there is
 *   no blank frame to cover because nothing is ever torn down without its
 *   replacement already built.
 *
 * `onSwap` is supplied by the shell, which owns the mount table. If it is not
 * supplied, or it reports that it could not mount the destination, this falls
 * back to the reload — **a swap that fails must still get the reader to the
 * page they asked for**, and a document load is the one way that cannot itself
 * fail halfway.
 *
 * ## The way out is designed before the way in
 *
 * A veil that cannot be taken down is worse than the bug it covers, so the
 * takedown paths come first and the raise is the easy half:
 *
 * - **Back, same document.** The reader leaves and immediately returns before
 *   the reload commits. No `pageshow` fires — the document never went away —
 *   and the only signal is another `hashchange`. So the rule is not "a latch,
 *   released on navigation" but *any* hash change that lands back on the route
 *   this document is showing takes the veil down.
 * - **Back, across documents.** The reload committed and the reader came back
 *   to a restored page. `pageshow` with `persisted` set, which arrives with
 *   the veil still in the restored DOM.
 * - **The reload never lands.** A backstop turns the veil into a retry rather
 *   than removing it: revealing a model that does not match the URL is the
 *   original bug, and doing it automatically after a wait is not a recovery.
 *   The reader can ask again, which is a choice rather than a reversal.
 *
 * ## What `shownHash` means now
 *
 * It was fixed at install and never reassigned, because "the route this
 * document rendered" could not change without a new document. With swapping it
 * can, so it is tracked — but only on a swap that **completed**. A pending
 * reload must never advance it: the document is still showing the old route
 * until the new one commits, and pretending otherwise is exactly the bug that
 * left a brain on screen under a `#/copd` URL.
 *
 * ## One rule, every shell
 *
 * Seven handlers answered "is this a navigation" five different ways — reload
 * on anything; on a different `kind`; on `kind !== route.kind || kind ===
 * 'scene'`; on `!sameRoute`. Checked against every transition a reader can
 * actually make, they agree: the weakest of them, the explorer's, reads two
 * legal documents as one route, but you cannot reach one legal document from
 * another without leaving the explorer first, so nothing was broken by it.
 *
 * They are unified because the veil needs one home, not because they disagreed.
 * Seven copies of a rule is seven places to add it and six to forget.
 */

/** How long to wait for a reload before offering to ask again. */
export const DEPARTURE_BACKSTOP_MS = 12_000;

const COPY = {
  leaving: { en: 'Opening', ja: '移動しています' },
  stalled: { en: 'This is taking longer than expected.', ja: '読み込みに時間がかかっています。' },
  retry: { en: 'Try again', ja: 'もう一度読み込む' },
};

/**
 * Whether a route has to have a document to itself.
 *
 * One answer, asked of both sides of a transition. A scene owns a WebGL
 * context, an animation loop, a multi-megabyte atlas and — through `App.js` —
 * a large amount of imperative set-up with no teardown. Until that has a
 * teardown worth trusting, arriving at or leaving a scene gets a new document,
 * which disposes all of it by construction.
 *
 * Everything else is DOM that its own surface already knows how to remove.
 *
 * @param {{kind: string}} route
 */
export const routeNeedsDocument = (route) => route?.kind === 'scene';

/**
 * The same question, asked of a route the release gate may have closed.
 *
 * A scene route that the beta has not opened does not render a scene: it
 * renders the "in development" page, which is plain DOM with no renderer in
 * it. Treating it as a scene anyway made the two ways off that page — "see the
 * published models" and "home" — each cost a document load for a context that
 * was never built. It is the page 67 of the 71 models show, so it is the most
 * reloaded surface in the product for the least reason.
 *
 * Injected rather than imported, because `hashChangeAction` is pure and
 * `routeOpen` reads `window`. The caller that has a browser supplies this one;
 * the caller that does not gets the conservative default, which is never wrong
 * — only slower.
 *
 * @param {(route: {kind?: string}) => boolean} isOpen
 */
export const needsDocumentUnlessClosed = (isOpen) => (route) =>
  routeNeedsDocument(route) && isOpen(route);

/**
 * What a hash change means for this document. The whole policy, in one place.
 *
 * Four answers, not two. Modelling it as "is this a departure?" reads an
 * in-page anchor as "not a departure" and therefore as "we are back on the
 * route we are showing", which takes the veil down over a page that is still
 * leaving. Worse, `resolveRoute` sends a bare `#top` to the *default scene*, so
 * on the explorer or the terms page a skip link is not even the same route —
 * a boolean gets that one wrong in the other direction, and reloads the page
 * out from under somebody who pressed Tab and Enter.
 *
 * - `ignore` — an in-page anchor. Not navigation; change nothing at all.
 * - `stay`   — this document is showing that route. Uncover it.
 * - `swap`   — somewhere else, but somewhere this document can render. Replace
 *              the surface in place and keep everything around it.
 * - `leave`  — somewhere else that needs its own document. Cover this one and
 *              ask for the next.
 *
 * @param {string} next the hash now
 * @param {string} shown the hash this document is rendering
 * @param {{canSwap?: boolean, needsDocument?: (route: object) => boolean}} [options]
 *   `canSwap` is false when the shell has no mount table to swap with, which
 *   makes every departure a reload again. `needsDocument` lets a caller that
 *   can ask the release gate say that a *closed* scene route is plain DOM.
 * @returns {'ignore'|'stay'|'swap'|'leave'}
 */
export function hashChangeAction(
  next,
  shown,
  { canSwap = false, needsDocument = routeNeedsDocument } = {}
) {
  if (isInPageAnchor(next)) return 'ignore';
  if (sameRoute(next, shown)) return 'stay';
  if (!canSwap) return 'leave';
  // Both sides, not just the destination: leaving a scene has to dispose one
  // as surely as arriving at one has to build one.
  if (needsDocument(resolveRoute(next))) return 'leave';
  if (needsDocument(resolveRoute(shown))) return 'leave';
  return 'swap';
}

/**
 * Cover this document while it is being replaced, and uncover it if it is not.
 *
 * @param {object} options
 * @param {Window} [options.windowRef]
 * @param {Document} [options.doc]
 * @param {string} options.shownHash   the route this document rendered
 * @param {'en'|'ja'} [options.language]
 * @param {(hash: string) => (string|null)} [options.describe] what the veil
 *   should say is opening, given the destination hash. Returning null keeps
 *   the generic wording.
 * @param {(route: object) => boolean} [options.needsDocument] see
 *   `hashChangeAction`; the shell supplies one that knows about the release gate.
 * @param {((hash: string) => Promise<boolean>)|null} [options.onSwap] mount the
 *   destination inside this document. Resolving false (or throwing) falls back
 *   to a reload.
 * @param {(() => (() => void)|void)|null} [options.onDepart] called once the
 *   veil is up and this document is definitely being replaced, to release
 *   whatever the outgoing page is still spending. Returning a function makes
 *   it undoable, for the case where the reload never happens.
 * @param {() => void} [options.reload]
 * @param {number} [options.backstopMs]
 * @param {(fn:() => void, ms:number) => any} [options.setTimer]
 * @param {(id:any) => void} [options.clearTimer]
 * @returns {{destroy:() => void, isLeaving:() => boolean, shownHash:() => string}}
 */
export function installDeparture({
  windowRef = globalThis.window,
  doc = globalThis.document,
  shownHash,
  language = 'ja',
  describe = () => null,
  onSwap = null,
  onDepart = null,
  needsDocument = routeNeedsDocument,
  reload = () => windowRef.location.reload(),
  backstopMs = DEPARTURE_BACKSTOP_MS,
  setTimer = (fn, ms) => setTimeout(fn, ms),
  clearTimer = (id) => clearTimeout(id),
}) {
  const say = (key) => COPY[key][language === 'en' ? 'en' : 'ja'];

  /** @type {any} the element covering the page, while one exists */
  let veil = null;
  /** @type {any} */
  let backstop = null;
  /** The route this document is actually rendering. Advanced only by a swap. */
  let shown = shownHash;
  /** How to undo `onDepart`, while a departure is in flight. */
  let undoDepart = null;
  /**
   * What the veil currently says is opening, if anything.
   *
   * Held rather than recomputed: the retry rebuilds the veil's contents, and a
   * rebuild that dropped the destination made the wait go from "opening the
   * heart model" to "移動しています" at the exact moment the reader had just
   * been told something had gone wrong. `verify:departure` reads the retry's
   * wording, which is how this was found.
   */
  let destinationLabel = null;
  /**
   * Which swap is the current one. A reader who clicks twice while the first
   * destination is still importing must end on the second, so a resolved
   * mount that is no longer the latest request discards itself.
   */
  let swapToken = 0;

  function disarm() {
    if (backstop === null) return;
    clearTimer(backstop);
    backstop = null;
  }

  function takeDown() {
    disarm();
    // The reload is not happening after all — Back landed on this document
    // again, or a restored page arrived. Whatever the departure released has
    // to come back, or the reader is left looking at a scene that has stopped
    // animating and cannot be made to start.
    try {
      undoDepart?.();
    } catch (error) {
      console.warn('navigation: a departure could not be undone', error);
    }
    undoDepart = null;
    // Held rather than re-queried: a timer that fires later must remove the
    // element it was armed for, and `querySelector` at fire time can return an
    // element belonging to the next page's own loading state.
    veil?.remove?.();
    veil = null;
    destinationLabel = null;
  }

  function stall() {
    backstop = null;
    if (!veil) return;
    // The veil stays. What changes is that it stops claiming to be working and
    // starts offering to try again.
    const message = doc.createElement('span');
    message.textContent = say('stalled');
    const again = doc.createElement('button');
    again.type = 'button';
    again.className = 'loading-retry';
    again.textContent = say('retry');
    again.addEventListener('click', () => {
      veil.replaceChildren(...building(destinationLabel));
      backstop = setTimer(stall, backstopMs);
      reload();
    });
    veil.replaceChildren(message, again);
  }

  function building(destination = null) {
    const label = doc.createElement('span');
    // Naming the destination is the difference between "something is
    // happening" and "the heart is opening". The wait is the same length; only
    // one of them tells the reader whether they pressed the right thing.
    label.textContent = destination ?? say('leaving');
    const bar = doc.createElement('span');
    bar.className = 'loading-bar';
    return [label, bar];
  }

  function raise(destination = null) {
    destinationLabel = destination;
    if (veil) return;
    veil = doc.createElement('div');
    veil.className = 'loading';
    // The marker the stylesheet uses to put this above every other layer, and
    // the one a test can find without knowing how the veil is built.
    veil.dataset.leaving = '';
    veil.setAttribute('lang', language);
    veil.setAttribute('role', 'status');
    veil.replaceChildren(...building(destination));
    doc.body?.append?.(veil);
  }

  function leave(hash) {
    // Raise before asking, and in this same task: the veil has to be in the
    // document before the browser gets a chance to paint anything after the
    // hash changed.
    let destination = null;
    try {
      destination = describe(hash);
    } catch {
      /* a description is a courtesy; never let it stop the navigation */
    }
    raise(destination);
    // Only once the veil is up: this releases work the outgoing page is doing,
    // and doing it before the page is covered would show the reader the
    // release. Measured on the built site, stopping the outgoing scene's
    // animation loop here takes 15–20% off every model-to-model switch
    // (5977→4760, 4353→3539, 3527→3010 ms) — the incoming document is
    // building a second WebGL context and a second atlas, and the one it is
    // replacing was still rendering frames nobody can see.
    try {
      undoDepart = onDepart?.() ?? null;
    } catch (error) {
      console.warn('navigation: the outgoing page could not be released', error);
      undoDepart = null;
    }
    disarm();
    backstop = setTimer(stall, backstopMs);
    // Asked again on every departure rather than once. A second hash change
    // while the first reload is still in flight names a different destination,
    // and the reload that eventually lands has to be the one for the hash the
    // reader last chose.
    reload();
  }

  function onHashChange() {
    const hash = windowRef.location.hash;
    const action = hashChangeAction(hash, shown, { canSwap: Boolean(onSwap), needsDocument });
    if (action === 'ignore') return;

    if (action === 'stay') {
      // Back to the route this document is showing. Whether or not a reload was
      // asked for, what is underneath is now the right answer. A swap still in
      // flight is abandoned for the same reason.
      swapToken += 1;
      takeDown();
      return;
    }

    if (action === 'leave') {
      leave(hash);
      return;
    }

    const token = (swapToken += 1);
    // No veil. The point of a swap is that the reader keeps looking at a page
    // until the next one is ready to replace it.
    Promise.resolve()
      .then(() => onSwap(hash))
      .then((mounted) => {
        if (token !== swapToken) return;
        if (mounted) {
          shown = hash;
          takeDown();
        } else {
          leave(hash);
        }
      })
      .catch((error) => {
        console.error('navigation: the destination could not be mounted in place', error);
        if (token === swapToken) leave(hash);
      });
  }

  function onPageShow(event) {
    // A restored page arrives with the veil still in its DOM.
    if (event?.persisted) takeDown();
  }

  windowRef.addEventListener('hashchange', onHashChange);
  windowRef.addEventListener('pageshow', onPageShow);

  return {
    isLeaving: () => veil !== null,
    shownHash: () => shown,
    destroy() {
      windowRef.removeEventListener('hashchange', onHashChange);
      windowRef.removeEventListener('pageshow', onPageShow);
      takeDown();
    },
  };
}
