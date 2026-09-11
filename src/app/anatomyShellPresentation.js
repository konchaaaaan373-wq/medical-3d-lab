import { el } from '../utils/dom.js';

const SHELL_VALUE = 'calm';

const dual = (en, ja) => [
  el('span', { class: 'lang-en', text: en }),
  el('span', { class: 'lang-ja', text: ja }),
];

/**
 * Apply the Work-owned presentation layer to an existing anatomy scene shell.
 * The adapter never owns anatomy/model state; it only changes presentation.
 */
export function mountAnatomyShellPresentation({
  ui = globalThis.document?.getElementById?.('ui'),
} = {}) {
  if (!ui || ui.dataset.anatomy !== 'yes') return null;
  if (ui.dataset.anatomyShell === SHELL_VALUE) return null;

  ui.dataset.anatomyShell = SHELL_VALUE;

  const titleCard = ui.querySelector?.('.title-card') ?? null;
  const subtitle = titleCard?.querySelector?.('.subtitle') ?? null;
  const trustStatus = titleCard?.querySelector?.('.title-trust-badges') ?? null;
  const eyebrow = titleCard?.querySelector?.('.eyebrow') ?? null;
  const maturityBadge = trustStatus?.querySelector?.('.status-badge') ?? null;
  const previousTrustLabel = trustStatus?.getAttribute?.('aria-label') ?? null;
  const subtitleNextSibling = subtitle?.nextSibling ?? null;
  const eyebrowNextSibling = eyebrow?.nextSibling ?? null;
  const maturityNextSibling = maturityBadge?.nextSibling ?? null;
  const stage = globalThis.document?.getElementById?.('stage') ?? null;
  let disclosure = null;
  let gestureHint = null;
  let destroyed = false;

  trustStatus?.setAttribute('aria-label', 'Model status / モデル状態');
  eyebrow?.remove?.();

  if (titleCard && subtitle) {
    const settingsSlot = el('div', {
      class: 'anatomy-shell-usage-slot',
      'data-usage-recording-slot': '',
    });
    const maturity = maturityBadge
      ? el('div', { class: 'anatomy-shell-maturity' }, [
          el('span', { class: 'anatomy-shell-meta-label' }, dual('Build stage', '実装段階')),
          maturityBadge,
        ])
      : null;

    disclosure = el('details', { class: 'anatomy-shell-about' }, [
      el('summary', { class: 'anatomy-shell-about-toggle' }, dual(
        'Info & settings',
        '情報・設定'
      )),
      el('div', { class: 'anatomy-shell-about-copy' }, [
        el('section', { class: 'anatomy-shell-model-info' }, [
          el('h3', { class: 'anatomy-shell-section-title' }, dual(
            'About this model',
            'モデルについて'
          )),
          subtitle,
          maturity,
        ].filter(Boolean)),
        settingsSlot,
      ]),
    ]);
    titleCard.append(disclosure);
  }

  gestureHint = el('div', {
    class: 'anatomy-shell-gesture-hint',
    'aria-hidden': 'true',
  }, [
    el('span', { class: 'gesture-pointer lang-en', text: 'Drag to rotate · wheel to zoom' }),
    el('span', { class: 'gesture-pointer lang-ja', text: 'ドラッグで回転 · ホイールで拡大' }),
    el('span', { class: 'gesture-touch lang-en', text: 'Drag to rotate · pinch to zoom' }),
    el('span', { class: 'gesture-touch lang-ja', text: '指で回転 · ピンチで拡大' }),
  ]);
  ui.append?.(gestureHint);

  const dismissHint = () => gestureHint?.remove?.();
  stage?.addEventListener?.('pointerdown', dismissHint, { once: true });
  stage?.addEventListener?.('wheel', dismissHint, { once: true, passive: true });
  stage?.addEventListener?.('touchstart', dismissHint, { once: true, passive: true });

  return {
    element: disclosure,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stage?.removeEventListener?.('pointerdown', dismissHint);
      stage?.removeEventListener?.('wheel', dismissHint);
      stage?.removeEventListener?.('touchstart', dismissHint);
      gestureHint?.remove?.();
      gestureHint = null;
      if (maturityBadge && trustStatus) {
        if (maturityNextSibling?.parentNode === trustStatus && trustStatus.insertBefore) {
          trustStatus.insertBefore(maturityBadge, maturityNextSibling);
        } else {
          trustStatus.append?.(maturityBadge);
        }
      }
      if (eyebrow && titleCard) {
        if (eyebrowNextSibling?.parentNode === titleCard && titleCard.insertBefore) {
          titleCard.insertBefore(eyebrow, eyebrowNextSibling);
        } else {
          titleCard.prepend?.(eyebrow);
        }
      }
      if (subtitle && titleCard && disclosure?.contains?.(subtitle)) {
        if (subtitleNextSibling?.parentNode === titleCard && titleCard.insertBefore) {
          titleCard.insertBefore(subtitle, subtitleNextSibling);
        } else {
          titleCard.append(subtitle);
        }
      }
      disclosure?.remove?.();
      if (trustStatus) {
        if (previousTrustLabel == null) trustStatus.removeAttribute?.('aria-label');
        else trustStatus.setAttribute('aria-label', previousTrustLabel);
      }
      delete ui.dataset.anatomyShell;
    },
  };
}
