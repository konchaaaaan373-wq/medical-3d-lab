import test from 'node:test';
import assert from 'node:assert/strict';

import { applyFinancialEvent, FINANCIAL_EVENTS } from '../netlify/lib/financialEvents.js';
import { ALERT_RULES } from '../netlify/lib/alerts.js';

test('financial events: all alerts are declared and full refunds suspend access', async () => {
  for (const type of FINANCIAL_EVENTS) assert.equal(typeof type, 'string');
  for (const alert of ['full_refund', 'partial_refund', 'dispute_opened', 'dispute_won', 'dispute_lost']) {
    assert.ok(alert in ALERT_RULES);
  }
  const calls = [];
  const result = await applyFinancialEvent(
    {
      type: 'charge.refunded',
      data: { object: { id: 'ch_123', amount: 1980, amount_refunded: 1980, invoice: 'in_123' } },
    },
    {
      mode: 'live',
      get: async (path) =>
        path.startsWith('invoices/')
          ? {
              period_end: Date.parse('2026-09-01T00:00:00.000Z') / 1000,
              parent: { subscription_details: { subscription: 'sub_123' } },
              lines: {
                data: [{
                  parent: {
                    type: 'subscription_item_details',
                    subscription_item_details: { subscription: 'sub_123' },
                  },
                  period: { end: Date.parse('2026-10-01T00:00:00.000Z') / 1000 },
                }],
              },
            }
          : { current_period_start: Date.parse('2026-09-01T00:00:00.000Z') / 1000 },
      admin: async (path, options) => {
        calls.push({ path, options });
        return [{}];
      },
      now: new Date('2026-09-04T00:00:00.000Z'),
    }
  );
  const write = calls.find((call) => call.options?.method === 'PATCH');
  assert.match(write.path, /stripe_mode=eq\.live/);
  assert.equal(write.options.body.access_suspended_reason, 'full_refund');
  assert.equal(write.options.body.full_refund_at, '2026-09-04T00:00:00.000Z');
  assert.equal(write.options.body.refund_state_event_at, '2026-09-04T00:00:00.000Z');
  assert.equal(result.reason, 'full_refund_suspended', 'invoice.period_end must not hide a current-period refund');
});

test('financial events: a refund for an older paid period does not suspend the current one', async () => {
  let writes = 0;
  const result = await applyFinancialEvent(
    {
      type: 'charge.refunded',
      data: { object: { amount: 1980, amount_refunded: 1980, invoice: 'in_old' } },
    },
    {
      mode: 'live',
      get: async (path) =>
        path.startsWith('invoices/')
          ? {
              period_end: Date.parse('2026-08-01T00:00:00.000Z') / 1000,
              subscription: 'sub_123',
              lines: {
                data: [{
                  type: 'subscription',
                  subscription: 'sub_123',
                  period: { end: Date.parse('2026-08-01T00:00:00.000Z') / 1000 },
                }],
              },
            }
          : { current_period_start: Date.parse('2026-09-01T00:00:00.000Z') / 1000 },
      admin: async () => {
        writes += 1;
        return [{}];
      },
    }
  );
  assert.equal(result.reason, 'historical_full_refund_recorded');
  assert.equal(writes, 0);
});

test('financial events: historical refund detection paginates past adjustment lines', async () => {
  const paths = [];
  let writes = 0;
  const result = await applyFinancialEvent(
    {
      type: 'charge.refunded',
      data: { object: { amount: 1980, amount_refunded: 1980, invoice: 'in_old' } },
    },
    {
      mode: 'test',
      get: async (path) => {
        paths.push(path);
        if (path === 'invoices/in_old') {
          return {
            id: 'in_old',
            subscription: 'sub_123',
            lines: { data: [{ id: 'il_adjustment' }], has_more: true },
          };
        }
        if (path.startsWith('invoices/in_old/lines?')) {
          return {
            data: [{
              id: 'il_subscription',
              type: 'subscription',
              subscription: 'sub_123',
              period: { end: Date.parse('2026-08-01T00:00:00.000Z') / 1000 },
            }],
            has_more: false,
          };
        }
        return { current_period_start: Date.parse('2026-09-01T00:00:00.000Z') / 1000 };
      },
      admin: async () => {
        writes += 1;
        return [{}];
      },
    }
  );

  assert.equal(result.reason, 'historical_full_refund_recorded');
  assert.ok(paths.some((path) => path.includes('starting_after=il_adjustment')));
  assert.equal(writes, 0);
});

test('financial events: a won dispute clears only a dispute suspension', async () => {
  const calls = [];
  const result = await applyFinancialEvent(
    { type: 'charge.dispute.closed', data: { object: { charge: 'ch_123', status: 'won' } } },
    {
      mode: 'test',
      get: async (path) =>
        path.startsWith('charges/')
          ? { invoice: 'in_123' }
          : { subscription: 'sub_123' },
      admin: async (path, options) => {
        calls.push({ path, options });
        return [{}];
      },
    }
  );
  assert.equal(result.reason, 'dispute_won_restored');
  const stateWrite = calls.find((call) => call.options?.body?.dispute_state_event_at);
  assert.equal(stateWrite.options.body.dispute_opened_at, null);
  const legacyWrite = calls.find((call) => call.path.includes('access_suspended_reason=eq.dispute'));
  assert.equal(legacyWrite.options.body.access_suspended_reason, null);
});

test('financial events: an older dispute event cannot re-suspend after a newer close', async () => {
  const writes = [];
  const result = await applyFinancialEvent(
    {
      type: 'charge.dispute.created',
      created: Date.parse('2026-09-04T00:00:00.000Z') / 1000,
      data: { object: { charge: 'ch_123' } },
    },
    {
      mode: 'test',
      get: async (path) =>
        path.startsWith('charges/') ? { invoice: 'in_123' } : { subscription: 'sub_123' },
      admin: async (path, options = {}) => {
        if (!options.method) {
          return [{ dispute_state_event_at: '2026-09-04T00:01:00.000Z' }];
        }
        writes.push({ path, options });
        return [{}];
      },
    }
  );
  assert.equal(result.reason, 'stale_dispute_ignored');
  assert.equal(result.alert, undefined);
  assert.equal(writes.length, 0);
});

test('financial events: a confirmed missing Subscription still fails closed locally', async () => {
  const writes = [];
  const result = await applyFinancialEvent(
    {
      type: 'charge.refunded',
      created: Date.parse('2026-09-04T00:03:00.000Z') / 1000,
      data: { object: { amount: 1980, amount_refunded: 1980, invoice: 'in_123' } },
    },
    {
      mode: 'test',
      get: async (path) => {
        if (path.startsWith('invoices/')) return { subscription: 'sub_deleted' };
        const error = new Error('missing');
        error.code = 'resource_missing';
        throw error;
      },
      admin: async (_path, options = {}) => {
        if (!options.method) return [{ refund_state_event_at: null }];
        writes.push(options.body);
        return [{}];
      },
    }
  );
  assert.equal(result.reason, 'full_refund_suspended');
  assert.equal(writes[0].full_refund_at, '2026-09-04T00:03:00.000Z');
});
