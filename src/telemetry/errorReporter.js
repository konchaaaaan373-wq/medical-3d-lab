/**
 * Global error capture.
 *
 * Two failure modes matter here and neither is the obvious one:
 *
 *   - **An error loop.** A scene that throws inside the animation loop throws
 *     sixty times a second. Uncapped, the reporter turns one bug into a denial
 *     of service against our own endpoint and the user's battery. Reports are
 *     therefore deduplicated by fingerprint and rate-limited per second.
 *   - **An error while reporting an error.** Anything thrown inside the
 *     handler is swallowed; a telemetry defect must never be able to break the
 *     page it is observing.
 *
 * The listener target is injected, so the whole install/uninstall lifecycle is
 * testable without a browser.
 */
import { fingerprint, redactStack, redactText } from './redact.js';

/** Reports allowed per rolling second, across all fingerprints. */
export const RATE_LIMIT_PER_SECOND = 5;

/**
 * @param {object} options
 * @param {{ reportError: Function, record: Function }} options.telemetry
 * @param {() => number} [options.now]
 * @param {string} [options.surface] which product surface was on screen
 * @param {number} [options.ratePerSecond]
 */
export function createErrorReporter({
  telemetry,
  now = () => Date.now(),
  surface = 'landing',
  ratePerSecond = RATE_LIMIT_PER_SECOND,
} = {}) {
  let currentSurface = surface;
  /** @type {number[]} timestamps of recent reports */
  let recent = [];
  let suppressed = 0;

  function withinRate() {
    const cutoff = now() - 1000;
    recent = recent.filter((at) => at > cutoff);
    if (recent.length >= ratePerSecond) {
      suppressed += 1;
      return false;
    }
    recent.push(now());
    return true;
  }

  /**
   * Normalise anything that can reach an error handler.
   *
   * `unhandledrejection` in particular delivers whatever was rejected with —
   * frequently a string, an object, or nothing at all.
   */
  function describe(value) {
    if (value instanceof Error) {
      return { name: value.name, message: value.message, stack: value.stack };
    }
    if (value && typeof value === 'object') {
      return {
        name: String(value.name ?? 'Error'),
        message: String(value.message ?? JSON.stringify(value).slice(0, 300)),
        stack: typeof value.stack === 'string' ? value.stack : '',
      };
    }
    return { name: 'Error', message: String(value ?? 'unknown error'), stack: '' };
  }

  const api = {
    get suppressed() {
      return suppressed;
    },

    /** Which surface later reports should be attributed to. */
    setSurface(next) {
      currentSurface = next ?? currentSurface;
    },

    /**
     * Report one failure.
     *
     * @param {unknown} error
     * @param {{ handled?: boolean, url?: string, surface?: string }} [context]
     * @returns {string|null} the fingerprint, or null when it was rate-limited
     */
    capture(error, { handled = false, url = '', surface: at = currentSurface } = {}) {
      try {
        if (!withinRate()) return null;
        const described = describe(error);
        const id = telemetry.reportError({ ...described, url, surface: at, handled });
        // The metric carries the fingerprint only. The prose stays in the
        // diagnostic channel, where it has been redacted.
        telemetry.record('error.captured', { fingerprint: id, surface: at, handled });
        return id;
      } catch {
        return null;
      }
    },

    /**
     * A renderer failure is reported as its own metric as well as an error:
     * "how often does WebGL fail" is a product question, not a bug report.
     *
     * @param {unknown} error
     * @param {{ scene?: string, device?: string, reason?: string, fallbackShown?: boolean }} context
     */
    captureRendererFailure(error, { scene, device = 'desktop', reason = 'unknown', fallbackShown = true } = {}) {
      const described = describe(error);
      const id =
        fingerprint({
          name: described.name,
          message: redactText(described.message),
          frames: redactStack(described.stack),
        });
      try {
        telemetry.reportError({ ...described, surface: 'fallback', handled: true });
        telemetry.record('renderer.failure', {
          scene,
          device,
          reason,
          fingerprint: id,
          fallbackShown,
        });
      } catch {
        /* see the module comment: reporting must not be able to fail loudly */
      }
      return id;
    },

    /**
     * Attach to a window (or anything with `addEventListener`).
     *
     * @returns {() => void} uninstall
     */
    install(target) {
      if (!target?.addEventListener) return () => {};
      const onError = (event) => {
        api.capture(event?.error ?? event?.message, {
          handled: false,
          url: event?.filename ?? '',
        });
      };
      const onRejection = (event) => {
        api.capture(event?.reason, { handled: false });
      };
      target.addEventListener('error', onError);
      target.addEventListener('unhandledrejection', onRejection);
      return () => {
        target.removeEventListener('error', onError);
        target.removeEventListener('unhandledrejection', onRejection);
      };
    },
  };

  return api;
}
