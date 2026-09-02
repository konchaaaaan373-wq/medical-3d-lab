import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  billingOperationsHealth,
  reconciliationBatchSize,
  reconciliationErrorCode,
  runBillingReconciliationBatch,
} from '../netlify/lib/billingOperations.js';
import { config as schedule } from '../netlify/functions/scheduled-billing-reconcile.js';
import { config as healthEndpoint } from '../netlify/functions/billing-operations-health.js';

const HEALTH_ENV = Object.freeze({
  CONTEXT: 'production',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example',
  SUPABASE_SECRET_KEY: 'sb_secret_example',
  STRIPE_SECRET_KEY: 'rk_live_example',
  STRIPE_WEBHOOK_SECRET: 'whsec_example',
  STRIPE_PRICE_PATIENT: 'price_patient',
  STRIPE_PRICE_EDUCATION: 'price_education',
  STRIPE_PRICE_COMPLETE: 'price_complete',
});

test('billing operations: production deploy includes an hourly bounded repair schedule', () => {
  assert.equal(schedule.schedule, '17 * * * *');
  const migration = readFileSync(
    new URL(
      '../supabase/migrations/20260902135238_billing_reconciliation_operations.sql',
      import.meta.url
    ),
    'utf8'
  );
  assert.match(migration, /billing_reconciliation_runs/);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all .* from public, anon, authenticated/i);
  assert.match(migration, /grant select, insert, update, delete .* to service_role/i);
});

test('billing operations: public health is read-only and rate-limited before reaching Supabase', () => {
  assert.equal(healthEndpoint.path, '/api/billing-health');
  assert.equal(healthEndpoint.method, 'GET');
  assert.deepEqual(healthEndpoint.rateLimit, {
    windowLimit: 12,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  });
});

test('billing operations: batch size is bounded for the scheduled function deadline', () => {
  assert.equal(reconciliationBatchSize(undefined), 3);
  assert.equal(reconciliationBatchSize('0'), 3);
  assert.equal(reconciliationBatchSize('5'), 5);
  assert.equal(reconciliationBatchSize('500'), 10);
});

test('billing operations: reconciliation rotates past failures and records only error codes', async () => {
  const calls = [];
  const customers = [
    { user_id: 'user_a', reconcile_failure_count: 1 },
    { user_id: 'user_b', reconcile_failure_count: 0 },
  ];
  const admin = async (path, options = {}) => {
    calls.push({ path, options });
    if (path.startsWith('billing_customers?select=')) return customers;
    return [];
  };

  const result = await runBillingReconciliationBatch({
    admin,
    reconcile: async (userId) => {
      if (userId === 'user_a') {
        const error = new Error('Stripe 429');
        error.status = 429;
        throw error;
      }
      return { reconciled: true };
    },
    now: new Date('2026-09-02T12:00:00.000Z'),
    clock: () => 100,
    runId: '00000000-0000-4000-8000-000000000001',
  });

  assert.deepEqual(result, {
    status: 'partial',
    selectedCount: 2,
    succeededCount: 1,
    failedCount: 1,
    deferredCount: 0,
  });
  const selection = calls.find((call) => call.path.startsWith('billing_customers?select='));
  assert.match(selection.path, /order=last_reconcile_attempt_at\.asc\.nullsfirst,user_id\.asc/);
  const abandonedRunCleanup = calls.find(
    (call) =>
      call.path.includes('billing_reconciliation_runs?status=eq.running') &&
      call.options.method === 'PATCH'
  );
  assert.deepEqual(abandonedRunCleanup.options.body, {
    status: 'failed',
    completed_at: '2026-09-02T12:00:00.000Z',
  });
  const failure = calls.find((call) => call.options.body?.reconcile_failure_count === 2);
  assert.equal(failure.options.body.last_reconcile_error_code, 'stripe_rate_limit');
  assert.equal(JSON.stringify(calls).includes('Stripe 429'), false);
});

test('billing operations: time budget defers remaining customers without marking them attempted', async () => {
  const calls = [];
  const ticks = [0, 0, 23_000, 23_000];
  const admin = async (path, options = {}) => {
    calls.push({ path, options });
    if (path.startsWith('billing_customers?select=')) {
      return [
        { user_id: 'user_a', reconcile_failure_count: 0 },
        { user_id: 'user_b', reconcile_failure_count: 0 },
      ];
    }
    return [];
  };
  const result = await runBillingReconciliationBatch({
    admin,
    reconcile: async () => ({ reconciled: true }),
    now: new Date('2026-09-02T12:00:00.000Z'),
    clock: () => ticks.shift() ?? 23_000,
    timeBudgetMs: 22_000,
    runId: '00000000-0000-4000-8000-000000000002',
  });

  assert.equal(result.succeededCount, 1);
  assert.equal(result.deferredCount, 1);
  assert.equal(
    calls.some((call) => call.path.includes('user_id=eq.user_b')),
    false
  );
});

test('billing operations: a marker write failure counts one customer only once', async () => {
  let markerFailed = false;
  const admin = async (path, options = {}) => {
    if (path.startsWith('billing_customers?select=')) {
      return [{ user_id: 'user_a', reconcile_failure_count: 0 }];
    }
    if (
      path.includes('user_id=eq.user_a') &&
      options.body?.reconcile_failure_count === 0 &&
      !markerFailed
    ) {
      markerFailed = true;
      throw new Error('Supabase marker write failed');
    }
    return [];
  };
  const result = await runBillingReconciliationBatch({
    admin,
    reconcile: async () => ({ reconciled: true }),
    now: new Date('2026-09-02T12:00:00.000Z'),
    clock: () => 100,
    runId: '00000000-0000-4000-8000-000000000003',
  });

  assert.equal(result.selectedCount, 1);
  assert.equal(result.succeededCount, 0);
  assert.equal(result.failedCount, 1);
  assert.equal(result.deferredCount, 0);
});

test('billing operations: health output is aggregate and privacy-safe', async () => {
  const now = new Date('2026-09-02T12:00:00.000Z');
  const admin = async (path) => {
    if (path.includes('status=eq.running')) return [];
    if (path.includes('billing_reconciliation_runs?status=neq.running')) {
      return [
        {
          status: 'succeeded',
          started_at: '2026-09-02T11:17:00.000Z',
          completed_at: '2026-09-02T11:17:05.000Z',
        },
      ];
    }
    if (path.includes('select=last_reconciled_at')) {
      return [{ last_reconciled_at: '2026-09-02T11:00:00.000Z' }];
    }
    return [];
  };
  const result = await billingOperationsHealth({ admin, environment: HEALTH_ENV, now });
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.checks, {
    configuration: true,
    scheduledReconciliation: true,
    webhookDelivery: true,
    customerReconciliation: true,
  });
  assert.doesNotMatch(JSON.stringify(result), /user_|cus_|sub_|@/);
});

test('billing operations: stale webhook work or customer failures degrade health', async () => {
  const admin = async (path) => {
    if (path.includes('status=eq.running')) return [];
    if (path.includes('billing_reconciliation_runs?status=neq.running')) {
      return [{ status: 'succeeded', completed_at: '2026-09-02T11:17:05.000Z' }];
    }
    if (path.includes('status=eq.failed')) return [{ stripe_event_id: 'redacted-by-health-layer' }];
    if (path.includes('reconcile_failure_count=gt.0')) return [{ user_id: 'redacted-by-health-layer' }];
    if (path.includes('select=last_reconciled_at')) return [{ last_reconciled_at: null }];
    return [];
  };
  const result = await billingOperationsHealth({
    admin,
    environment: HEALTH_ENV,
    now: new Date('2026-09-02T12:00:00.000Z'),
  });
  assert.equal(result.status, 'degraded');
  assert.equal(result.checks.webhookDelivery, false);
  assert.equal(result.checks.customerReconciliation, false);
  assert.doesNotMatch(JSON.stringify(result), /redacted/);
});

test('billing operations: only a complete customer sweep supersedes older webhook failures', async () => {
  const paths = [];
  const admin = async (path) => {
    paths.push(path);
    if (path.includes('status=eq.running')) return [];
    if (path.includes('billing_reconciliation_runs?status=neq.running')) {
      return [{ status: 'succeeded', completed_at: '2026-09-02T11:17:05.000Z' }];
    }
    if (path.includes('select=last_reconciled_at')) {
      return [{ last_reconciled_at: '2026-09-02T10:45:00.000Z' }];
    }
    return [];
  };

  const result = await billingOperationsHealth({
    admin,
    environment: HEALTH_ENV,
    now: new Date('2026-09-02T12:00:00.000Z'),
  });

  assert.equal(result.status, 'ok');
  const eventPaths = paths.filter((path) => path.startsWith('billing_events?'));
  assert.equal(eventPaths.length, 4);
  const reconcilablePaths = eventPaths.filter((path) => path.includes('event_type=in.'));
  assert.equal(reconcilablePaths.length, 2);
  assert.ok(
    reconcilablePaths.every((path) =>
      path.includes('last_attempt_at=gt.2026-09-02T10%3A45%3A00.000Z')
    )
  );
});

test('billing operations: a customer sweep cannot hide a non-reconcilable invoice failure', async () => {
  const admin = async (path) => {
    if (path.includes('status=eq.running')) return [];
    if (path.includes('billing_reconciliation_runs?status=neq.running')) {
      return [{ status: 'succeeded', completed_at: '2026-09-02T11:17:05.000Z' }];
    }
    if (path.includes('select=last_reconciled_at')) {
      return [{ last_reconciled_at: '2026-09-02T10:45:00.000Z' }];
    }
    if (path.includes('status=eq.failed') && path.includes('event_type=not.in.')) {
      return [{ stripe_event_id: 'not-returned-by-health' }];
    }
    return [];
  };

  const result = await billingOperationsHealth({
    admin,
    environment: HEALTH_ENV,
    now: new Date('2026-09-02T12:00:00.000Z'),
  });
  assert.equal(result.status, 'degraded');
  assert.equal(result.checks.webhookDelivery, false);
  assert.doesNotMatch(JSON.stringify(result), /not-returned/);
});

test('billing operations: a fresh running job keeps the latest successful health result', async () => {
  const paths = [];
  const admin = async (path) => {
    paths.push(path);
    if (path.includes('billing_reconciliation_runs?status=neq.running')) {
      return [{ status: 'succeeded', completed_at: '2026-09-02T11:17:05.000Z' }];
    }
    if (path.includes('status=eq.running')) return [];
    if (path.includes('select=last_reconciled_at')) {
      return [{ last_reconciled_at: '2026-09-02T11:00:00.000Z' }];
    }
    return [];
  };
  const result = await billingOperationsHealth({
    admin,
    environment: HEALTH_ENV,
    now: new Date('2026-09-02T12:00:00.000Z'),
  });

  assert.equal(result.status, 'ok');
  assert.ok(paths.some((path) => path.includes('status=neq.running')));
  assert.ok(
    paths.some((path) =>
      path.includes('status=eq.running&started_at=lte.2026-09-02T11%3A55%3A00.000Z')
    )
  );
});

test('billing operations: a stale running job degrades otherwise recent health', async () => {
  const admin = async (path) => {
    if (path.includes('billing_reconciliation_runs?status=neq.running')) {
      return [{ status: 'succeeded', completed_at: '2026-09-02T11:17:05.000Z' }];
    }
    if (path.includes('status=eq.running')) return [{ run_id: 'not-returned-by-health' }];
    if (path.includes('select=last_reconciled_at')) {
      return [{ last_reconciled_at: '2026-09-02T11:00:00.000Z' }];
    }
    return [];
  };
  const result = await billingOperationsHealth({
    admin,
    environment: HEALTH_ENV,
    now: new Date('2026-09-02T12:00:00.000Z'),
  });

  assert.equal(result.status, 'degraded');
  assert.equal(result.checks.scheduledReconciliation, false);
  assert.doesNotMatch(JSON.stringify(result), /not-returned/);
});

test('billing operations: common provider failures map to bounded codes', () => {
  assert.equal(reconciliationErrorCode({ status: 403 }), 'stripe_authorization');
  assert.equal(reconciliationErrorCode({ message: 'Supabase REST 500' }), 'supabase');
  assert.equal(reconciliationErrorCode(new Error('sensitive detail')), 'unknown');
});
