import test from 'node:test';
import assert from 'node:assert/strict';
import { billingDate, primarySubscription, subscriptionPresentation } from '../src/access/subscriptionView.js';

test('subscription view: chooses a live lifecycle ahead of terminal history', () => {
  const canceled = { entitlement: 'patient', status: 'canceled' };
  const active = { entitlement: 'complete', status: 'active' };
  assert.equal(primarySubscription([canceled, active]), active);
});

test('subscription view: active complete plan shows renewal context', () => {
  const view = subscriptionPresentation([
    {
      entitlement: 'complete',
      status: 'active',
      current_period_end: '2026-09-30T13:11:56.000Z',
      cancel_at_period_end: false,
    },
  ]);
  assert.equal(view.plan.en, 'Complete');
  assert.equal(view.plan.ja, '両方');
  assert.equal(view.status.en, 'Active');
  assert.equal(view.grantsAccess, true);
  assert.equal(view.date, '2026-09-30');
  assert.match(view.detail.en, /2026-09-30/);
});

test('subscription view: period-end cancellation retains access and states the end date', () => {
  const view = subscriptionPresentation([
    {
      entitlement: 'patient',
      status: 'active',
      current_period_end: '2026-09-30T13:11:56.000Z',
      cancel_at_period_end: true,
    },
  ]);
  assert.equal(view.status.en, 'Scheduled to cancel');
  assert.equal(view.status.ja, '解約予定');
  assert.equal(view.grantsAccess, true);
  assert.match(view.detail.ja, /2026-09-30/);
});

test('subscription view: canceled subscription never implies remaining paid access', () => {
  const view = subscriptionPresentation([
    {
      entitlement: 'complete',
      status: 'canceled',
      current_period_end: '2026-09-30T13:11:56.000Z',
      cancel_at_period_end: false,
    },
  ]);
  assert.equal(view.grantsAccess, false);
  assert.equal(view.status.en, 'Canceled');
  assert.doesNotMatch(view.detail.en, /through 2026/);
});

test('subscription view: past_due is visible as payment issue while policy grace remains active', () => {
  const view = subscriptionPresentation([{ entitlement: 'education', status: 'past_due' }]);
  assert.equal(view.grantsAccess, true);
  assert.equal(view.status.tone, 'warn');
  assert.match(view.status.en, /Payment issue/);
});

test('subscription view: date formatting is stable and invalid values are ignored', () => {
  assert.equal(billingDate('2026-09-30T13:11:56.000Z'), '2026-09-30');
  assert.equal(billingDate('not-a-date'), null);
  assert.equal(billingDate(null), null);
});
