import { el } from '../utils/dom.js';
import { watchConsoleReach } from './consoleReach.js';

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
      el('summary', { class: 'anatomy-shell-about-toggle' }, [
        // Where the model's name goes on a phone. Empty at every other width,
        // and filled by moving the title lines into it rather than by writing
        // them twice — see `applyWidth` below.
        el('span', { class: 'anatomy-shell-about-identity' }),
        el('span', { class: 'anatomy-shell-about-label' }, dual(
          'Info & settings',
          '情報・設定'
        )),
      ]),
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
  /**
   * What the disclosure is called, and why it changes with the width.
   *
   * On a desktop the model's name is a heading beside it and this control is
   * what it says: information and settings. On a phone the card stops being a
   * card, the name moves inside this disclosure, and the result — measured at
   * 390×844 on `#/brain-anatomy` — was a screen with **no model name on it at
   * all** behind a control labelled 情報・設定.
   *
   * Two things were wrong with that. The reader could not tell which model was
   * open except from a one-character chip in the header; and the one link to
   * the model's medical basis lives in this disclosure, so "how do I check
   * what this is based on" was hidden behind a word that does not suggest it.
   *
   * So on a phone the summary carries the model's name. It is the same nodes,
   * moved — `titleEn` and `titleJa` go into the summary instead of into the
   * body — because two copies of a title is how one of them comes to be wrong,
   * which is the rule the width switch below already follows for the review
   * state.
   */
  const NARROW = '(max-width: 430px)';
  const narrow = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia(NARROW)
    : null;
  /** Where each moved node sat, so putting it back is putting it back. */
  const homeOf = new Map();
  /** Into the disclosure's body on a phone: the review state and the link with it. */
  const movable = [trustStatus].filter(Boolean);
  /** Into the disclosure's own summary on a phone: what the model is called. */
  const titleLines = [titleEn, titleJa].filter(Boolean);

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
    const identity = disclosure?.querySelector?.('.anatomy-shell-about-identity');
    if (narrow?.matches) {
      // Reverse order with `prepend`, so they arrive in the order they are in.
      for (const node of [...movable].reverse()) {
        if (copy.contains?.(node)) continue;
        if (!homeOf.has(node)) homeOf.set(node, [node.parentNode, node.nextSibling]);
        copy.prepend?.(node);
      }
      for (const node of titleLines) {
        if (identity?.contains?.(node)) continue;
        if (!homeOf.has(node)) homeOf.set(node, [node.parentNode, node.nextSibling]);
        identity?.append?.(node);
      }
    } else {
      for (const node of [...movable, ...titleLines]) restoreNode(node);
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

  // The hint floats above the control bar, so it needs the bar's height and CSS
  // cannot ask for it. Measured into `--console-reach` rather than copied into
  // a px constant per media query, which is how it came to print across the bar
  // twice (F-116).
  const consoleReach = watchConsoleReach({ ui });

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
      consoleReach.destroy();
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
