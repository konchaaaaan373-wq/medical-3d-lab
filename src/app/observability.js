/**
 * One place that turns telemetry, consent and feedback into product chrome.
 *
 * `main.js` should not have to know how the pieces fit together, and every
 * surface should get the same treatment: the same consent question, the same
 * feedback route, the same error capture. That uniformity is the point —
 * a route that quietly lacks error reporting is a route whose failures are
 * invisible, and those are exactly the routes that fail.
 *
 * Nothing here is required for a scene to render. If any of it throws, the
 * product carries on without it.
 */
import { onAppEvent } from './appEvents.js';
import { createConsentBanner } from '../components/ConsentBanner.js';
import { createFeedbackPanel } from '../components/FeedbackPanel.js';
import { installTelemetry } from '../telemetry/install.js';

const env = (key, fallback = '') => {
  try {
    return import.meta.env?.[key] ?? fallback;
  } catch {
    return fallback;
  }
};

/**
 * Where the feedback button goes.
 *
 * A scene already has a button rail; a shell surface does not, and gets a
 * floating trigger instead. Anything else would either hide the button or
 * cover the model with it.
 */
function mountTrigger(ui, trigger, placement) {
  const rail = placement === 'rail' ? ui.querySelector('.rail-buttons') : null;
  if (rail) {
    rail.append(trigger);
    return;
  }
  trigger.classList.add('is-floating');
  ui.append(trigger);
}

/**
 * Translate the product's own announcements into launch metrics.
 *
 * This is the only place that knows both vocabularies. A module that
 * announces `story:complete` does not know that a metric exists; the metric
 * definition does not know which module produces it.
 *
 * @param {object} telemetry
 * @param {{ sceneId: string|null, deviceClass: string, surface: string }} context
 * @returns {() => void} unsubscribe from all of them
 */
export function bridgeAppEvents(telemetry, { sceneId, deviceClass, surface }) {
  const scene = sceneId ? { scene: sceneId } : {};
  const offs = [
    onAppEvent('story:complete', ({ steps = 0, elapsedMs = 0 }) =>
      telemetry.record('story.complete', { ...scene, steps, elapsedMs })
    ),
    onAppEvent('compare:complete', ({ elapsedMs = 0 }) =>
      telemetry.record('compare.complete', { ...scene, elapsedMs })
    ),
    onAppEvent('learning:complete', ({ modules = 0, correct = 0, elapsedMs = 0 }) =>
      telemetry.record('learning.complete', { ...scene, modules, correct, elapsedMs })
    ),
    onAppEvent('guide:open', ({ fullscreen = false }) =>
      telemetry.record('patient_guide.open', { ...scene, fullscreen })
    ),
    onAppEvent('reel:export', ({ format = 'png', preset }) =>
      telemetry.record('reel.export', { ...scene, format, ...(preset ? { preset } : {}) })
    ),
    onAppEvent('conversion:step', ({ step, plan }) =>
      telemetry.record('account.conversion', { step, ...(plan ? { plan } : {}), ...scene })
    ),
  ];
  void deviceClass;
  void surface;
  return () => {
    for (const off of offs) off();
  };
}

/**
 * @param {object} options
 * @param {HTMLElement} options.ui
 * @param {'landing'|'explorer'|'lab'|'trust'|'scene'|'fallback'} options.surface
 * @param {string|null} [options.sceneId]
 * @param {'rail'|'floating'} [options.placement]
 * @param {boolean} [options.askConsent] a failed scene is not the moment to ask
 */
export function installObservability({
  ui,
  surface,
  sceneId = null,
  placement = 'floating',
  askConsent = true,
}) {
  try {
    const { telemetry, reporter, deviceClass } = installTelemetry({ surface, sceneId });
    telemetry.recordVisit({ device: deviceClass, surface });

    if (askConsent) {
      const banner = createConsentBanner({ telemetry });
      if (banner) ui.append(banner.element);
    }

    const endpoint = env('VITE_FEEDBACK_ENDPOINT');
    const feedback = createFeedbackPanel({
      ui,
      surface,
      sceneId,
      telemetry,
      submit: endpoint
        ? async (payload) => {
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(payload),
              credentials: 'omit',
            });
            if (!response.ok) throw new Error(`feedback endpoint returned ${response.status}`);
          }
        : null,
    });
    mountTrigger(ui, feedback.trigger, placement);
    const unbridge = bridgeAppEvents(telemetry, { sceneId, deviceClass, surface });

    return { telemetry, reporter, feedback, deviceClass, dispose: unbridge };
  } catch (error) {
    console.warn('[observability] not installed', error);
    return null;
  }
}
