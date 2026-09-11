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
