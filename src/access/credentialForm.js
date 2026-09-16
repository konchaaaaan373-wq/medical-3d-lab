/**
 * The sign-in / create-account form.
 *
 * Split out of `AccessManager` for one reason: the form is the only part of the
 * access layer a person touches before they have an account, and it was the
 * only part that could not be tested. `AccessManager` reads `import.meta.env`
 * at module load, so under `node --test` it is permanently "not configured" and
 * the credential form is never built. A pure view function, handed its state
 * and its callbacks, is testable without a Supabase deployment.
 *
 * This module owns the *shape* of the form only. Every network call, and all
 * of the session state, stays in `AccessManager`.
 *
 * ## Why the form has a mode
 *
 * It used to show `Sign in` and `Create account` as two equally weighted
 * buttons over one password field. A form built that way cannot answer the
 * questions a credential form has to answer, because it does not know which of
 * the two people is in front of it:
 *
 *   - which password `autocomplete` applies (offering a *saved* password to
 *     somebody creating an account is wrong, and it also stops the browser
 *     offering to save the new one),
 *   - what Enter should do,
 *   - which verb belongs in a failure message,
 *   - whether `Forgot password?` is even meaningful.
 *
 * So the dialog picks one at a time and says which it is. Returning visitors
 * are the common case and are what it opens on.
 */

import { el } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';

/** @typedef {'signin'|'signup'} CredentialMode */

export const CREDENTIAL_MODE = Object.freeze({
  SIGN_IN: 'signin',
  SIGN_UP: 'signup',
});

/**
 * The shortest password this product accepts.
 *
 * Supabase's own default is lower. Keep the stricter number here and in the
 * `minlength` attribute so the browser and the submit handler agree.
 */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Everything that differs between signing in and signing up, in one place.
 *
 * Kept as data, and pure, so a test can assert that a person creating an
 * account is never offered their old password — the kind of detail that is
 * invisible in review and only shows up in a password manager.
 *
 * @param {CredentialMode} mode
 */
/**
 * A label in both languages, as the pair of spans the stylesheet expects.
 *
 * @param {{en: string, ja: string}} label
 */
const dual = (label) => [
  el('span', { class: 'lang-en', text: label.en }),
  el('span', { class: 'lang-ja', text: label.ja }),
];

export function credentialModePolicy(mode) {
  const signUp = mode === CREDENTIAL_MODE.SIGN_UP;
  return Object.freeze({
    mode: signUp ? CREDENTIAL_MODE.SIGN_UP : CREDENTIAL_MODE.SIGN_IN,
    /** A new account must never be offered the saved password for an old one. */
    passwordAutocomplete: signUp ? 'new-password' : 'current-password',
    // One label per language, not one string carrying both.
    //
    // These used to be written "Sign in / ログイン", from a time when the
    // interface had a `both` mode that rendered the two `lang-` spans together.
    // It has not had one for a long time — the toggle is Japanese *or* English —
    // so the slash was showing every Japanese reader an English label with a
    // Japanese one appended, which is what a device pass on a phone reported:
    // a Japanese interface whose sign-in dialog was in English.
    submitLabel: signUp
      ? { en: 'Create account', ja: '新規登録' }
      : { en: 'Sign in', ja: 'ログイン' },
    busyLabel: signUp
      ? { en: 'Creating account…', ja: '登録中…' }
      : { en: 'Signing in…', ja: 'ログイン中…' },
    /** The mode the switch link moves to. */
    switchTo: signUp ? CREDENTIAL_MODE.SIGN_IN : CREDENTIAL_MODE.SIGN_UP,
    switchLabel: signUp
      ? { en: 'Already have an account? Sign in', ja: 'アカウントをお持ちの方はログイン' }
      : { en: 'New here? Create an account', ja: 'はじめての方は新規登録' },
    /** Only a returning visitor can have a password to have forgotten. */
    offersPasswordReset: !signUp,
    /** The fallback when the server gives us no message of its own. */
    failure: signUp ? 'アカウントを作成できませんでした。' : 'ログインできませんでした。',
    incomplete: `メールアドレスと${MIN_PASSWORD_LENGTH}文字以上のパスワードを入力してください。`,
  });
}

/**
 * Build the credential form.
 *
 * A real `<form>`: Enter submits it, and `required` / `minlength` / `type=email`
 * become the browser's own first check rather than decoration. The previous
 * version was a `<div>` of `type="button"` buttons, so typing an address and a
 * password and pressing Enter did nothing at all.
 *
 * @param {{
 *   mode: CredentialMode,
 *   email?: string,
 *   loading?: boolean,
 *   notice?: string,
 *   error?: string,
 *   onSubmit: (credentials: {mode: CredentialMode, email: string, password: string}) => void,
 *   onSwitchMode: (mode: CredentialMode) => void,
 *   onForgotPassword: (email: string) => void,
 *   onEmailInput?: (email: string) => void,
 *   pendingConfirmation?: string|null,
 *   onResendConfirmation?: (email: string) => void,
 * }} options
 */
export function credentialForm({
  mode,
  email: initialEmail = '',
  loading = false,
  notice = '',
  error = '',
  onSubmit,
  onSwitchMode,
  onForgotPassword,
  onEmailInput = () => {},
  pendingConfirmation = null,
  onResendConfirmation = () => {},
}) {
  const policy = credentialModePolicy(mode);
  const busy = Boolean(loading);

  const email = el('input', {
    class: 'access-input',
    type: 'email',
    name: 'email',
    autocomplete: 'email',
    autocapitalize: 'none',
    spellcheck: 'false',
    // An attribute cannot carry two languages the way a pair of spans can, so
    // it is written in the one on screen. The dialog is modal, so the language
    // cannot change underneath it while it is open.
    placeholder: inLanguage('email@example.com', 'メールアドレス'),
    'aria-label': inLanguage('Email', 'メールアドレス'),
    required: '',
    // Deliberately still enabled while a request is in flight. A disabled field
    // cannot hold focus, so disabling it here drops the keyboard out of the
    // dialog for the duration of the request — and it lets somebody start
    // correcting the typo they have already spotted. A second submit is barred
    // by the disabled button and by the `busy` guard below, not by this.
    // Re-rendering rebuilds this element, so the address has to be kept
    // somewhere that survives it — otherwise switching mode, or any refresh,
    // silently empties a field the person had already filled in.
    on: { input: (event) => onEmailInput(event.target.value) },
  });
  email.value = initialEmail;

  const password = el('input', {
    class: 'access-input',
    type: 'password',
    name: 'password',
    autocomplete: policy.passwordAutocomplete,
    placeholder: inLanguage(
      `Password (${MIN_PASSWORD_LENGTH}+ characters)`,
      `パスワード（${MIN_PASSWORD_LENGTH}文字以上）`
    ),
    'aria-label': inLanguage('Password', 'パスワード'),
    minlength: String(MIN_PASSWORD_LENGTH),
    required: '',
  });

  const submit = (event) => {
    event?.preventDefault?.();
    if (busy) return;
    onSubmit({
      mode: policy.mode,
      email: String(email.value ?? '').trim(),
      password: String(password.value ?? ''),
    });
  };

  return el('form', {
    class: `access-auth access-credentials is-${policy.mode}`,
    // `preventDefault` is the first line of the submit handler, so the document
    // never actually posts anything — Supabase is what receives these. `method`
    // is still POST rather than the GET default: if a native submit ever did
    // escape, credentials belong in a request body and never in a URL, where
    // they would reach history, referrers and access logs. An empty `action` is
    // invalid HTML, so it is absent; absent already means "this URL".
    // `novalidate` is deliberately absent too — the browser's own check on
    // `required` / `type=email` is wanted here.
    method: 'post',
    'aria-label': inLanguage(policy.submitLabel.en, policy.submitLabel.ja),
    on: { submit },
  }, [
    el('p', {
      class: 'access-copy lang-en',
      text: 'One account keeps your purchases on every device. Free models do not require an account.',
    }),
    el('p', {
      class: 'access-copy lang-ja',
      text: '購入した利用権を端末間で共有するためのアカウントです。無料モデルはログイン不要です。',
    }),
    email,
    password,
    el('div', { class: 'access-auth-actions is-single' }, [
      el('button', {
        class: 'access-primary access-credentials-submit',
        type: 'submit',
        disabled: busy ? '' : null,
      }, dual(busy ? policy.busyLabel : policy.submitLabel)),
    ]),
    // Opened in a new tab, not this one: the app answers a hashchange on the
    // landing route by reloading itself, so following these in place threw
    // away the address and password already typed — sending somebody to read
    // what they are agreeing to should not cost them the form.
    //
    // Shown when creating an account, because that is the moment being agreed
    // to. A statement with links rather than a required checkbox: the account
    // itself is free, and a tick-box adds friction without adding consent that
    // the act of registering does not already carry. If an explicit tick is
    // ever wanted, this is the place it goes.
    policy.mode === CREDENTIAL_MODE.SIGN_UP
      ? el('p', { class: 'access-legal-consent' }, [
          el('span', { class: 'lang-en' }, [
            'By creating an account you agree to the ',
            el('a', { class: 'access-legal-link', href: '#/terms', target: '_blank', rel: 'noopener', text: 'Terms' }),
            ' and the ',
            el('a', { class: 'access-legal-link', href: '#/privacy', target: '_blank', rel: 'noopener', text: 'Privacy Policy' }),
            '.',
          ]),
          el('span', { class: 'lang-ja' }, [
            '登録することで',
            el('a', { class: 'access-legal-link', href: '#/terms', target: '_blank', rel: 'noopener', text: '利用規約' }),
            'と',
            el('a', { class: 'access-legal-link', href: '#/privacy', target: '_blank', rel: 'noopener', text: 'プライバシーポリシー' }),
            'に同意したものとみなします。',
          ]),
        ])
      : null,
    el('div', { class: 'access-credentials-switch' }, [
      el('button', {
        class: 'access-text-button access-switch-mode',
        type: 'button',
        disabled: busy ? '' : null,
        on: { click: () => onSwitchMode(policy.switchTo) },
      }, dual(policy.switchLabel)),
    ]),
    // Only after a sign-up this browser just made came back without a session —
    // which is only when the project confirms addresses by email. Somebody
    // whose mail went missing otherwise has no route but to register the same
    // address a second time.
    pendingConfirmation
      ? el('div', { class: 'access-confirmation-pending' }, [
          el('p', {
            class: 'access-copy lang-en',
            text: `No confirmation email at ${pendingConfirmation}? Check spam, or send it again.`,
          }),
          el('p', {
            class: 'access-copy lang-ja',
            text: `${pendingConfirmation} に確認メールが届かないときは、迷惑メールを確認するか、もう一度送信してください。`,
          }),
          el('button', {
            class: 'access-text-button access-resend-confirmation',
            type: 'button',
            disabled: busy ? '' : null,
            on: { click: () => onResendConfirmation(pendingConfirmation) },
          }, dual({ en: 'Resend confirmation email', ja: '確認メールを再送' })),
        ])
      : null,
    policy.offersPasswordReset
      ? el('button', {
          class: 'access-text-button access-forgot',
          type: 'button',
          disabled: busy ? '' : null,
          on: { click: () => onForgotPassword(String(email.value ?? '').trim()) },
        }, dual({ en: 'Forgot password?', ja: 'パスワードをお忘れですか？' }))
      : null,
    notice ? el('p', { class: 'access-form-message', role: 'status', text: notice }) : null,
    error ? el('p', { class: 'access-error', role: 'alert', text: error }) : null,
  ].filter(Boolean));
}
