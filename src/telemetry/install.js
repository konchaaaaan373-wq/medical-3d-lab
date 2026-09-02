/**
 * The browser-facing half of telemetry: transport, lifecycle and one instance.
 *
 * Everything that needs a `window` lives here so that `telemetry.js`,
 * `metrics.js`, `redact.js` and `retention.js` stay pure and testable — the
 * same split the medical model layer uses against `three`.
 *
 * With no endpoint configured (the default, and the whole of local
 * development) there is no transport at all: events are validated, redacted
 * and then dropped. That is deliberate. It means the instrumentation is
 * exercised on every run, and a missing environment variable can never turn
 * into an accidental transmission somewhere unintended.
 */
import { deviceClassForViewport } from '../app/performanceBudget.js';
import { createErrorReporter } from './errorReporter.js';
import { createTelemetry } from './telemetry.js';

const env = (key, fallback = '') => {
  try {
    return import.meta.env?.[key] ?? fallback;
  } catch {
    return fallback;
  }
};

/**
 * Send a batch with `sendBeacon` where it exists, because the important batch
 * is the last one — the one sent as the tab is closing, when a normal `fetch`
 * is cancelled with the document.
 *
 * @param {string} endpoint
 */
export function createBeaconTransport(endpoint) {
  return async (payload) => {
    const body = JSON.stringify(payload);
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const queued = navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }));
      if (queued) return;
      // Falling through on a `false` return is intentional: the browser
      // refused the beacon (usually a size limit) and the batch is not sent.
    }
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'omit',
      mode: 'cors',
    });
    if (!response.ok) throw new Error(`telemetry endpoint returned ${response.status}`);
  };
}

/** @type {{telemetry: object, reporter: object, deviceClass: string}|null} */
let installed = null;

/**
 * Create (once) the telemetry instance and global error capture.
 *
 * @param {{ surface?: string, sceneId?: string }} [context]
 */
export function installTelemetry({ surface = 'landing', sceneId = null } = {}) {
  if (installed) {
    installed.reporter.setSurface(surface);
    installed.telemetry.setContext({ surface, ...(sceneId ? { scene: sceneId } : {}) });
    return installed;
  }

  const endpoint = env('VITE_TELEMETRY_ENDPOINT');
  const deviceClass = deviceClassForViewport(window.innerWidth);

  const telemetry = createTelemetry({
    transport: endpoint ? createBeaconTransport(endpoint) : null,
    storage: safeLocalStorage(),
    release: env('VITE_RELEASE', 'dev'),
  });
  telemetry.setContext({ device: deviceClass, surface, ...(sceneId ? { scene: sceneId } : {}) });

  const reporter = createErrorReporter({ telemetry, surface });
  reporter.install(window);

  // The last batch of a visit is the one that says how the visit ended, so it
  // is sent when the page is hidden rather than on an interval. `pagehide`
  // covers the back/forward cache; `visibilitychange` covers a phone being
  // locked, which never fires `pagehide` on iOS.
  const flush = () => void telemetry.flush();
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });

  installed = { telemetry, reporter, deviceClass };
  return installed;
}

/** The installed instance, or null when telemetry has not been installed yet. */
export const currentTelemetry = () => installed?.telemetry ?? null;

/** Convenience: record an event if telemetry exists, otherwise do nothing. */
export function track(name, props = {}) {
  installed?.telemetry.record(name, props);
}

function safeLocalStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Test seam: forget the singleton so a fresh install can be made. */
export function resetTelemetryForTests() {
  installed = null;
}
