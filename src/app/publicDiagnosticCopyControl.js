import { buildPublicDiagnosticText, copyPublicDiagnostic } from './publicDiagnostics.js';

function dual(documentRef, en, ja) {
  const enNode = documentRef.createElement('span');
  enNode.className = 'lang-en';
  enNode.textContent = en;
  const jaNode = documentRef.createElement('span');
  jaNode.className = 'lang-ja';
  jaNode.textContent = ja;
  return [enNode, jaNode];
}

/**
 * Small, non-modal diagnostic-copy control for an existing support or failure
 * surface. The caller owns model/build/revision/state; this component owns no
 * app state and never sends data anywhere.
 */
export function createPublicDiagnosticCopyControl({
  getContext,
  documentRef = globalThis.document,
  clipboard = globalThis.navigator?.clipboard,
} = {}) {
  if (!documentRef) throw new Error('document-required');
  if (typeof getContext !== 'function') throw new Error('getContext-required');

  const root = documentRef.createElement('section');
  root.className = 'public-diagnostic-copy';
  root.dataset.publicDiagnostic = '';

  const heading = documentRef.createElement('h3');
  heading.className = 'public-diagnostic-copy__title';
  heading.append(...dual(documentRef, 'Diagnostics', '診断情報'));

  const intro = documentRef.createElement('p');
  intro.className = 'public-diagnostic-copy__intro';
  intro.append(...dual(
    documentRef,
    'Review the content before copying. Nothing is sent automatically.',
    '内容を確認してからコピーできます。自動送信はしません。'
  ));

  const steps = documentRef.createElement('textarea');
  steps.className = 'public-diagnostic-copy__steps';
  steps.rows = 3;
  steps.maxLength = 1200;
  steps.placeholder = 'Steps to reproduce (optional) / 再現手順（任意）';
  steps.setAttribute('aria-label', 'Steps to reproduce (optional) / 再現手順（任意）');

  const preview = documentRef.createElement('textarea');
  preview.className = 'public-diagnostic-copy__preview';
  preview.rows = 8;
  preview.readOnly = true;
  preview.setAttribute('aria-label', 'Diagnostic information to copy / コピーする診断情報');

  const refresh = () => {
    preview.value = buildPublicDiagnosticText({ ...getContext(), steps: steps.value });
    return preview.value;
  };
  steps.addEventListener('input', refresh);

  const status = documentRef.createElement('p');
  status.className = 'public-diagnostic-copy__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const setStatus = (en, ja) => {
    status.replaceChildren(...dual(documentRef, en, ja));
  };

  const copy = documentRef.createElement('button');
  copy.className = 'public-diagnostic-copy__button';
  copy.type = 'button';
  copy.append(...dual(documentRef, 'Copy diagnostics', '診断情報をコピー'));
  copy.addEventListener('click', async () => {
    const text = refresh();
    copy.disabled = true;
    status.replaceChildren();
    try {
      await copyPublicDiagnostic(text, clipboard);
      setStatus('Copied.', 'コピーしました。');
    } catch {
      preview.focus();
      preview.select();
      setStatus(
        'Clipboard unavailable; copy the selected text.',
        '自動コピーできませんでした。選択済みの内容をコピーしてください。'
      );
    } finally {
      copy.disabled = false;
    }
  });

  root.append(heading, intro, steps, preview, copy, status);
  refresh();

  return {
    element: root,
    refresh,
    dispose() {
      root.remove();
    },
  };
}
