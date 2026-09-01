import {
  EXPLORER_ROUTE,
  LAB_ROUTE,
  LANDING_ROUTE,
  sceneById,
  statusById,
} from '../catalog/index.js';
import { el } from '../utils/dom.js';

/**
 * Useful non-WebGL failure state for a scene route.
 *
 * This never tries to reconstruct the medical visualization in DOM. It keeps
 * navigation, scene identity, maturity/scope copy and a retry path available so
 * renderer failure cannot turn the entire product into a blank/error canvas.
 */
export function createSceneFailureFallback({ ui, sceneId }) {
  const scene = sceneById(sceneId);
  const status = statusById(scene?.status);

  const link = (href, en, ja, primary = false) =>
    el('a', { class: `scene-fallback-link${primary ? ' primary' : ''}`, href }, [
      el('span', { class: 'lang-en', text: en }),
      el('span', { class: 'lang-ja', text: ja }),
    ]);

  const element = el('main', { class: 'scene-fallback', role: 'main' }, [
    el('section', { class: 'panel scene-fallback-card' }, [
      el('div', { class: 'scene-fallback-mark', 'aria-hidden': 'true', text: '3D' }),
      el('p', { class: 'scene-fallback-kicker' }, [
        el('span', { class: 'lang-en', text: '3D renderer unavailable' }),
        el('span', { class: 'lang-ja', text: '3D表示を開始できませんでした' }),
      ]),
      el('h1', { class: 'scene-fallback-title' }, [
        el('span', { class: 'lang-en', text: scene?.titleEn ?? 'Medical 3D Lab' }),
        el('span', { class: 'lang-ja', text: scene?.titleJa ?? 'Medical 3D Lab' }),
      ]),
      scene
        ? el('p', { class: 'scene-fallback-copy' }, [
            el('span', { class: 'lang-en', text: scene.description }),
            el('span', { class: 'lang-ja', text: scene.descriptionJa }),
          ])
        : null,
      status
        ? el('div', { class: `scene-fallback-status is-${scene.status}` }, [
            el('span', { class: 'lang-en', text: `Maturity: ${status.label}` }),
            el('span', { class: 'lang-ja', text: `完成度: ${status.labelJa}` }),
          ])
        : null,
      el('p', { class: 'scene-fallback-help' }, [
        el('span', {
          class: 'lang-en',
          text: 'The catalogue and account remain usable without WebGL. Retry this scene in a current browser with hardware acceleration enabled, or continue browsing the non-3D product shell.',
        }),
        el('span', {
          class: 'lang-ja',
          text: 'WebGLが使えない場合でも、カタログとアカウントは利用できます。ハードウェアアクセラレーションを有効にした最新ブラウザで再試行するか、3Dを使わない製品画面から他のモデルを探してください。',
        }),
      ]),
      el('div', { class: 'scene-fallback-actions' }, [
        el('button', {
          class: 'scene-fallback-retry',
          type: 'button',
          on: { click: () => window.location.reload() },
        }, [
          el('span', { class: 'lang-en', text: 'Retry 3D' }),
          el('span', { class: 'lang-ja', text: '3Dを再試行' }),
        ]),
        link(EXPLORER_ROUTE, 'Browse public models', '公開モデルを見る', true),
        link(LANDING_ROUTE, 'Home', 'ホーム'),
        link(LAB_ROUTE, 'Experimental Lab', '実験室'),
      ]),
    ]),
  ].filter(Boolean));

  ui.classList.add('has-scene-fallback');
  ui.append(element);
  document.title = `${scene?.titleEn ?? 'Medical 3D Lab'} — 3D unavailable`;
  return { element };
}
