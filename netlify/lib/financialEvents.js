import { stripeGet, stripeModeFilter, supabaseAdmin } from './billing.js';
import { billingStripeMode } from './billingConfiguration.js';
import { invoiceSubscriptionId } from './invoices.js';

export const FINANCIAL_EVENTS = Object.freeze([
  'charge.refunded',
  'charge.dispute.created',
  'charge.dispute.closed',
]);

export const isFinancialEvent = (type) => FINANCIAL_EVENTS.includes(String(type));
const idOf = (value) => (typeof value === 'string' ? value : value?.id ?? null);
const MAX_INVOICE_LINE_PAGES = 10;

async function chargeForEvent(event, get) {
  const object = event?.data?.object ?? {};
  if (event.type === 'charge.refunded') return object;
  const chargeId = idOf(object.charge);
  if (!chargeId) throw new Error('Dispute event is missing its Charge.');
  return get(`charges/${encodeURIComponent(chargeId)}`);
}

async function invoiceForCharge(charge, get) {
  if (charge?.invoice && typeof charge.invoice === 'object') {
    if (invoiceSubscriptionId(charge.invoice)) return charge.invoice;
  }
  const invoiceId = idOf(charge?.invoice);
  return invoiceId ? get(`invoices/${encodeURIComponent(invoiceId)}`) : null;
}

async function invoiceWithCompleteLines(invoice, get) {
  if (!invoice?.lines?.has_more) return invoice;
  if (!invoice.id) throw new Error('Paginated Invoice lines require an Invoice ID.');

  const lines = [...(invoice.lines.data ?? [])];
  let hasMore = true;
  for (let pageNumber = 1; hasMore && pageNumber <= MAX_INVOICE_LINE_PAGES; pageNumber += 1) {
    const cursor = lines.at(-1)?.id;
    if (!cursor) throw new Error('Stripe Invoice line pagination did not provide a cursor.');
    const page = await get(
      `invoices/${encodeURIComponent(invoice.id)}/lines?limit=100&starting_after=${encodeURIComponent(cursor)}`
    );
    const nextLines = Array.isArray(page?.data) ? page.data : [];
    const nextCursor = nextLines.at(-1)?.id;
    if (page?.has_more && (!nextCursor || nextCursor === cursor)) {
      throw new Error('Stripe Invoice line pagination did not advance.');
    }
    lines.push(...nextLines);
    hasMore = Boolean(page?.has_more);
  }
  if (hasMore) {
    const error = new Error('Stripe Invoice lines exceeded the reconciliation page limit.');
    error.code = 'invoice_lines_truncated';
    throw error;
  }
  return { ...invoice, lines: { ...invoice.lines, data: lines, has_more: false } };
}

function subscriptionPeriodStart(subscription) {
  const seconds =
    subscription?.current_period_start ??
    subscription?.items?.data?.[0]?.current_period_start ??
    null;
  return Number.isFinite(seconds) ? seconds : null;
}

function subscriptionLinePeriodEnd(invoice, subscriptionId) {
  const ends = (invoice?.lines?.data ?? [])
    .filter((line) => {
      const lineSubscriptionId = idOf(
        line?.subscription ??
        line?.parent?.subscription_item_details?.subscription ??
        line?.parent?.subscription_details?.subscription
      );
      if (lineSubscriptionId) return lineSubscriptionId === subscriptionId;
      // Current Stripe versions identify recurring lines through their parent;
      // legacy versions used `type=subscription`. This product creates exactly
      // one subscription per invoice, so either shape is an eligible line.
      return line?.parent?.type === 'subscription_item_details' || line?.type === 'subscription';
    })
    .map((line) => line?.period?.end)
    .filter(Number.isFinite);
  return ends.length ? Math.max(...ends) : null;
}

function refundIsHistorical(invoice, subscription, subscriptionId) {
  // Invoice.period_end describes the invoice boundary, not necessarily the
  // service period purchased by its subscription line. On renewals it can be
  // equal to the new current_period_start, which would misclassify a refund of
  // the current paid period as historical. If no subscription line is present,
  // fail closed and suspend rather than preserving access after a full refund.
  const invoicePeriodEnd = subscriptionLinePeriodEnd(invoice, subscriptionId);
  const currentPeriodStart = subscriptionPeriodStart(subscription);
  return (
    Number.isFinite(invoicePeriodEnd) &&
    Number.isFinite(currentPeriodStart) &&
    invoicePeriodEnd <= currentPeriodStart
  );
}

function eventTime(event, fallback) {
  const seconds = Number(event?.created);
  return Number.isFinite(seconds) ? new Date(seconds * 1000) : fallback;
}

function markerAllows(row, marker, occurredAt, operator) {
  const current = Date.parse(row?.[marker]);
  if (!Number.isFinite(current)) return true;
  return operator === 'lte' ? current <= occurredAt.getTime() : current < occurredAt.getTime();
}

async function updateFinancialState(
  subscriptionId,
  { mode, admin, now, occurredAt, stream, active, operator }
) {
  const path = `billing_subscriptions?stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}&${stripeModeFilter(mode)}`;
  const marker = stream === 'refund' ? 'refund_state_event_at' : 'dispute_state_event_at';
  const activeColumn = stream === 'refund' ? 'full_refund_at' : 'dispute_opened_at';
  const existing = await admin(`${path}&select=${marker},${activeColumn}&limit=1`);
  if (!existing?.length) {
    const error = new Error('Financial event subscription is not present locally.');
    error.code = 'missing_local_subscription';
    throw error;
  }
  if (!markerAllows(existing[0], marker, occurredAt, operator)) return false;

  const timestamp = occurredAt.toISOString();
  const rows = await admin(
    `${path}&or=(${marker}.is.null,${marker}.${operator}.${encodeURIComponent(timestamp)})`,
    {
      method: 'PATCH',
      prefer: 'return=representation',
      body: active
        ? {
            [activeColumn]: timestamp,
            [marker]: timestamp,
            access_suspended_reason: stream === 'refund' ? 'full_refund' : 'dispute',
            access_suspended_at: timestamp,
            updated_at: now.toISOString(),
          }
        : {
            [activeColumn]: null,
            [marker]: timestamp,
            updated_at: now.toISOString(),
          },
    }
  );
  if (!rows?.length) return false;

  if (!active && stream === 'dispute') {
    // Keep the legacy projection accurate without allowing it to clear an
    // independent full-refund state. New access decisions use both fields.
    await admin(`${path}&access_suspended_reason=eq.dispute`, {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: {
        access_suspended_reason: null,
        access_suspended_at: null,
        updated_at: now.toISOString(),
      },
    });
  }
  return true;
}

/** Applies access-safe refund/dispute state and returns an alert classification. */
export async function applyFinancialEvent(
  event,
  {
    get = stripeGet,
    admin = supabaseAdmin,
    mode = billingStripeMode(),
    now = new Date(),
  } = {}
) {
  if (!isFinancialEvent(event?.type)) return { handled: false, reason: 'unsupported_financial_event' };
  const charge = await chargeForEvent(event, get);
  const invoice = await invoiceForCharge(charge, get);
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return { handled: false, reason: 'non_subscription_charge' };
  const occurredAt = eventTime(event, now);

  if (event.type === 'charge.refunded') {
    const amount = Number(charge.amount);
    const amountRefunded = Number(charge.amount_refunded);
    const full = Number.isFinite(amount) && amount > 0 && amountRefunded >= amount;
    if (!full) {
      return { handled: true, reason: 'partial_refund_recorded', alert: 'partial_refund', subscriptionId };
    }
    const completeInvoice = await invoiceWithCompleteLines(invoice, get);
    let subscription = null;
    try {
      subscription = await get(`subscriptions/${encodeURIComponent(subscriptionId)}`);
    } catch (error) {
      // A deleted Subscription cannot grant access, but a transient Stripe
      // failure must remain retryable. Persist the refund against any local
      // row only when Stripe explicitly confirms resource absence.
      if (error?.status !== 404 && error?.code !== 'resource_missing') throw error;
    }
    if (subscription && refundIsHistorical(completeInvoice, subscription, subscriptionId)) {
      return { handled: true, reason: 'historical_full_refund_recorded', alert: 'full_refund', subscriptionId };
    }
    const updated = await updateFinancialState(subscriptionId, {
      mode,
      admin,
      now,
      occurredAt,
      stream: 'refund',
      active: true,
      // A refund wins a same-second successful invoice conservatively.
      operator: 'lte',
    });
    return updated
      ? { handled: true, reason: 'full_refund_suspended', alert: 'full_refund', subscriptionId }
      : { handled: true, reason: 'stale_refund_ignored', subscriptionId };
  }

  if (event.type === 'charge.dispute.created') {
    const updated = await updateFinancialState(subscriptionId, {
      mode,
      admin,
      now,
      occurredAt,
      stream: 'dispute',
      active: true,
      // A same-second close wins regardless of delivery order.
      operator: 'lt',
    });
    return updated
      ? { handled: true, reason: 'dispute_suspended', alert: 'dispute_opened', subscriptionId }
      : { handled: true, reason: 'stale_dispute_ignored', subscriptionId };
  }

  const dispute = event.data?.object ?? {};
  if (dispute.status === 'won') {
    const updated = await updateFinancialState(subscriptionId, {
      mode,
      admin,
      now,
      occurredAt,
      stream: 'dispute',
      active: false,
      operator: 'lte',
    });
    return updated
      ? { handled: true, reason: 'dispute_won_restored', alert: 'dispute_won', subscriptionId }
      : { handled: true, reason: 'stale_dispute_ignored', subscriptionId };
  }
  const updated = await updateFinancialState(subscriptionId, {
    mode,
    admin,
    now,
    occurredAt,
    stream: 'dispute',
    active: true,
    operator: 'lte',
  });
  return updated
    ? { handled: true, reason: 'dispute_closed_not_won', alert: 'dispute_lost', subscriptionId }
    : { handled: true, reason: 'stale_dispute_ignored', subscriptionId };
}
