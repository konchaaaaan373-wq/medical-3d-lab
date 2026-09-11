import {
  EXPLORER_ROUTE,
  LAB_ROUTE,
  LANDING_ROUTE,
  sceneById,
  statusById,
} from '../catalog/index.js';
import { betaUnlocked } from './releaseGate.js';
import { sceneFailureGuidance } from './sceneFailureGuidance.js';
import { createManualRetry } from './sceneShellBridge.js';
import { el } from '../utils/dom.js';

/** Useful non-WebGL failure state for a scene route. */
export function createSceneFailureFallback({
  ui,
  sceneId,
  reason = 'unknown',
  onRetry = () => window.location.reload(),
}) {
  const scene = sceneById(sceneId);
  const status = statusById(scene?.status);
  const guidance = sceneFailureGuidance(reason);

  const link = (href, en, ja, primary = false) =>
    el('a', { class: `scene-fallback-link${primary ? ' primary' : ''}`, href }, [
      el('span', { class: 'lang-en', text: en }),
      el('span', { class: 'lang-ja', text: ja }),
    ]);

  let retry = null;
  const paintRetryReady = () => {
    if (!retry) return;
    retry.disabled = false;
    retry.removeAttribute?.('aria-busy');
    retry.replaceChildren?.(
      el('span', { class: 'lang-en', text: guidance.retryEn }),
      el('span', { class: 'lang-ja', text: guidance.retryJa })
    );
  };
  const retryOnce = createManualRetry({
    reload: () => onRetry(),
    onStart: (event) => {
      const button = event?.currentTarget ?? retry;
      if (!button) return;
      button.disabled = true;
      button.setAttribute?.('aria-busy', 'true');
      button.replaceChildren?.(
        el('span', { class: 'lang-en', text: 'Reloading…' }),
        el('span', { class: 'lang-ja', text: '再読み込み中…' })
      );
    },
    // A future shared in-place retry (Claude's onRetryModel) can settle without
    // navigation. Re-enable this same button then; do not create a second retry
    // surface or leave the first attempt permanently disabled.
    onSettled: () => paintRetryReady(),
  });
  retry = guidance.retry
    ? el('button', {
        class: 'scene-fallback-retry',
        type: 'button',
        on: { click: (event) => retryOnce(event) },
      }, [
        el('span', { class: 'lang-en', text: guidance.retryEn }),
        el('span', { class: 'lang-ja', text: guidance.retryJa }),
      ])
    : null;

  const title = el('h1', { class: 'scene-fallback-title', tabindex: '-1' }, [
    el('span', { class: 'lang-en', text: scene?.titleEn ?? 'Medical 3D Lab' }),
    el('span', { class: 'lang-ja', text: scene?.titleJa ?? 'Medical 3D Lab' }),
  ]);

  const element = el('main', { class: 'scene-fallback', role: 'main' }, [
    el('section', { class: 'panel scene-fallback-card' }, [
      el('div', { class: 'scene-fallback-mark', 'aria-hidden': 'true', text: '3D' }),
      el('p', { class: 'scene-fallback-kicker' }, [
        el('span', { class: 'lang-en', text: guidance.kickerEn }),
        el('span', { class: 'lang-ja', text: guidance.kickerJa }),
      ]),
      title,
      status
        ? el('div', { class: `scene-fallback-status is-${scene.status}` }, [
            el('span', { class: 'lang-en', text: `Maturity: ${status.label}` }),
            el('span', { class: 'lang-ja', text: `完成度: ${status.labelJa}` }),
          ])
        : null,
      el('p', { class: 'scene-fallback-help' }, [
        el('span', { class: 'lang-en', text: guidance.helpEn }),
        el('span', { class: 'lang-ja', text: guidance.helpJa }),
      ]),
      el('div', { class: 'scene-fallback-actions' }, [
        retry,
        link(EXPLORER_ROUTE, 'Browse public models', '公開モデルを見る', true),
        link(LANDING_ROUTE, 'Home', 'ホーム'),
        betaUnlocked() ? link(LAB_ROUTE, 'Experimental Lab', '実験室') : null,
      ].filter(Boolean)),
    ]),
  ]);

  ui.classList.add('has-scene-fallback');
  ui.append(element);
  title.focus?.();
  const language = ui.dataset.lang === 'en' ? 'en' : 'ja';
  document.title = language === 'en'
    ? `${scene?.titleEn ?? 'Medical 3D Lab'} — 3D unavailable`
    : `${scene?.titleJa ?? 'Medical 3D Lab'} — 3Dを開始できません`;
  return {
    element,
    destroy() {
      element.remove?.();
      ui.classList.remove?.('has-scene-fallback');
    },
  };
}
