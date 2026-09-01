import test from 'node:test';
import assert from 'node:assert/strict';
import { subscriptionUserId } from '../netlify/lib/billing.js';

test('billing identity: durable Customer mapping outranks mutable subscription metadata', () => {
  assert.equal(subscriptionUserId('user_mapped', 'user_metadata'), 'user_mapped');
});

test('billing identity: metadata is only a fallback before a Customer mapping exists', () => {
  assert.equal(subscriptionUserId(null, 'user_metadata'), 'user_metadata');
  assert.equal(subscriptionUserId(undefined, 'user_metadata'), 'user_metadata');
});

test('billing identity: missing mapping and metadata fail closed', () => {
  assert.equal(subscriptionUserId(null, null), null);
  assert.equal(subscriptionUserId('', ''), null);
});
