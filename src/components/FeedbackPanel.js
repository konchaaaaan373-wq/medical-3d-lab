import { PUBLIC_SCENES } from '../catalog/index.js';
import { el } from '../utils/dom.js';
import { redactText } from '../telemetry/redact.js';

/**
 * The in-product feedback route.
 *
 * Two things make this different from the analytics path, and both are the
 * point of having it at all:
 *
 *   - **It is prose, and prose is never analytics.** What somebody writes here
 *     goes to the feedback endpoint and nowhere else. The metric that records
 *     that feedback happened carries a category and a surface, never a word of
 *     what was written.
 *   - **It works when the product does not.** A renderer failure is exactly
 *     when a report is most valuable, so the panel is plain DOM with no
 *     dependency on a scene, a renderer or an account.
 *
 * With no endpoint configured the panel composes a mail link instead of
 * silently discarding what somebody took the trouble to write.
 */

export const FEEDBACK_CATEGORIES = [
  { id: 'medical', en: 'Something is medically wrong', ja: '医学的に誤っている' },
  { id: 'bug', en: 'Something is broken', ja: '動作しない・壊れている' },
  { id: 'usability', en: 'Something is confusing', ja: 'わかりにくい' },
  { id: 'other', en: 'Something else', ja: 'その他' },
];

export const MAX_FEEDBACK_LENGTH = 2000;

/**
 * Everything wrong with a submission, as human-readable lines.
 *
 * Pure, and exported, so the rules are tested rather than trusted to the form.
 *
 * @param {{ category?: string, message?: string, contact?: string }} draft
 */
export function validateFeedback(draft = {}) {
  const problems = [];
  if (!FEEDBACK_CATEGORIES.some((entry) => entry.id === draft.category)) {
    problems.push('choose what kind of feedback this is');
  }
  const message = typeof draft.message === 'string' ? draft.message.trim() : '';
  if (message.length < 4) problems.push('the message is empty');
  if (message.length > MAX_FEEDBACK_LENGTH) problems.push('the message is too long');
  // Trimmed first: a field somebody tabbed through and left as whitespace is
  // an address they chose not to give, not a malformed one.
  const contact = typeof draft.contact === 'string' ? draft.contact.trim() : '';
  if (contact && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact)) {
    problems.push('that does not look like an email address');
  }
  return problems;
}

/**
 * The payload for one submission.
 *
 * The *message* is left as written — a report the author cannot recognise is
 * not a report — but everything the product adds around it is redacted, since
 * the URL is the one field known to be able to carry a recovery token.
 *
 * A contact address is included only when it was typed on purpose, and the
 * copy says what it will be used for.
 *
 * @param {{ category: string, message: string, contact?: string }} draft
 * @param {{ surface?: string, sceneId?: string, url?: string, release?: string, at?: number }} context
 */
export function buildFeedbackPayload(draft, context = {}) {
  const message = String(draft.message ?? '').trim().slice(0, MAX_FEEDBACK_LENGTH);
  return {
    category: draft.category,
    message,
    contact: draft.contact?.trim() || null,
    surface: context.surface ?? 'landing',
    scene: context.sceneId ?? null,
    // Not the live URL: a scene route is useful, a hash full of tokens is not.
    route: redactText(context.route ?? ''),
    release: context.release ?? 'dev',
    at: context.at ?? Date.now(),
  };
}

/**
 * @param {object} options
 * @param {HTMLElement} options.ui
 * @param {string} [options.surface]
 * @param {string} [options.sceneId]
 * @param {(payload: object) => Promise<void>} [options.submit] transport; mail link when absent
 * @param {object} [options.telemetry]
 */
export function createFeedbackPanel({
  ui,
  surface = 'landing',
  sceneId = null,
  submit = null,
  telemetry = null,
}) {
  let open = false;
  const draft = { category: 'bug', message: '', contact: '' };

  const problems = el('p', { class: 'feedback-problems', role: 'alert', hidden: 'hidden' });
  const status = el('p', { class: 'feedback-status', role: 'status' });

  const categoryField = el(
    'div',
    { class: 'feedback-categories', role: 'radiogroup', 'aria-label': 'Feedback type / 種類' },
    FEEDBACK_CATEGORIES.map((entry) =>
      el(
        'button',
        {
          class: 'feedback-category',
          type: 'button',
          role: 'radio',
          'aria-checked': entry.id === draft.category ? 'true' : 'false',
          dataset: { category: entry.id },
          on: {
            click: () => {
              draft.category = entry.id;
              for (const node of categoryField.children) {
                node.setAttribute('aria-checked', node.dataset.category === entry.id ? 'true' : 'false');
              }
            },
          },
        },
        [el('span', { class: 'lang-en', text: entry.en }), el('span', { class: 'lang-ja', text: entry.ja })]
      )
    )
  );

  const messageField = el('textarea', {
    class: 'feedback-message',
    rows: '5',
    maxlength: String(MAX_FEEDBACK_LENGTH),
    'aria-label': 'What happened? / 何が起きましたか？',
    placeholder: 'What happened? / 何が起きましたか？',
    on: {
      input: (event) => {
        draft.message = event.target.value;
      },
    },
  });

  const contactField = el('input', {
    class: 'feedback-contact',
    type: 'email',
    autocomplete: 'email',
    'aria-label': 'Email, only if you want a reply / 返信が必要な場合のみメールアドレス',
    placeholder: 'Email (optional) / メール（任意）',
    on: {
      input: (event) => {
        draft.contact = event.target.value;
      },
    },
  });

  const submitButton = el(
    'button',
    { class: 'feedback-submit primary', type: 'submit' },
    [el('span', { class: 'lang-en', text: 'Send' }), el('span', { class: 'lang-ja', text: '送信' })]
  );

  const form = el(
    'form',
    {
      class: 'feedback-form',
      on: {
        submit: (event) => {
          event.preventDefault();
          void send();
        },
      },
    },
    [
      categoryField,
      messageField,
      contactField,
      el('p', { class: 'feedback-privacy' }, [
        el('span', {
          class: 'lang-en',
          text:
            'What you write here goes to the team as written. An address is used to reply and nothing else. ' +
            'Please do not include information that identifies a patient.',
        }),
        el('span', {
          class: 'lang-ja',
          text:
            'ここに書かれた内容はそのまま開発チームに届きます。メールアドレスは返信にのみ使用します。' +
            '患者個人を特定できる情報は書かないでください。',
        }),
      ]),
      problems,
      el('div', { class: 'feedback-actions' }, [
        el(
          'button',
          { class: 'feedback-cancel', type: 'button', on: { click: () => panel.close() } },
          [el('span', { class: 'lang-en', text: 'Cancel' }), el('span', { class: 'lang-ja', text: '閉じる' })]
        ),
        submitButton,
      ]),
      status,
    ]
  );

  const dialog = el(
    'div',
    {
      class: 'feedback-dialog panel',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': 'Send feedback / フィードバックを送る',
    },
    [
      el('h2', { class: 'feedback-title' }, [
        el('span', { class: 'lang-en', text: 'Tell us what went wrong' }),
        el('span', { class: 'lang-ja', text: '気づいたことを教えてください' }),
      ]),
      form,
    ]
  );

  const overlay = el(
    'div',
    { class: 'feedback-overlay', hidden: 'hidden', on: { click: (event) => {
      if (event.target === overlay) panel.close();
    } } },
    [dialog]
  );

  const trigger = el(
    'button',
    {
      class: 'feedback-trigger',
      type: 'button',
      'aria-haspopup': 'dialog',
      on: { click: () => panel.open() },
    },
    [el('span', { class: 'lang-en', text: 'Feedback' }), el('span', { class: 'lang-ja', text: 'ご意見' })]
  );

  const onKeydown = (event) => {
    if (event.key === 'Escape' && open) panel.close();
  };

  async function send() {
    const found = validateFeedback(draft);
    problems.hidden = found.length === 0;
    problems.textContent = found.join(' · ');
    if (found.length) return false;

    const payload = buildFeedbackPayload(draft, {
      surface,
      sceneId,
      route: typeof window === 'undefined' ? '' : window.location.hash,
    });

    submitButton.disabled = true;
    try {
      if (submit) await submit(payload);
      else openMailFallback(payload);
      // The metric records that feedback happened, never what it said.
      telemetry?.record('feedback.submitted', {
        surface,
        category: draft.category,
        ...(sceneId ? { scene: sceneId } : {}),
      });
      status.textContent = 'Thank you — sent. / 送信しました。ありがとうございます。';
      messageField.value = '';
      draft.message = '';
      setTimeout(() => panel.close(), 1200);
      return true;
    } catch {
      status.textContent =
        'Could not send. Please try again, or email us. / 送信できませんでした。時間をおいて再度お試しください。';
      return false;
    } finally {
      submitButton.disabled = false;
    }
  }

  const panel = {
    element: overlay,
    trigger,
    get isOpen() {
      return open;
    },
    open() {
      if (open) return;
      open = true;
      overlay.hidden = false;
      document.addEventListener('keydown', onKeydown);
      messageField.focus();
    },
    close() {
      if (!open) return;
      open = false;
      overlay.hidden = true;
      status.textContent = '';
      problems.hidden = true;
      document.removeEventListener('keydown', onKeydown);
      trigger.focus();
    },
    /** Exposed for tests and for a caller that wants to submit without the form. */
    send,
    dispose() {
      document.removeEventListener('keydown', onKeydown);
      overlay.remove();
      trigger.remove();
    },
  };

  ui.append(overlay);
  return panel;
}

/**
 * With no endpoint configured, compose a mail message rather than lose what
 * somebody wrote. The body is what they typed; the subject carries the
 * category so it can be triaged without opening it.
 */
function openMailFallback(payload) {
  const subject = `Medical 3D Lab feedback — ${payload.category}`;
  const body = [payload.message, '', `route: ${payload.route || '(none)'}`, `surface: ${payload.surface}`].join('\n');
  const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.open(href, '_blank', 'noopener');
}
