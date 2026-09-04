import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  checkoutIdempotencyKey,
  claimCheckoutAttempt,
} from '../netlify/lib/checkoutAttempts.js';
import { config as checkoutRateLimit } from '../netlify/functions/create-checkout.js';

const NOW = new Date('2026-09-04T00:00:00.000Z');

test('checkout attempts: concurrent identical requests converge on one attempt', async () => {
  let row = null;
  const admin = async (path, options = {}) => {
    if (options.method === 'POST') {
      if (row) return [];
      row = { ...options.body[0] };
      return [row];
    }
    if (!options.method) return row ? [row] : [];
    return [];
  };
  const first = await claimCheckoutAttempt({
    userId: '11111111-1111-1111-1111-111111111111',
    plan: 'complete',
    returnHash: '#/copd',
    mode: 'test',
    admin,
    now: NOW,
    attemptId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  });
  const second = await claimCheckoutAttempt({
    userId: '11111111-1111-1111-1111-111111111111',
    plan: 'complete',
    returnHash: '#/copd',
    mode: 'test',
    admin,
    now: NOW,
    attemptId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  });
  assert.equal(first.retry, false);
  assert.equal(second.retry, true);
  assert.equal(first.attemptId, second.attemptId);
  assert.equal(first.expiresAt, '2026-09-04T00:35:00.000Z');
  assert.equal(second.expiresAt, first.expiresAt);
});

test('checkout attempts: a different plan cannot overtake an active attempt', async () => {
  const row = {
    attempt_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    plan: 'patient',
    return_hash: '#/',
    status: 'acquired',
    expires_at: '2026-09-04T00:30:00.000Z',
  };
  const admin = async (_path, options = {}) => (options.method === 'POST' ? [] : [row]);
  const result = await claimCheckoutAttempt({
    userId: '11111111-1111-1111-1111-111111111111',
    plan: 'education',
    returnHash: '#/',
    mode: 'test',
    admin,
    now: NOW,
  });
  assert.deepEqual(result, { claimed: false, reason: 'different_attempt_in_progress' });
});

test('checkout attempts: Stripe key is stable per attempt and contains no user identity', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const attemptId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const key = checkoutIdempotencyKey(userId, 'test', attemptId);
  assert.equal(key, checkoutIdempotencyKey(userId, 'test', attemptId));
  assert.doesNotMatch(key, new RegExp(userId));
  assert.match(key, new RegExp(attemptId));
});

test('checkout attempts: endpoint is rate-limited and sends Stripe an idempotency key', () => {
  assert.deepEqual(checkoutRateLimit.rateLimit, {
    windowLimit: 6,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  });
  const source = readFileSync(new URL('../netlify/functions/create-checkout.js', import.meta.url), 'utf8');
  assert.match(source, /idempotencyKey: checkoutIdempotencyKey/);
  assert.match(source, /claimCheckoutAttempt/);
  assert.match(source, /expires_at: Math\.floor\(Date\.parse\(attempt\.expiresAt\)/);
});
