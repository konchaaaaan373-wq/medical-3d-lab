const INTERACTIVE_TAGS = new Set(['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'OPTION', 'SUMMARY']);
const INTERACTIVE_ROLES = new Set([
  'button', 'link', 'tab', 'tree', 'treeitem', 'textbox', 'searchbox', 'combobox',
  'checkbox', 'radio', 'switch', 'slider', 'spinbutton', 'menu', 'menuitem',
  'listbox', 'option', 'dialog',
]);
const LANGUAGE_STORAGE_KEY = 'medical-3d-lab:lang';

/** Read the same persisted language contract as LanguageToggle before App mounts. */
export function readUiLanguagePreference(storageRef = globalThis.localStorage) {
  try {
    return storageRef?.getItem?.(LANGUAGE_STORAGE_KEY) === 'en' ? 'en' : 'ja';
  } catch {
    return 'ja';
  }
}

/** How long a departure may last before the veil is assumed to be wrong. */
export const DEPARTURE_BACKSTOP_MS = 30_000;

/** Whether a departure is already under way in this document. */
export const isLeaving = (doc = globalThis.document) =>
  Boolean(doc?.querySelector?.('.loading[data-leaving]'));

/**
 * Leave the current page by reloading, without lying about where you are.
 *
 * Changing the hash away from a surface that renders a model reloads: that
 * surface owns a renderer, a GPU context and an animation loop, and a fresh
 * document is the one way to be sure none of it survives into the next one.
 * What the reload does *not* do is clear the screen. A browser keeps painting
 * the outgoing document until the incoming one commits, so for the whole of
 * that wait — a fresh bundle parse, and for a scene an atlas measured in
 * megabytes — the previous model is still there, under the new URL.
 *
 * That is not a cosmetic delay, it is a wrong answer. Following a link from the
 * brain to `#/copd` leaves the brain on screen with `#/copd` in the address
 * bar, which reads as "that link opened the brain" rather than as "this is
 * still loading". It was reported as exactly that.
 *
 * So the outgoing document is covered first, in the same task as the event, and
 * the reload is asked for after.
 *
 * ## Why there is no state here beyond the veil itself
 *
 * Two earlier versions of this carried a latch and an event subscription, and
 * between them produced seven defects — every one of them a way for the latch
 * and reality to disagree. There is no flag now: the veil in the document *is*
 * the state, `isLeaving()` reads it, and every call re-asks for the reload.
 * `reload()` loads whatever the address bar says at the moment it is called, so
 * the newest destination is always the one that commits.
 *
 * Stranding is handled by a backstop rather than by enumerating events. A
 * reload can fail to commit with no event at all — the reader presses Stop, or
 * goes Back, which in a hash router is a same-document traversal and fires no
 * `pageshow`. The previous version subscribed only to a persisted `pageshow`
 * and therefore covered the one case it had not been asked about. So: if this
 * document is still running after `DEPARTURE_BACKSTOP_MS`, the reload is not
 * coming and the veil comes down.
 *
 * The backstop is deliberately long, and its failure mode is the reason. If it
 * fires during a genuinely slow load the reader sees the old page again —
 * which is exactly the behaviour that existed before this function, never
 * worse. A short timeout would trade a rare stranding for a common one.
 *
 * @param {{doc?: Document, windowRef?: Window, reload?: () => void,
 *   language?: 'en'|'ja', backstopMs?: number,
 *   setTimer?: (fn: () => void, ms: number) => any}} [options]
 * @returns {boolean} whether this call is the one that raised the veil
 */
export function leaveForReload({
  doc = globalThis.document,
  windowRef = globalThis.window,
  reload = () => windowRef?.location?.reload(),
  language = readUiLanguagePreference(),
  backstopMs = DEPARTURE_BACKSTOP_MS,
  setTimer = (fn, ms) => globalThis.setTimeout?.(fn, ms),
} = {}) {
  if (!doc?.body) {
    reload();
    return true;
  }

  // Already leaving: do not stack a second veil, but do ask again. Swallowing
  // the later call is how the *first* destination used to win while the
  // address bar showed the last one.
  if (isLeaving(doc)) {
    reload();
    // Re-arm. The backstop belongs to the departure, not to the first call
    // that started it: without this the veil could come down 30s after the
    // *first* navigation while a newer reload was still in flight, putting the
    // old model back under the newest URL.
    setTimer(() => doc.querySelector?.('.loading[data-leaving]')?.remove?.(), backstopMs);
    return false;
  }

  const veil = doc.createElement('div');
  veil.className = 'loading';
  // The marker is also the styling hook: `base.css` lifts `[data-leaving]`
  // above every overlay in the product, which plain `.loading` is not.
  veil.setAttribute('data-leaving', '');
  veil.setAttribute('lang', language);
  // `role="status"` rather than an alert: a reader who followed a link is not
  // being warned, they are being told the page heard them.
  veil.setAttribute('role', 'status');
  // Appended empty, then filled. A live region announces *changes*, so one
  // inserted with its text already in place is silent in most screen readers —
  // which made the `role` above decorative rather than useful.
  doc.body.append(veil);
  veil.innerHTML = [
    `<span>${language === 'en' ? 'Opening' : '移動しています'}</span>`,
    '<span class="loading-bar"></span>',
  ].join('');

  const takeDown = () => {
    veil.remove?.();
    windowRef?.removeEventListener?.('pageshow', onRestore);
  };
  // A persisted `pageshow` is the back/forward cache handing this document
  // back: the reload never happened and the page is live again. A
  // non-persisted one is this document's own first load and has nothing to
  // undo. Either way the backstop below is what makes stranding impossible;
  // this only makes the common restore instant.
  const onRestore = (event) => {
    if (event?.persisted) takeDown();
  };
  windowRef?.addEventListener?.('pageshow', onRestore);
  setTimer(takeDown, backstopMs);

  reload();
  return true;
}

/**
 * A single-flight manual retry. Reload-based retries naturally leave the page;
 * an in-place shared model retry may return a promise, in which case the gate
 * re-opens only after that attempt settles. Repeated activations while it is in
 * flight are ignored.
 */
export function createManualRetry({ reload, onStart = () => {}, onSettled = () => {} }) {
  let running = false;

  return (...args) => {
    if (running) return false;
    running = true;
    onStart(...args);

    let result;
    try {
      result = reload?.(...args);
    } catch (error) {
      running = false;
      onSettled(error);
      return true;
    }

    if (result && typeof result.then === 'function') {
      Promise.resolve(result).then(
        (value) => {
          running = false;
          onSettled(null, value);
        },
        (error) => {
          running = false;
          onSettled(error);
        }
      );
    }

    // A synchronous reload intentionally remains locked: if navigation succeeds
    // the document is leaving, and if a shared in-place retry is introduced it
    // should return a promise so completion is observable.
    return true;
  };
}


function contentEditable(node) {
  const value = node?.getAttribute?.('contenteditable');
  return value != null && value !== 'false';
}

/**
 * True when a key event belongs to an actual UI control rather than the model.
 * Walks ancestors so a span/svg inside a button is treated as the button.
 */
export function isInteractiveUiTarget(target, ui) {
  for (let node = target; node; node = node.parentElement) {
    if (node === ui) return false;
    const tagName = String(node.tagName ?? '').toUpperCase();
    const role = String(node.getAttribute?.('role') ?? '').toLowerCase();
    if (INTERACTIVE_TAGS.has(tagName) || INTERACTIVE_ROLES.has(role) || contentEditable(node)) return true;
    if (node.parentElement === ui) break;
  }
  return false;
}

/**
 * Stop UI-owned key events before they reach App's window-level model shortcuts.
 * Deliberately does not preventDefault: native button/link/form/Tab behaviour and
 * component-local keyboard handlers still run.
 */
export function installUiShortcutGuard({ ui }) {
  if (!ui?.addEventListener) return () => {};
  const onKeyDown = (event) => {
    if (event?.isComposing || isInteractiveUiTarget(event?.target, ui)) event.stopPropagation?.();
  };
  ui.addEventListener('keydown', onKeyDown);
  return () => ui.removeEventListener?.('keydown', onKeyDown);
}

/**
 * Keep the scene shell alive while a page enters BFCache. A persisted pagehide
 * must not consume the final cleanup listener. Cleanup happens exactly once on
 * a real final leave, or when the caller explicitly tears the bridge down.
 */
export function installFinalPagehideCleanup({ windowRef = globalThis.window, cleanup }) {
  if (!windowRef?.addEventListener || typeof cleanup !== 'function') return () => {};
  let active = true;
  const teardown = () => {
    if (!active) return;
    active = false;
    windowRef.removeEventListener?.('pagehide', onPageHide);
    cleanup();
  };
  const onPageHide = (event) => {
    if (event?.persisted) return;
    teardown();
  };
  windowRef.addEventListener('pagehide', onPageHide);
  return teardown;
}


/**
 * Classify only failure signatures we can reasonably act on. Generic words
 * such as "context" or "load" are deliberately not enough: misclassifying
 * a scene bug as WebGL-unavailable can hide the retry path from the user.
 */
export function classifySceneStartFailure(error) {
  const message = String(error?.message ?? '').toLowerCase();

  const webglFailure = [
    'error creating webgl context',
    'webgl context could not be created',
    'could not create webgl',
    'webgl2 context',
    'webgl is not supported',
    'webgl not supported',
  ].some((needle) => message.includes(needle));
  if (webglFailure) return 'no_context';

  const assetFailure = [
    'failed to fetch',
    'fetch failed',
    'networkerror',
    'network error',
    'failed to load resource',
    'failed to load model',
    'failed to load atlas',
    'http 404',
    'status 404',
    'response status 404',
  ].some((needle) => message.includes(needle));
  if (assetFailure) return 'asset_error';

  if (error instanceof Error) return 'scene_error';
  return 'unknown';
}

/** Run optional reporting without turning a ready scene/fallback into a boot failure. */
export function settleOptionalService(promise, onReady, onError = () => {}) {
  Promise.resolve(promise).then(onReady).catch(onError);
}
