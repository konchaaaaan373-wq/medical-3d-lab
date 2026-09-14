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
 * the reload is asked for after. The veil is `.loading` — the one the scene
 * boot already paints, so the two are visually one wait rather than two — but
 * its wording is about leaving rather than about a model, because the next page
 * may be a locked model, an index or a legal document.
 *
 * ## The two ways this went wrong when it was first written
 *
 * **It could strand the page.** The veil was appended and never removed, and
 * nothing released the latch. A reload that does not commit — the reader goes
 * Back, or the document is restored from the back/forward cache — left the old
 * document alive under an opaque, click-swallowing "Opening" with no reload
 * pending. A `pageshow` restore now takes it down; `installFinalPagehideCleanup`
 * below is the same page's other half of that contract.
 *
 * **It let the first destination win.** The latch made a second `hashchange`
 * a no-op, so pressing Back during a slow departure was swallowed and the
 * original target still committed — the address bar and the page disagreeing.
 * A second call now re-asks: `reload()` loads whatever the address bar says
 * *now*, so the newest destination is the one that commits. What the latch
 * still prevents is a second veil stacking on the first.
 *
 * @param {{doc?: Document, windowRef?: Window, reload?: () => void,
 *   language?: 'en'|'ja'}} [options]
 * @returns {boolean} whether this call is the one that raised the veil
 */
export function leaveForReload({
  doc = globalThis.document,
  windowRef = globalThis.window,
  reload = () => windowRef?.location?.reload(),
  language = readUiLanguagePreference(),
} = {}) {
  if (!doc?.body) {
    reload();
    return true;
  }

  // Already leaving. Ask again anyway — see "It let the first destination win".
  if (doc.querySelector?.('.loading[data-leaving]')) {
    reload();
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
  veil.innerHTML = [
    `<span>${language === 'en' ? 'Opening' : '移動しています'}</span>`,
    '<span class="loading-bar"></span>',
  ].join('');
  doc.body.append(veil);

  const dismissOnRestore = (event) => {
    // A non-persisted `pageshow` is this document's own first load and has
    // nothing to undo. A persisted one means the reload never happened and we
    // are back where we started, with a veil over a live page.
    if (!event?.persisted) return;
    veil.remove?.();
    windowRef?.removeEventListener?.('pageshow', dismissOnRestore);
  };
  windowRef?.addEventListener?.('pageshow', dismissOnRestore);

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
