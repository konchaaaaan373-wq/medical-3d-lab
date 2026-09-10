import { el } from '../utils/dom.js';

const SHELL_VALUE = 'calm';

const dual = (en, ja) => [
  el('span', { class: 'lang-en', text: en }),
  el('span', { class: 'lang-ja', text: ja }),
];

/**
 * Apply the Work-owned presentation layer to an existing anatomy scene shell.
 *
 * This deliberately does not create a second header, camera controller,
 * anatomy panel, loader or store. Claude's App keeps ownership of those
 * objects. The adapter only marks that existing DOM for scoped CSS and moves
 * the long model subtitle behind a native, keyboard-operable disclosure.
 * Review and maturity badges remain visible at all times.
 *
 * The caller must opt in by setting `data-anatomy="yes"`, the shared anatomy
 * contract introduced by B4. Disease scenes and older builds are no-ops.
 *
 * @param {{ui?: HTMLElement}} [options]
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
  let disclosure = null;

  trustStatus?.setAttribute('aria-label', 'Model status / モデル状態');

  if (titleCard && subtitle) {
    disclosure = el('details', { class: 'anatomy-shell-about' }, [
      el('summary', { class: 'anatomy-shell-about-toggle' }, dual(
        'About this model',
        'モデルについて'
      )),
      el('div', { class: 'anatomy-shell-about-copy' }, [subtitle]),
    ]);
    titleCard.append(disclosure);
  }

  return {
    element: disclosure,
    destroy() {
      if (subtitle && titleCard && disclosure?.contains?.(subtitle)) {
        titleCard.append(subtitle);
      }
      disclosure?.remove?.();
      delete ui.dataset.anatomyShell;
    },
  };
}
