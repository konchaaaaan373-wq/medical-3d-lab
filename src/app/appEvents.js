/**
 * A one-file publish/subscribe bus for "something the product cares about
 * just happened".
 *
 * The alternative — importing telemetry into `StoryMode`, `LearningPanel`,
 * `ReelMode` and the access layer — would make five presentation modules
 * depend on an analytics concern, and would make each of them harder to test
 * in isolation. Instead they announce facts in their own vocabulary
 * ("the story reached its end"), and exactly one subscriber, in
 * `observability.js`, decides that this is a metric.
 *
 * Payloads follow the same rule as the metric vocabulary: identifiers,
 * counts and enumerations, never prose.
 *
 * Publishing with no subscriber is free and is the normal case in tests.
 */

/** Every event a module may announce. Anything else is a typo. */
export const APP_EVENTS = [
  'story:complete',
  'compare:complete',
  'learning:complete',
  'guide:open',
  'reel:export',
  'conversion:step',
];

/** @type {Map<string, Set<Function>>} */
const subscribers = new Map();

/**
 * @param {string} name one of `APP_EVENTS`
 * @param {(payload: object) => void} handler
 * @returns {() => void} unsubscribe
 */
export function onAppEvent(name, handler) {
  if (!APP_EVENTS.includes(name)) {
    console.warn(`[appEvents] unknown event "${name}"`);
    return () => {};
  }
  if (!subscribers.has(name)) subscribers.set(name, new Set());
  subscribers.get(name).add(handler);
  return () => subscribers.get(name)?.delete(handler);
}

/**
 * Announce a fact. Never throws: a subscriber's failure is the subscriber's
 * problem, not the scene's.
 *
 * @param {string} name
 * @param {object} [payload]
 */
export function emitAppEvent(name, payload = {}) {
  if (!APP_EVENTS.includes(name)) {
    console.warn(`[appEvents] unknown event "${name}"`);
    return;
  }
  for (const handler of subscribers.get(name) ?? []) {
    try {
      handler(payload);
    } catch (error) {
      console.warn(`[appEvents] subscriber for "${name}" failed`, error);
    }
  }
}

/** Test seam: drop every subscription. */
export function resetAppEvents() {
  subscribers.clear();
}

/** How many handlers are listening — used by the tests, and to assert wiring. */
export const subscriberCount = (name) => subscribers.get(name)?.size ?? 0;
