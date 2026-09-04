import crypto from 'node:crypto';
import { billingConfiguration, billingStripeMode } from './billingConfiguration.js';
import { reconcileBillingForUser, stripeModeFilter, supabaseAdmin } from './billing.js';
import { cachedStripeCommerceReadiness } from './billingReadiness.js';

const DEFAULT_BATCH_SIZE = 3;
const MAX_BATCH_SIZE = 10;
const DEFAULT_TIME_BUDGET_MS = 22_000;
const RUN_FRESHNESS_MS = 3 * 60 * 60 * 1000;
const RUN_STALE_MS = 5 * 60 * 1000;
const EVENT_RECLAIM_MS = 5 * 60 * 1000;
const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
const RECONCILABLE_WEBHOOK_EVENTS = Object.freeze([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.paused',
  'customer.subscription.resumed',
]);

export function reconciliationBatchSize(value = process.env.BILLING_RECONCILE_BATCH_SIZE) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_BATCH_SIZE;
  return Math.min(parsed, MAX_BATCH_SIZE);
}

export function reconciliationErrorCode(error) {
  const status = Number(error?.status);
  const code = String(error?.code ?? '').toLowerCase();
  const message = String(error?.message ?? '').toLowerCase();
  if (status === 401 || status === 403) return 'stripe_authorization';
  if (status === 429 || code.includes('rate_limit')) return 'stripe_rate_limit';
  if (
    status >= 500 ||
    message.includes('stripe 5') ||
    error?.name === 'TimeoutError' ||
    message.includes('timed out')
  ) return 'stripe_unavailable';
  if (code === 'unsupported_price') return 'unsupported_price';
  if (['unknown_user', 'missing_local_subscription'].includes(code)) return 'billing_mapping';
  if (message.includes('missing server configuration')) return 'configuration';
  if (message.includes('supabase')) return 'supabase';
  if (message.includes('stabilis')) return 'stripe_state_churn';
  return 'unknown';
}

async function finishRun(admin, runId, mode, summary, now) {
  await admin(`billing_reconciliation_runs?run_id=eq.${encodeURIComponent(runId)}&${stripeModeFilter(mode)}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: {
      status: summary.status,
      selected_count: summary.selectedCount,
      succeeded_count: summary.succeededCount,
      failed_count: summary.failedCount,
      deferred_count: summary.deferredCount,
      completed_at: now.toISOString(),
    },
  });
}

async function retireAbandonedRuns(admin, mode, now) {
  const staleBefore = encodeURIComponent(new Date(now.getTime() - RUN_STALE_MS).toISOString());
  await admin(
    `billing_reconciliation_runs?${stripeModeFilter(mode)}&status=eq.running&started_at=lte.${staleBefore}`,
    {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: { status: 'failed', completed_at: now.toISOString() },
    }
  );
}

async function pruneCompletedOperations(admin, mode, now) {
  const before = encodeURIComponent(new Date(now.getTime() - RETENTION_MS).toISOString());
  await Promise.all([
    admin(`billing_reconciliation_runs?${stripeModeFilter(mode)}&completed_at=lt.${before}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    }),
    admin(`billing_events?livemode=eq.${mode === 'live'}&status=in.(processed,ignored)&processed_at=lt.${before}`, {
      method: 'DELETE',
      prefer: 'return=minimal',
    }),
  ]);
}

/**
 * Reconciles the least-recently-attempted customers within Netlify's 30-second
 * scheduled-function limit. Attempts are timestamped before Stripe is called,
 * so one broken customer cannot starve the rest of the queue on later runs.
 */
export async function runBillingReconciliationBatch({
  admin = supabaseAdmin,
  reconcile = null,
  mode = billingStripeMode(),
  now = new Date(),
  clock = () => Date.now(),
  batchSize = reconciliationBatchSize(),
  timeBudgetMs = DEFAULT_TIME_BUDGET_MS,
  runId = crypto.randomUUID(),
} = {}) {
  const reconcileCustomer = reconcile ?? ((userId) => reconcileBillingForUser(userId, { admin, mode }));
  const startedAt = clock();
  // A serverless worker can be killed before `finishRun`. The next invocation
  // retires those abandoned rows so a later healthy run can restore health
  // without a manual database edit.
  await retireAbandonedRuns(admin, mode, now);
  const selected =
    (await admin(
      `billing_customers?${stripeModeFilter(mode)}&select=user_id,reconcile_failure_count&order=last_reconcile_attempt_at.asc.nullsfirst,user_id.asc&limit=${batchSize}`
    )) ?? [];

  await admin('billing_reconciliation_runs', {
    method: 'POST',
    prefer: 'return=minimal',
    body: [
      {
        run_id: runId,
        stripe_mode: mode,
        source: 'scheduled',
        status: 'running',
        selected_count: selected.length,
        started_at: now.toISOString(),
      },
    ],
  });

  let succeededCount = 0;
  let failedCount = 0;
  let processedCount = 0;

  for (const customer of selected) {
    if (clock() - startedAt >= timeBudgetMs) break;
    processedCount += 1;
    const attemptAt = new Date(now.getTime() + processedCount - 1).toISOString();
    await admin(`billing_customers?user_id=eq.${encodeURIComponent(customer.user_id)}&${stripeModeFilter(mode)}`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: { last_reconcile_attempt_at: attemptAt },
    });

    try {
      const result = await reconcileCustomer(customer.user_id);
      if (!result?.reconciled) throw new Error('Billing customer could not be reconciled.');
      await admin(`billing_customers?user_id=eq.${encodeURIComponent(customer.user_id)}&${stripeModeFilter(mode)}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: { reconcile_failure_count: 0, last_reconcile_error_code: null },
      });
      succeededCount += 1;
    } catch (error) {
      failedCount += 1;
      await admin(`billing_customers?user_id=eq.${encodeURIComponent(customer.user_id)}&${stripeModeFilter(mode)}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: {
          reconcile_failure_count: Number(customer.reconcile_failure_count || 0) + 1,
          last_reconcile_error_code: reconciliationErrorCode(error),
        },
      });
    }
  }

  const deferredCount = selected.length - processedCount;
  const summary = {
    status: failedCount || deferredCount ? 'partial' : 'succeeded',
    selectedCount: selected.length,
    succeededCount,
    failedCount,
    deferredCount,
  };
  try {
    await pruneCompletedOperations(admin, mode, now);
  } catch {
    // Reconciliation is still useful, but retention failure must be visible to
    // the run ledger and health check instead of being silently reported green.
    summary.status = 'partial';
    summary.maintenanceFailed = true;
  }
  await finishRun(admin, runId, mode, summary, new Date(now.getTime() + Math.max(1, clock() - startedAt)));
  return Object.freeze(summary);
}

/** Returns only operational booleans/timestamps; no customer or Stripe IDs. */
export async function billingOperationsHealth({
  admin = supabaseAdmin,
  checkStripe = cachedStripeCommerceReadiness,
  environment = process.env,
  deployContext = environment.CONTEXT ?? '',
  now = new Date(),
} = {}) {
  const configuration = billingConfiguration(environment, deployContext);
  if (!configuration.configured) {
    return { status: 'unconfigured', mode: configuration.mode, checks: { configuration: false } };
  }
  const mode = billingStripeMode(environment);
  const livemode = mode === 'live';
  const stripeReadiness = await checkStripe({ environment, now });

  const staleRunBefore = encodeURIComponent(
    new Date(now.getTime() - RUN_STALE_MS).toISOString()
  );
  const [runs, staleRuns, leastRecentlyReconciled] = await Promise.all([
    admin(
      `billing_reconciliation_runs?${stripeModeFilter(mode)}&status=neq.running&select=status,started_at,completed_at&order=started_at.desc&limit=1`
    ),
    admin(
      `billing_reconciliation_runs?${stripeModeFilter(mode)}&status=eq.running&started_at=lte.${staleRunBefore}&select=run_id&limit=1`
    ),
    admin(
      `billing_customers?${stripeModeFilter(mode)}&select=last_reconciled_at&order=last_reconciled_at.asc.nullsfirst&limit=1`
    ),
  ]);
  const latest = runs?.[0] ?? null;
  const completedAt = Date.parse(latest?.completed_at);
  const scheduledReconciliation = Boolean(
    latest?.status === 'succeeded' &&
      !staleRuns?.length &&
      Number.isFinite(completedAt) &&
      now.getTime() - completedAt <= RUN_FRESHNESS_MS
  );
  // Only a complete sweep may supersede a failed webhook signal. The minimum
  // successful reconciliation time advances after every known customer has
  // been reread from Stripe; one healthy bounded batch cannot hide a failure
  // for a customer that was outside that batch.
  const sweepCompletedThrough = leastRecentlyReconciled?.[0]?.last_reconciled_at ?? null;
  const eventAfter = encodeURIComponent(
    sweepCompletedThrough || new Date(0).toISOString()
  );
  const staleClaimBefore = encodeURIComponent(
    new Date(now.getTime() - EVENT_RECLAIM_MS).toISOString()
  );
  const reconcilableEvents = RECONCILABLE_WEBHOOK_EVENTS.join(',');
  const [
    failedReconcilableEvents,
    staleReconcilableClaims,
    failedNonReconcilableEvents,
    staleNonReconcilableClaims,
    failedCustomers,
  ] = await Promise.all([
    admin(
      `billing_events?livemode=eq.${livemode}&status=eq.failed&event_type=in.(${reconcilableEvents})&last_attempt_at=gt.${eventAfter}&select=stripe_event_id&limit=1`
    ),
    admin(
      `billing_events?livemode=eq.${livemode}&status=eq.processing&event_type=in.(${reconcilableEvents})&last_attempt_at=gt.${eventAfter}&last_attempt_at=lte.${staleClaimBefore}&select=stripe_event_id&limit=1`
    ),
    admin(
      `billing_events?livemode=eq.${livemode}&status=eq.failed&event_type=not.in.(${reconcilableEvents})&select=stripe_event_id&limit=1`
    ),
    admin(
      `billing_events?livemode=eq.${livemode}&status=eq.processing&event_type=not.in.(${reconcilableEvents})&last_attempt_at=lte.${staleClaimBefore}&select=stripe_event_id&limit=1`
    ),
    admin(`billing_customers?${stripeModeFilter(mode)}&reconcile_failure_count=gt.0&select=user_id&limit=1`),
  ]);

  const webhookDelivery = ![
    failedReconcilableEvents,
    staleReconcilableClaims,
    failedNonReconcilableEvents,
    staleNonReconcilableClaims,
  ].some((rows) => rows?.length);
  const customerReconciliation = !failedCustomers?.length;
  const healthy =
    stripeReadiness.ready &&
    scheduledReconciliation &&
    webhookDelivery &&
    customerReconciliation;

  return {
    status: healthy
      ? 'ok'
      : !stripeReadiness.ready || latest || staleRuns?.length
        ? 'degraded'
        : 'pending',
    mode: configuration.mode,
    checkedAt: now.toISOString(),
    lastCompletedAt: latest?.completed_at ?? null,
    checks: {
      configuration: true,
      stripeResources: stripeReadiness.ready,
      stripePrices: stripeReadiness.checks.prices,
      stripeProducts: stripeReadiness.checks.products,
      stripePortal: stripeReadiness.checks.portal,
      scheduledReconciliation,
      webhookDelivery,
      customerReconciliation,
    },
  };
}
