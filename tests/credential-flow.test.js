/**
 * The sign-in / create-account flow.
 *
 * This is the one form a person meets before they have an account, and until
 * these tests it had no coverage at all: `AccessManager` reads `import.meta.env`
 * at module load, so under `node --test` it is permanently "not configured" and
 * never builds the form. `credentialForm` is the pure view it now delegates to,
 * which is what makes the flow assertable here.
 *
 * What is being pinned down is mostly invisible in review — which password a
 * password manager is asked for, whether Enter does anything — and every one of
 * these was wrong before.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CREDENTIAL_MODE,
  MIN_PASSWORD_LENGTH,
  credentialForm,
  credentialModePolicy,
} from '../src/access/credentialForm.js';
import { readFileSync } from 'node:fs';
import { findByClass, installFakeDocument } from './helpers/fake-dom.js';

const noop = () => {};

/** Every text node under an element, in order. */
function collectText(node, out = []) {
  if (node?.textContent) out.push(node.textContent);
  for (const child of node?.children ?? []) collectText(child, out);
  return out;
}

/** The two language spans of a label, as `[en, ja]`. */
function labelPair(node) {
  const spans = (node?.children ?? []).filter((child) => child.className?.includes?.('lang-'));
  const find = (lang) => spans.find((span) => span.className.includes(`lang-${lang}`))?.textContent ?? '';
  return [find('en'), find('ja')];
}

/** Build the form under a fake document, and hand back the pieces tests poke. */
function mount(overrides = {}) {
  const restore = installFakeDocument();
  try {
    const calls = { submitted: [], switched: [], forgot: [], typed: [] };
    const root = credentialForm({
      mode: CREDENTIAL_MODE.SIGN_IN,
      onSubmit: (credentials) => calls.submitted.push(credentials),
      onSwitchMode: (mode) => calls.switched.push(mode),
      onForgotPassword: (email) => calls.forgot.push(email),
      onEmailInput: (value) => calls.typed.push(value),
      ...overrides,
    });
    const [email, password] = findByClass(root, 'access-input');
    return {
      root,
      email,
      password,
      calls,
      submitButton: findByClass(root, 'access-credentials-submit')[0],
      switchButton: findByClass(root, 'access-switch-mode')[0],
      forgotButton: findByClass(root, 'access-forgot')[0],
    };
  } finally {
    restore();
  }
}

test('credential mode: creating an account is never offered the saved password', () => {
  // A password manager reads `autocomplete`. `current-password` on a sign-up
  // field offers the password for an account that does not exist yet, and stops
  // the browser offering to save the one being chosen.
  assert.equal(
    credentialModePolicy(CREDENTIAL_MODE.SIGN_UP).passwordAutocomplete,
    'new-password'
  );
  assert.equal(
    credentialModePolicy(CREDENTIAL_MODE.SIGN_IN).passwordAutocomplete,
    'current-password'
  );
});

test('credential mode: only a returning visitor is offered password recovery', () => {
  assert.equal(credentialModePolicy(CREDENTIAL_MODE.SIGN_IN).offersPasswordReset, true);
  assert.equal(credentialModePolicy(CREDENTIAL_MODE.SIGN_UP).offersPasswordReset, false);
});

test('credential mode: a failed sign-up does not report a failed sign-in', () => {
  // The fallback copy used to be "ログインできませんでした。" for both, so a
  // rejected registration told the person their *login* had failed.
  assert.match(credentialModePolicy(CREDENTIAL_MODE.SIGN_UP).failure, /作成/);
  assert.match(credentialModePolicy(CREDENTIAL_MODE.SIGN_IN).failure, /ログイン/);
  assert.notEqual(
    credentialModePolicy(CREDENTIAL_MODE.SIGN_UP).failure,
    credentialModePolicy(CREDENTIAL_MODE.SIGN_IN).failure
  );
});

test('credential mode: an unknown mode falls back to signing in, not to signing up', () => {
  // Whatever goes wrong upstream, the safe reading of an unrecognised mode is
  // the one that does not create an account.
  const policy = credentialModePolicy(undefined);
  assert.equal(policy.mode, CREDENTIAL_MODE.SIGN_IN);
  assert.equal(policy.passwordAutocomplete, 'current-password');
});

test('credential form: it is a real form, so Enter submits it', () => {
  // The regression this exists for: the form was a <div> of type="button"
  // buttons, so typing an address and a password and pressing Enter did
  // nothing whatsoever.
  const { root, email, password, calls } = mount();
  assert.equal(root.tagName, 'FORM');

  email.value = '  reader@example.test  ';
  password.value = 'correct-horse';
  root.dispatchEvent({ type: 'submit' });

  assert.deepEqual(calls.submitted, [
    { mode: CREDENTIAL_MODE.SIGN_IN, email: 'reader@example.test', password: 'correct-horse' },
  ]);
});

test('credential form: the button submits the form rather than handling a click', () => {
  const { submitButton } = mount();
  assert.equal(submitButton.getAttribute('type'), 'submit');
});

test('credential form: the browser is given something to validate', () => {
  // `required` / `minlength` / `type=email` were present before but inert,
  // because nothing they hang off ever submitted.
  const { email, password } = mount();
  assert.equal(email.getAttribute('type'), 'email');
  assert.equal(email.getAttribute('required'), '');
  assert.equal(password.getAttribute('required'), '');
  assert.equal(password.getAttribute('minlength'), String(MIN_PASSWORD_LENGTH));
});

test('credential form: the fields are named, so a password manager can store them', () => {
  const { email, password } = mount();
  assert.equal(email.getAttribute('name'), 'email');
  assert.equal(password.getAttribute('name'), 'password');
  assert.equal(email.getAttribute('autocomplete'), 'email');
});

test('credential form: sign-up mode asks for a new password and drops recovery', () => {
  const { password, forgotButton, submitButton } = mount({ mode: CREDENTIAL_MODE.SIGN_UP });
  assert.equal(password.getAttribute('autocomplete'), 'new-password');
  assert.equal(forgotButton, undefined);
  assert.deepEqual(labelPair(submitButton), ['Create account', '新規登録']);
});

/* The dialog is the first thing a reader meets, and on a Japanese interface it
   was meeting them in English: every label was one string carrying both
   languages joined by a slash — "Sign in / ログイン" — from a time when the
   interface had a `both` mode that rendered the two `lang-` spans together. It
   has not had one for a long time, so the slash was not a bilingual label, it
   was an English label with a Japanese one appended. A device pass on an
   iPhone reported it as a Japanese product whose sign-in was in English. */
test('credential form: each label is one language, not two joined by a slash', () => {
  const { root, submitButton, switchButton, forgotButton, email, password } = mount();

  for (const [name, node] of [
    ['submit', submitButton],
    ['switch', switchButton],
    ['forgot', forgotButton],
  ]) {
    const [en, ja] = labelPair(node);
    assert.ok(en && ja, `the ${name} button carries a label in each language`);
    assert.doesNotMatch(en, /[ぁ-んァ-ヶ一-龠]/, `the ${name} button's English label is English`);
    assert.doesNotMatch(ja, /[A-Za-z]{3}/, `the ${name} button's Japanese label is Japanese`);
  }

  // Nothing anywhere in the form still joins the two with a slash.
  for (const text of collectText(root)) {
    assert.doesNotMatch(
      text,
      /[A-Za-z][^/]* \/ [ぁ-んァ-ヶ一-龠]/,
      `"${text}" carries both languages in one string`
    );
  }

  // The attributes cannot hold two languages, so they hold the one on screen.
  // The fake document has no `#ui`, which is the Japanese default.
  assert.equal(email.getAttribute('placeholder'), 'メールアドレス');
  assert.equal(email.getAttribute('aria-label'), 'メールアドレス');
  assert.match(password.getAttribute('placeholder'), /^パスワード（\d+文字以上）$/);
  assert.equal(password.getAttribute('aria-label'), 'パスワード');
});

test('credential form: submitting carries the mode it was shown in', () => {
  const { root, email, password, calls } = mount({ mode: CREDENTIAL_MODE.SIGN_UP });
  email.value = 'new@example.test';
  password.value = 'a-long-enough-one';
  root.dispatchEvent({ type: 'submit' });
  assert.equal(calls.submitted[0].mode, CREDENTIAL_MODE.SIGN_UP);
});

test('credential form: the switch offers the other mode, both ways', () => {
  const signIn = mount({ mode: CREDENTIAL_MODE.SIGN_IN });
  signIn.switchButton.click();
  assert.deepEqual(signIn.calls.switched, [CREDENTIAL_MODE.SIGN_UP]);

  const signUp = mount({ mode: CREDENTIAL_MODE.SIGN_UP });
  signUp.switchButton.click();
  assert.deepEqual(signUp.calls.switched, [CREDENTIAL_MODE.SIGN_IN]);
});

test('credential form: a typed address survives the re-render that switching causes', () => {
  // Switching mode re-renders the dialog. Without the address being held in
  // state and seeded back, the field the person had already filled in empties.
  const { email, calls } = mount({ email: 'kept@example.test' });
  assert.equal(email.value, 'kept@example.test');

  email.value = 'typed@example.test';
  email.dispatchEvent({ type: 'input', target: { value: 'typed@example.test' } });
  assert.deepEqual(calls.typed, ['typed@example.test']);
});

test('credential form: password recovery is asked for with the address on screen', () => {
  const { email, forgotButton, calls } = mount();
  email.value = '  forgot@example.test ';
  forgotButton.click();
  assert.deepEqual(calls.forgot, ['forgot@example.test']);
});

test('credential form: an in-flight request cannot be submitted a second time', () => {
  const { root, email, password, submitButton, calls } = mount({ loading: true });
  assert.equal(submitButton.disabled, true);

  email.value = 'reader@example.test';
  password.value = 'correct-horse';
  root.dispatchEvent({ type: 'submit' });
  assert.deepEqual(calls.submitted, [], 'a double submit would be a second signUp call');
});

test('credential form: resending is offered only while a sign-up awaits confirmation', () => {
  // The route back for somebody whose confirmation mail went missing. Offering
  // it unconditionally would be a button that does nothing on a project that
  // does not confirm addresses, so it appears only once a sign-up has actually
  // come back without a session.
  const idle = mount();
  assert.equal(findByClass(idle.root, 'access-resend-confirmation').length, 0);

  const waiting = mount({ pendingConfirmation: 'new@example.test' });
  const [resend] = findByClass(waiting.root, 'access-resend-confirmation');
  assert.ok(resend, 'a pending confirmation offers a resend');
  assert.match(findByClass(waiting.root, 'access-confirmation-pending')[0].children[1].textContent, /new@example\.test/);
});

test('credential form: resending uses the address that was signed up with', () => {
  // Not whatever is in the field now — the person may have started retyping.
  const calls = [];
  const restore = installFakeDocument();
  let root;
  try {
    root = credentialForm({
      mode: CREDENTIAL_MODE.SIGN_IN,
      pendingConfirmation: 'signed-up@example.test',
      onSubmit: noop,
      onSwitchMode: noop,
      onForgotPassword: noop,
      onResendConfirmation: (email) => calls.push(email),
    });
  } finally {
    restore();
  }
  const [email] = findByClass(root, 'access-input');
  email.value = 'something-else@example.test';
  findByClass(root, 'access-resend-confirmation')[0].click();
  assert.deepEqual(calls, ['signed-up@example.test']);
});

test('credential form: notice and error are announced, not just drawn', () => {
  const { root } = mount({ notice: 'confirm your address', error: 'that did not work' });
  assert.equal(findByClass(root, 'access-form-message')[0].getAttribute('role'), 'status');
  assert.equal(findByClass(root, 'access-error')[0].getAttribute('role'), 'alert');
});

test('account dialog: nothing after `return api` is a declaration that does not hoist', () => {
  // `createAccessManager` puts its whole implementation after `return api`, so
  // only hoisted declarations ever come into existence. A `const` arrow there
  // stays in the temporal dead zone for the life of the manager, and the call
  // site throws `ReferenceError` instead of running.
  //
  // That is not hypothetical: `billingNotice` was written that way and is
  // called on the signed-in branch of `dialogContent`, so opening the account
  // dialog while signed in threw and rendered nothing. It is invisible to
  // every test that cannot sign in, which is every test that is not a browser.
  const source = readFileSync(new URL('../src/access/AccessManager.js', import.meta.url), 'utf8');
  const tail = source.slice(source.indexOf('\n  return api;'));
  assert.ok(tail.length > 0, 'the manager still returns its api before its implementation');

  // Function-body level only: a `const` inside one of those functions is
  // indented further and is perfectly fine.
  const stranded = tail
    .split('\n')
    .filter((line) => /^ {2}(const|let|var) /.test(line))
    .map((line) => line.trim());

  assert.deepEqual(
    stranded,
    [],
    `unreachable declaration(s) after \`return api\` — make these \`function\` declarations:\n${stranded.join('\n')}`
  );
});

test('unconfirmed email: recognised by code, and by message as a fallback', async () => {
  // The realistic failure now that production confirms addresses: somebody
  // signs up, the mail is lost or delayed, they come back later and try to
  // sign in. Before this they were told "Email not confirmed" in English and
  // given no way to ask for the mail again — the resend only existed in the
  // same session as the sign-up.
  const { isUnconfirmedEmail } = await import('../src/access/auth.js');

  assert.equal(isUnconfirmedEmail({ code: 'email_not_confirmed' }), true, 'the code is the contract');
  assert.equal(isUnconfirmedEmail({ message: 'Email not confirmed' }), true, 'wording is the fallback');
  assert.equal(isUnconfirmedEmail({ message: 'Please confirm your email address' }), true);

  // A wrong password must not be mistaken for it: offering to resend a
  // confirmation would send somebody after the wrong thing entirely.
  assert.equal(isUnconfirmedEmail({ message: 'Invalid login credentials' }), false);
  assert.equal(isUnconfirmedEmail({ code: 'invalid_credentials' }), false);
  assert.equal(isUnconfirmedEmail(null), false);
  assert.equal(isUnconfirmedEmail({}), false);
});
