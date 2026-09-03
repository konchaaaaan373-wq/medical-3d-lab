/**
 * Consent-gated telemetry.
 *
 * Three rules hold the whole design up:
 *
 *   1. **Nothing leaves the browser without consent.** Not a page view, not an
 *      error, not a "did the app even start" ping. Before consent is answered,
 *      events are held in memory only; on refusal they are dropped, and no
 *      later grant can resurrect them because they no longer exist.
 *   2. **Metrics cannot carry prose.** The vocabulary in `metrics.js` has no
 *      free-text property type, and an event that fails validation is dropped
 *      rather than trimmed — a caller cannot smuggle a note through.
 *   3. **Diagnostics travel separately and redacted.** Error reports do need
 *      prose, so they go down their own channel, through `redact.js`, and the
 *      metric that accompanies one carries only a fingerprint.
 *
 * Pure JavaScript: the transport and the storage are injected, so the whole
 * queue, consent and rate-limiting behaviour is testable under `node --test`.
 */
import { coerceEvent, metricByName, validateEvent } from './metrics.js';
import { fingerprint, redactStack, redactText, redactUrl, stableHash } from './redact.js';
import { visitBucket, withVisit } from './retention.js';

export const CONSENT_STATES = ['unset', 'granted', 'denied'];
export const CONSENT_STORAGE_KEY = 'medical3dlab.telemetry-consent.v1';
export const VISIT_STORAGE_KEY = 'medical3dlab.visits.v1';

/** A storage that always fails, for private-mode browsers and for tests. */
const nullStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

/** Never throws: storage access is denied outright in some privacy modes. */
function safeStorage(storage) {
  if (!storage) return nullStorage;
  return {
    getItem(key) {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        storage.setItem(key, value);
      } catch {
        /* a browser that refuses to remember the answer simply asks again */
      }
    },
    removeItem(key) {
      try {
        storage.removeItem(key);
      } catch {
        /* ignored for the same reason */
      }
    },
  };
}

const readJson = (storage, key) => {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * @param {object} options
 * @param {(payload: object) => (void|Promise<void>)} [options.transport] where a batch goes
 * @param {Storage} [options.storage] consent and visit counting; never event contents
 * @param {() => number} [options.now]
 * @param {() => string} [options.randomId]
 * @param {string} [options.release] build identifier reported with each batch
 * @param {number} [options.maxQueue] events held before the oldest are dropped
 * @param {number} [options.maxPerName] per-session cap on one event name
 * @param {number} [options.maxErrors] per-session cap on error reports
 */
export function createTelemetry({
  transport = null,
  storage = null,
  now = () => Date.now(),
  randomId = () => Math.random().toString(16).slice(2, 10).padStart(8, '0'),
  release = 'dev',
  maxQueue = 50,
  maxPerName = 100,
  maxErrors = 10,
} = {}) {
  const store = safeStorage(storage);

  let consent = CONSENT_STATES.includes(store.getItem(CONSENT_STORAGE_KEY))
    ? store.getItem(CONSENT_STORAGE_KEY)
    : 'unset';

  /**
   * Groups the events of one page load. Regenerated on every load and never
   * written to storage, so it cannot link two visits to each other.
   */
  const sessionRef = randomId();

  /** @type {object[]} */
  let queue = [];
  /** @type {object[]} */
  let errors = [];
  /** @type {Map<string, number>} */
  const counts = new Map();
  /** @type {Map<string, number>} */
  const seenFingerprints = new Map();
  /** Ambient properties merged into any event that declares them. */
  let context = {};
  let dropped = 0;
  let sends = 0;

  const listeners = new Set();
  const announce = () => {
    for (const listener of listeners) listener(consent);
  };

  function enqueue(entry) {
    if (consent === 'denied') return false;
    queue.push(entry);
    if (queue.length > maxQueue) {
      queue.splice(0, queue.length - maxQueue);
      dropped += 1;
    }
    return true;
  }

  async function send() {
    if (consent !== 'granted' || !transport) return false;
    if (queue.length === 0 && errors.length === 0) return false;
    const payload = {
      release,
      sessionRef,
      sentAt: now(),
      events: queue,
      errors,
    };
    queue = [];
    errors = [];
    try {
      await transport(payload);
      sends += 1;
      return true;
    } catch {
      // One retry's worth of memory, no more: a telemetry backlog must never
      // grow into a reason the product itself misbehaves.
      //
      // Put back **in front of** whatever arrived while the send was in flight,
      // rather than over it. `queue` is emptied before the await, so anything
      // recorded during the request lands in a fresh array; assigning the
      // failed batch to `queue` discarded those events silently, and the events
      // most likely to be recorded during a failing send are the ones about the
      // failure. Oldest first, so the cap drops the oldest, which is the policy
      // everywhere else here.
      queue = [...payload.events, ...queue].slice(-maxQueue);
      errors = [...payload.errors, ...errors].slice(-maxErrors);
      return false;
    }
  }

  return {
    get consent() {
      return consent;
    },
    get sessionRef() {
      return sessionRef;
    },
    /** Events waiting to be sent — used by the tests and the consent banner. */
    get pending() {
      return queue.length + errors.length;
    },
    get stats() {
      return { queued: queue.length, errors: errors.length, dropped, sends };
    },

    /**
     * Record the answer to the consent question.
     *
     * Granting flushes what was gathered while the question was open; refusing
     * destroys it. There is no third path in which a "maybe" is kept on disk.
     *
     * @param {'unset'|'granted'|'denied'} state
     */
    setConsent(state) {
      if (!CONSENT_STATES.includes(state) || state === consent) return consent;
      consent = state;
      if (state === 'unset') store.removeItem(CONSENT_STORAGE_KEY);
      else store.setItem(CONSENT_STORAGE_KEY, state);
      if (state === 'denied') {
        queue = [];
        errors = [];
      }
      announce();
      if (state === 'granted') void send();
      return consent;
    },

    /** @param {(state: string) => void} listener */
    onConsent(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /**
     * Ambient properties (device class, current surface, current scene) merged
     * into every later event that declares them. Undeclared keys are ignored
     * per event, so setting a scene does not corrupt a scene-less metric.
     */
    setContext(partial = {}) {
      context = { ...context, ...partial };
      return context;
    },
    get context() {
      return { ...context };
    },

    /**
     * Record one metric event.
     *
     * @param {string} name a name declared in `metrics.js`
     * @param {Record<string, unknown>} [props]
     * @returns {boolean} whether it was accepted
     */
    record(name, props = {}) {
      if (consent === 'denied') return false;
      const metric = metricByName(name);
      if (!metric) {
        console.warn(`[telemetry] unknown metric "${name}" — declare it in metrics.js`);
        return false;
      }

      const used = counts.get(name) ?? 0;
      if (used >= maxPerName) return false;

      // Only the ambient values this metric actually declares.
      const ambient = {};
      for (const key of Object.keys(metric.props)) {
        if (context[key] != null && props[key] == null) ambient[key] = context[key];
      }

      const clean = coerceEvent(name, { ...ambient, ...props });
      if (!clean) {
        console.warn(`[telemetry] dropped "${name}": ${validateEvent(name, { ...ambient, ...props }).join('; ')}`);
        return false;
      }

      counts.set(name, used + 1);
      return enqueue({ name, at: now(), props: clean });
    },

    /**
     * Record a diagnostic report.
     *
     * The message and stack are redacted here rather than at the call site, so
     * a future caller cannot forget. Repeats of a fingerprint already reported
     * are counted rather than re-sent.
     *
     * @param {{ name?: string, message?: unknown, stack?: unknown, url?: unknown,
     *           surface?: string, handled?: boolean }} report
     * @returns {string|null} the fingerprint, or null when nothing was recorded
     */
    reportError(report = {}) {
      if (consent === 'denied') return null;
      const frames = redactStack(report.stack);
      const message = redactText(report.message).slice(0, 300);
      const id = fingerprint({ name: report.name ?? 'Error', message, frames });

      const seen = seenFingerprints.get(id) ?? 0;
      seenFingerprints.set(id, seen + 1);
      if (seen > 0) return id;
      if (errors.length >= maxErrors) return id;

      errors.push({
        fingerprint: id,
        name: String(report.name ?? 'Error').slice(0, 60),
        message,
        frames,
        url: redactUrl(report.url),
        surface: report.surface ?? null,
        handled: report.handled === true,
        at: now(),
      });
      return id;
    },

    /** How many times a fingerprint was seen this session, reported or not. */
    occurrences(id) {
      return seenFingerprints.get(id) ?? 0;
    },

    /**
     * Count today's visit locally and report the bucket.
     *
     * Returns the bucket even when consent is not granted, because the product
     * shell may want to greet a returning visitor without telling anyone.
     */
    recordVisit({ device = 'desktop', surface = 'landing', today } = {}) {
      const profile = withVisit(readJson(store, VISIT_STORAGE_KEY), today);
      store.setItem(VISIT_STORAGE_KEY, JSON.stringify(profile));
      const bucket = visitBucket(profile);
      this.record('session.visit', { bucket, device, surface });
      return bucket;
    },

    /** Send everything queued. Resolves false when there was nothing to do. */
    flush() {
      return send();
    },

    /**
     * Forget everything held in memory and on disk for this browser.
     *
     * The action behind "delete what you have about me" in the product: the
     * only durable things telemetry ever writes are the consent answer and the
     * local visit count, and this removes both.
     */
    forget() {
      queue = [];
      errors = [];
      counts.clear();
      seenFingerprints.clear();
      store.removeItem(VISIT_STORAGE_KEY);
      store.removeItem(CONSENT_STORAGE_KEY);
      consent = 'unset';
      announce();
    },
  };
}

/** Stable, non-identifying hash of a build string, for grouping releases. */
export const releaseRef = (value) => stableHash(String(value ?? 'dev'));
