import test from 'node:test';
import assert from 'node:assert/strict';
import { consumeAuthRedirect } from '../src/access/auth.js';
import { authRedirectFromHash } from '../src/access/authRedirect.js';

test('auth redirect: a credentialled fragment is recognised, whatever it is for', () => {
  const hash = '#access_token=abc&refresh_token=def&expires_in=1800&type=recovery';
  assert.deepEqual(authRedirectFromHash(hash, 1000), {
    type: 'recovery',
    errorCode: null,
    session: { access_token: 'abc', refresh_token: 'def', expires_at: 2800, user: null },
  });

  // A confirmation link carries just as real a token, and is the one every new
  // account follows. Treating it as "not ours" left it in the address bar.
  const signup = authRedirectFromHash('#access_token=abc&type=signup', 1000);
  assert.equal(signup.type, 'signup');
  assert.equal(signup.session.access_token, 'abc');

  // A type this app has no opinion about is still not somewhere to leave a
  // live token, so it is recognised too and the caller decides what it means.
  assert.equal(authRedirectFromHash('#access_token=abc&type=magiclink', 1000).type, 'magiclink');

  // Ordinary routes, and fragments with nothing to protect, are left alone.
  assert.equal(authRedirectFromHash('#/heart-failure', 1000), null);
  assert.equal(authRedirectFromHash('#type=recovery', 1000), null, 'no token, nothing to consume');
  assert.equal(authRedirectFromHash('#access_token=abc', 1000), null, 'no type, not a redirect');
});

test('auth redirect: malformed expiry uses the safe default', () => {
  const { session } = authRedirectFromHash('#access_token=abc&type=recovery&expires_in=oops', 5000);
  assert.equal(session.expires_at, 8600);
});

test('auth recovery: consuming the fragment scrubs tokens from the visible URL immediately', () => {
  let replaced = '';
  const location = {
    hash: '#access_token=secret-access&refresh_token=secret-refresh&expires_in=3600&type=recovery',
    href: 'https://example.test/?account=recovery#access_token=secret-access&refresh_token=secret-refresh&expires_in=3600&type=recovery',
  };
  const history = {
    replaceState(_state, _title, value) {
      replaced = value;
    },
  };

  assert.equal(consumeAuthRedirect({ location, history }), 'recovery');
  assert.equal(replaced, '/?account=recovery#/');
  assert.equal(replaced.includes('secret-access'), false);
  assert.equal(replaced.includes('secret-refresh'), false);
});

test('auth recovery: normal scene hashes are never consumed', () => {
  let called = false;
  const location = {
    hash: '#/copd',
    href: 'https://example.test/#/copd',
  };
  const history = {
    replaceState() {
      called = true;
    },
  };

  assert.equal(consumeAuthRedirect({ location, history }), null);
  assert.equal(called, false);
});

test('auth redirect: a confirmation link leaves no token in the address bar', () => {
  // The path every new account takes now that the project confirms addresses.
  // It used to fall through to the router, which sends an unknown hash to the
  // default scene — so somebody finished registering on a 3D model with a live
  // access and refresh token still in the URL, ready to be screenshotted or
  // pasted into a message sharing the model.
  let replaced = '';
  const location = {
    hash: '#access_token=live-access&refresh_token=live-refresh&expires_in=3600&type=signup',
    href: 'https://example.test/#access_token=live-access&refresh_token=live-refresh&type=signup',
  };
  const history = { replaceState(_s, _t, value) { replaced = value; } };

  assert.equal(consumeAuthRedirect({ location, history }), 'signup');
  assert.equal(replaced, '/#/');
  assert.equal(replaced.includes('live-access'), false);
  assert.equal(replaced.includes('live-refresh'), false);
});

test('auth redirect: a link that failed is recognised, and carries no token', async () => {
  const { authRedirectFromHash } = await import('../src/access/authRedirect.js');
  // The commonest way an emailed link ends — expired, or already used. It looks
  // nothing like the others: no `type`, no token, just `error`. It was the one
  // case still falling through to the router, so somebody who clicked an
  // expired confirmation got a 3D model with the error still in the URL.
  const expired = authRedirectFromHash(
    '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
  );
  assert.equal(expired.type, 'error');
  assert.equal(expired.errorCode, 'otp_expired');
  assert.equal(expired.session, null, 'a failed link grants nothing');

  // `error` without a code still counts: the point is not to read it as a route.
  assert.equal(authRedirectFromHash('#error=server_error').type, 'error');
});

test('auth redirect: the failure reason is never taken from the URL as text', async () => {
  const { authRedirectFromHash } = await import('../src/access/authRedirect.js');
  // `error_description` is free text anybody who can get a link clicked may
  // choose. Echoing it would put their words inside this product's own dialog,
  // which is a phishing surface rather than an error message.
  const crafted = authRedirectFromHash(
    '#error=access_denied&error_code=otp_expired&error_description=Call+0800+000+000+to+restore+your+account'
  );
  assert.equal(crafted.errorCode, 'otp_expired');
  assert.equal(
    Object.values(crafted).some((value) => typeof value === 'string' && /0800/.test(value)),
    false,
    'nothing from error_description survives parsing'
  );
});

test('auth redirect: only the types this app can receive are adopted as a session', async () => {
  const { ADOPTABLE_REDIRECTS } = await import('../src/access/authRedirect.js');
  // Pinned in both directions. Dropping a type here silently stops that link
  // signing anybody in — for `recovery` that breaks password reset for every
  // user — and adding one signs people in on a link with no handling behind it.
  assert.deepEqual([...ADOPTABLE_REDIRECTS].sort(), ['email_change', 'recovery', 'signup']);
  for (const type of ['magiclink', 'invite', 'error', 'unknown']) {
    assert.equal(ADOPTABLE_REDIRECTS.has(type), false, `${type} must not be adopted`);
  }
});

test('auth redirect: an unadoptable fragment is still scrubbed, and still not stored', async () => {
  const { consumeAuthRedirect, getSession, signOut } = await import('../src/access/auth.js');
  signOut();
  let replaced = '';
  const location = {
    hash: '#access_token=live-token&expires_in=3600&type=magiclink',
    href: 'https://example.test/#access_token=live-token&type=magiclink',
  };
  const history = { replaceState(_s, _t, value) { replaced = value; } };

  assert.equal(consumeAuthRedirect({ location, history }), 'magiclink');
  assert.equal(replaced.includes('live-token'), false, 'scrubbing is unconditional');
  // The half the name promised and the test did not check: adopting is not.
  assert.equal(await getSession(), null, 'an unadoptable type grants no session');
});
