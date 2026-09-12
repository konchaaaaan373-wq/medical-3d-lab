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
export function credentialModePolicy(mode) {
  const signUp = mode === CREDENTIAL_MODE.SIGN_UP;
  return Object.freeze({
    mode: signUp ? CREDENTIAL_MODE.SIGN_UP : CREDENTIAL_MODE.SIGN_IN,
    /** A new account must never be offered the saved password for an old one. */
    passwordAutocomplete: signUp ? 'new-password' : 'current-password',
    // Short UI chrome in this product carries both languages in one string.
    // `lang-en` / `lang-ja` spans are for content: in `data-lang='both'` the
    // spans both render, which on a button reads "Sign in ログイン".
    submitLabel: signUp ? 'Create account / 新規登録' : 'Sign in / ログイン',
    busyLabel: signUp ? 'Creating account… / 登録中…' : 'Signing in… / ログイン中…',
    /** The mode the switch link moves to. */
    switchTo: signUp ? CREDENTIAL_MODE.SIGN_IN : CREDENTIAL_MODE.SIGN_UP,
    switchLabel: signUp
      ? 'Already have an account? Sign in / アカウントをお持ちの方はログイン'
      : 'New here? Create an account / はじめての方は新規登録',
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
    placeholder: 'email@example.com',
    'aria-label': 'Email / メールアドレス',
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
    placeholder: `Password (${MIN_PASSWORD_LENGTH}+ characters)`,
    'aria-label': 'Password / パスワード',
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
    'aria-label': policy.submitLabel,
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
        text: busy ? policy.busyLabel : policy.submitLabel,
      }),
    ]),
    el('div', { class: 'access-credentials-switch' }, [
      el('button', {
        class: 'access-text-button access-switch-mode',
        type: 'button',
        disabled: busy ? '' : null,
        text: policy.switchLabel,
        on: { click: () => onSwitchMode(policy.switchTo) },
      }),
    ]),
    policy.offersPasswordReset
      ? el('button', {
          class: 'access-text-button access-forgot',
          type: 'button',
          disabled: busy ? '' : null,
          text: 'Forgot password? / パスワードを忘れた',
          on: { click: () => onForgotPassword(String(email.value ?? '').trim()) },
        })
      : null,
    notice ? el('p', { class: 'access-form-message', role: 'status', text: notice }) : null,
    error ? el('p', { class: 'access-error', role: 'alert', text: error }) : null,
  ].filter(Boolean));
}
