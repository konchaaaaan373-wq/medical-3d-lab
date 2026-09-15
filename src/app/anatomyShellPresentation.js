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
  const titleEn = titleCard?.querySelector?.('.title') ?? null;
  const titleJa = titleCard?.querySelector?.('.title-ja') ?? null;
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

  /**
   * On a phone the card stops being a card.
   *
   * On a desktop the title and the review state are a heading beside the model.
   * On a 390 px phone they are a second column taking a fifth of the height,
   * next to the selection card, above a model that then has nowhere to be —
   * which is what a device pass found. The same three things a reader needs are
   * still here: the title is already in the header bar, and the title line and
   * the review state move *inside* the information disclosure, which is the
   * affordance that stays.
   *
   * Moved rather than duplicated, and moved back when there is room again: two
   * copies of a review state is how one of them comes to be wrong.
   */
  const NARROW = '(max-width: 430px)';
  const narrow = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia(NARROW)
    : null;
  /** Where each moved node sat, so putting it back is putting it back. */
  const homeOf = new Map();
  const movable = [titleEn, titleJa, trustStatus].filter(Boolean);

  function applyWidth() {
    if (destroyed) return;
    const copy = disclosure?.querySelector?.('.anatomy-shell-about-copy');
    if (!copy) return;
    // The language, hide-UI and feedback chips are a row of chrome, and a row
    // of chrome on a phone is a row the model does not get. They join the
    // disclosure's own row instead of standing under it — nothing is hidden and
    // nothing is a second tap away, and the model is 44 px taller for it.
    // Looked up each time rather than captured once: this adapter can mount
    // before the rail's own buttons exist, and a reference taken then would be
    // null for the rest of the session — including the resize that needs it.
    const railButtons = ui.querySelector?.('.rail-buttons') ?? null;
    if (railButtons && titleCard) {
      if (narrow?.matches) {
        if (!titleCard.contains?.(railButtons)) {
          if (!homeOf.has(railButtons)) {
            homeOf.set(railButtons, [railButtons.parentNode, railButtons.nextSibling]);
          }
          titleCard.append?.(railButtons);
        }
      } else {
        restoreNode(railButtons);
      }
    }
    if (narrow?.matches) {
      // Reverse order with `prepend`, so they arrive in the order they are in.
      for (const node of [...movable].reverse()) {
        if (copy.contains?.(node)) continue;
        if (!homeOf.has(node)) homeOf.set(node, [node.parentNode, node.nextSibling]);
        copy.prepend?.(node);
      }
    } else {
      for (const node of movable) restoreNode(node);
    }
  }

  function restoreNode(node) {
    const home = homeOf.get(node);
    if (!home) return;
    const [parent, next] = home;
    if (!parent) return;
    if (next?.parentNode === parent && parent.insertBefore) parent.insertBefore(node, next);
    else parent.append?.(node);
    homeOf.delete(node);
  }

  applyWidth();
  narrow?.addEventListener?.('change', applyWidth);

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
      narrow?.removeEventListener?.('change', applyWidth);
      for (const node of movable) restoreNode(node);
      for (const node of [...homeOf.keys()]) restoreNode(node);
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
