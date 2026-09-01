import test from 'node:test';
import assert from 'node:assert/strict';
import {
  consumePasswordRecoveryRedirect,
  recoverySessionFromHash,
} from '../src/access/auth.js';

test('auth recovery: only a recovery fragment becomes a session', () => {
  const hash = '#access_token=abc&refresh_token=def&expires_in=1800&type=recovery';
  assert.deepEqual(recoverySessionFromHash(hash, 1000), {
    access_token: 'abc',
    refresh_token: 'def',
    expires_at: 2800,
    user: null,
  });

  assert.equal(recoverySessionFromHash('#/heart-failure', 1000), null);
  assert.equal(recoverySessionFromHash('#access_token=abc&type=signup', 1000), null);
  assert.equal(recoverySessionFromHash('#type=recovery', 1000), null);
});

test('auth recovery: malformed expiry uses the safe default', () => {
  const session = recoverySessionFromHash('#access_token=abc&type=recovery&expires_in=oops', 5000);
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

  assert.equal(consumePasswordRecoveryRedirect({ location, history }), true);
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

  assert.equal(consumePasswordRecoveryRedirect({ location, history }), false);
  assert.equal(called, false);
});
