import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  accessForScene,
  canAccess,
  ENTITLEMENT,
  grantsFromSubscriptions,
} from '../src/access/policy.js';
import { safeHash, verifyStripeSignature } from '../netlify/lib/billing.js';

test('access: accurate core scenes are free by default', () => {
  const access = accessForScene({});
  assert.equal(access.scene, ENTITLEMENT.FREE);
  assert.equal(access.patient, ENTITLEMENT.PATIENT);
  assert.equal(access.education, ENTITLEMENT.EDUCATION);
  assert.equal(canAccess([], access.scene), true);
  assert.equal(canAccess([], access.patient), false);
});

test('access: patient and education subscriptions grant only their own use case', () => {
  assert.deepEqual(
    grantsFromSubscriptions([{ entitlement: 'patient', status: 'active' }]).sort(),
    ['free', 'patient']
  );
  assert.deepEqual(
    grantsFromSubscriptions([{ entitlement: 'education', status: 'trialing' }]).sort(),
    ['education', 'free']
  );
});

test('access: complete grants both paid use cases', () => {
  assert.deepEqual(
    grantsFromSubscriptions([{ entitlement: 'complete', status: 'active' }]).sort(),
    ['education', 'free', 'patient']
  );
});

test('access: cancelled or incomplete subscriptions grant nothing paid', () => {
  const grants = grantsFromSubscriptions([
    { entitlement: 'patient', status: 'canceled' },
    { entitlement: 'education', status: 'incomplete' },
    { entitlement: 'complete', status: 'past_due' },
  ]);
  assert.deepEqual(grants, ['free']);
});

test('billing: return hashes cannot become arbitrary redirects', () => {
  assert.equal(safeHash('#/copd'), '#/copd');
  assert.equal(safeHash('#/portal-hypertension'), '#/portal-hypertension');
  assert.equal(safeHash('https://evil.example/'), '#/');
  assert.equal(safeHash('//evil.example'), '#/');
});

test('billing: Stripe webhook signature verifies the raw body and timestamp', () => {
  const secret = 'whsec_test';
  const body = JSON.stringify({ id: 'evt_123', type: 'customer.subscription.updated' });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${body}`, 'utf8')
    .digest('hex');
  assert.equal(verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, secret), true);
  assert.equal(verifyStripeSignature(`${body} `, `t=${timestamp},v1=${signature}`, secret), false);
});

test('billing: stale Stripe signatures are rejected', () => {
  const secret = 'whsec_test';
  const body = '{}';
  const timestamp = Math.floor(Date.now() / 1000) - 1000;
  const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  assert.equal(verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, secret), false);
});
