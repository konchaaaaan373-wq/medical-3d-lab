import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authRedirectFromHash,
  consumeAuthRedirect,
} from '../src/access/auth.js';

test('auth redirect: a credentialled fragment is recognised, whatever it is for', () => {
  const hash = '#access_token=abc&refresh_token=def&expires_in=1800&type=recovery';
  assert.deepEqual(authRedirectFromHash(hash, 1000), {
    type: 'recovery',
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
