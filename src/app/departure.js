import { isInPageAnchor, sameRoute } from './router.js';

/**
 * What "leaving this document" means, in one place.
 *
 * Changing the hash to another route reloads the page. The reload is right: a
 * scene owns a renderer, a GPU context and an animation loop, and a new
 * document is the one certain way not to carry them into the next page.
 *
 * What the reload does not do is **clear the screen**. The browser keeps
 * painting the old document until the next one commits, so for the length of
 * that wait — a bundle to re-parse, and for a scene a multi-megabyte atlas —
 * the previous model stays on screen underneath the new URL. That is not
 * slowness, it is a wrong answer: following a link to `#/copd` from the brain
 * viewer leaves the brain on screen with `#/copd` in the address bar, which
 * reads as "that link opened the brain". It was reported exactly that way.
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
 * `shownHash` is fixed at install and never reassigned. It is not "the last
 * hash seen" — it is the route this document actually rendered, and that
 * cannot change without a new document. Tracking the latest hash instead is
 * what makes a second departure look like a no-op.
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
 * Seven copies of a rule is seven places to add it and six to forget, and this
 * is the second change in a row to walk all of them.
 */

/** How long to wait for a reload before offering to ask again. */
export const DEPARTURE_BACKSTOP_MS = 12_000;

const COPY = {
  leaving: { en: 'Opening', ja: '移動しています' },
  stalled: { en: 'This is taking longer than expected.', ja: '読み込みに時間がかかっています。' },
  retry: { en: 'Try again', ja: 'もう一度読み込む' },
};

/**
 * What a hash change means for this document. The whole policy, in one place.
 *
 * Three answers, not two. Modelling it as "is this a departure?" reads an
 * in-page anchor as "not a departure" and therefore as "we are back on the
 * route we are showing", which takes the veil down over a page that is still
 * leaving. Worse, `resolveRoute` sends a bare `#top` to the *default scene*, so
 * on the explorer or the terms page a skip link is not even the same route —
 * a boolean gets that one wrong in the other direction, and reloads the page
 * out from under somebody who pressed Tab and Enter.
 *
 * - `ignore` — an in-page anchor. Not navigation; change nothing at all.
 * - `stay`   — this document is showing that route. Uncover it.
 * - `leave`  — somewhere else. Cover this one and ask for the next.
 *
 * @param {string} next the hash now
 * @param {string} shown the hash this document rendered
 * @returns {'ignore'|'stay'|'leave'}
 */
export function hashChangeAction(next, shown) {
  if (isInPageAnchor(next)) return 'ignore';
  return sameRoute(next, shown) ? 'stay' : 'leave';
}

/**
 * Cover this document while it is being replaced, and uncover it if it is not.
 *
 * @param {object} options
 * @param {Window} [options.windowRef]
 * @param {Document} [options.doc]
 * @param {string} options.shownHash   the route this document rendered
 * @param {'en'|'ja'} [options.language]
 * @param {() => void} [options.reload]
 * @param {number} [options.backstopMs]
 * @param {(fn:() => void, ms:number) => any} [options.setTimer]
 * @param {(id:any) => void} [options.clearTimer]
 * @returns {{destroy:() => void, isLeaving:() => boolean}}
 */
export function installDeparture({
  windowRef = globalThis.window,
  doc = globalThis.document,
  shownHash,
  language = 'ja',
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

  function disarm() {
    if (backstop === null) return;
    clearTimer(backstop);
    backstop = null;
  }

  function takeDown() {
    disarm();
    // Held rather than re-queried: a timer that fires later must remove the
    // element it was armed for, and `querySelector` at fire time can return an
    // element belonging to the next page's own loading state.
    veil?.remove?.();
    veil = null;
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
      veil.replaceChildren(...building());
      backstop = setTimer(stall, backstopMs);
      reload();
    });
    veil.replaceChildren(message, again);
  }

  function building() {
    const label = doc.createElement('span');
    label.textContent = say('leaving');
    const bar = doc.createElement('span');
    bar.className = 'loading-bar';
    return [label, bar];
  }

  function raise() {
    if (veil) return;
    veil = doc.createElement('div');
    veil.className = 'loading';
    // The marker the stylesheet uses to put this above every other layer, and
    // the one a test can find without knowing how the veil is built.
    veil.dataset.leaving = '';
    veil.setAttribute('lang', language);
    veil.setAttribute('role', 'status');
    veil.replaceChildren(...building());
    doc.body?.append?.(veil);
  }

  function onHashChange() {
    const action = hashChangeAction(windowRef.location.hash, shownHash);
    if (action === 'ignore') return;

    if (action === 'stay') {
      // Back to the route this document is showing. Whether or not a reload was
      // asked for, what is underneath is now the right answer.
      takeDown();
      return;
    }

    // Raise before asking, and in this same task: the veil has to be in the
    // document before the browser gets a chance to paint anything after the
    // hash changed.
    raise();
    disarm();
    backstop = setTimer(stall, backstopMs);
    // Asked again on every departure rather than once. A second hash change
    // while the first reload is still in flight names a different destination,
    // and the reload that eventually lands has to be the one for the hash the
    // reader last chose.
    reload();
  }

  function onPageShow(event) {
    // A restored page arrives with the veil still in its DOM.
    if (event?.persisted) takeDown();
  }

  windowRef.addEventListener('hashchange', onHashChange);
  windowRef.addEventListener('pageshow', onPageShow);

  return {
    isLeaving: () => veil !== null,
    destroy() {
      windowRef.removeEventListener('hashchange', onHashChange);
      windowRef.removeEventListener('pageshow', onPageShow);
      takeDown();
    },
  };
}
