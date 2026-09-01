/**
 * The billing event ledger.
 *
 * Stripe retries a webhook until it receives a 2xx, and a handler can succeed
 * and still be retried when the response is lost on the way back. So "have I
 * already applied this event?" has to be answerable from storage rather than
 * from hope, and the answer has to be durable enough to settle a dispute
 * months later.
 *
 * The row-building half is pure and tested directly; only `record` and
 * `outcomeFor` touch the network.
 */
import crypto from 'node:crypto';

import { supabaseAdmin } from './billing.js';

/** Every outcome a ledger row may carry. Anything else is a bug in a caller. */
export const OUTCOMES = Object.freeze([
  /** The event changed local state. */
  'applied',
  /** Recognised, and correctly did nothing — a deleted account, say. */
  'ignored',
  /** The same event id had already been recorded. */
  'duplicate',
  /** The subscription carries a price this deployment does not sell. */
  'unsupported_price',
  /** Handling threw. This is the one an operator is paged for. */
  'failed',
]);

/** sha256 of the raw request body, hex. */
export const payloadDigest = (raw) =>
  crypto.createHash('sha256').update(String(raw ?? ''), 'utf8').digest('hex');

const idOf = (value) => (typeof value === 'string' ? value : value?.id ?? null);

/**
 * The identifiers worth pulling out of an event so the ledger can be queried
 * without re-reading Stripe.
 *
 * A Stripe event is one of several shapes — a Checkout session, a
 * subscription, an invoice — and each names the subscription differently.
 *
 * @param {object} event
 */
export function eventSubjects(event) {
  const object = event?.data?.object ?? {};
  const type = String(event?.type ?? '');

  const customerId = idOf(object.customer);
  const subscriptionId = type.startsWith('customer.subscription.')
    ? object.id ?? null
    : idOf(object.subscription);

  return {
    customerId: customerId ?? null,
    subscriptionId: subscriptionId ?? null,
    // Only from metadata the checkout put there — never from a customer email.
    userId: object.metadata?.supabase_user_id ?? object.client_reference_id ?? null,
  };
}

/**
 * One ledger row. Pure: no clock beyond the injected one, no network.
 *
 * @param {object} event the parsed Stripe event
 * @param {string} raw the exact request body, for the digest
 * @param {{ outcome?: string, error?: unknown, userId?: string|null, now?: () => Date }} [result]
 */
export function ledgerRow(event, raw, { outcome = 'applied', error = null, userId, now = () => new Date() } = {}) {
  if (!OUTCOMES.includes(outcome)) throw new Error(`unknown ledger outcome: ${outcome}`);
  const subjects = eventSubjects(event);
  const at = now().toISOString();

  return {
    stripe_event_id: event?.id ?? null,
    type: event?.type ?? 'unknown',
    stripe_customer_id: subjects.customerId,
    stripe_subscription_id: subjects.subscriptionId,
    user_id: userId === undefined ? subjects.userId : userId,
    payload_digest: payloadDigest(raw),
    outcome,
    // Message only: a stack from a serverless runtime names paths nobody needs
    // in a billing record, and the message is what identifies the failure.
    error: error ? String(error?.message ?? error).slice(0, 500) : null,
    event_created_at: event?.created ? new Date(event.created * 1000).toISOString() : null,
    received_at: at,
    processed_at: outcome === 'failed' ? null : at,
  };
}

/**
 * Whether this event id has already been recorded, and with what outcome.
 *
 * A previous `failed` is not a duplicate: a retry is exactly what should
 * happen, and re-running it is the point of Stripe's retry schedule.
 *
 * @param {string} eventId
 * @returns {Promise<{seen: boolean, outcome: string|null, digest: string|null}>}
 */
export async function priorOutcome(eventId) {
  if (!eventId) return { seen: false, outcome: null, digest: null };
  const rows = await supabaseAdmin(
    `billing_events?stripe_event_id=eq.${encodeURIComponent(eventId)}&select=outcome,payload_digest&limit=1`
  );
  const row = rows?.[0];
  return { seen: Boolean(row), outcome: row?.outcome ?? null, digest: row?.payload_digest ?? null };
}

/**
 * Append a row, or update the one already there.
 *
 * `merge-duplicates` rather than `ignore-duplicates`: a retry of an event that
 * previously failed must record that it has now succeeded, or the ledger keeps
 * paging an operator about a problem that resolved itself.
 *
 * @param {object} row from `ledgerRow`
 */
export async function record(row) {
  await supabaseAdmin('billing_events?on_conflict=stripe_event_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: row,
  });
  return row;
}

/**
 * Should this delivery be processed, or is it a replay of work already done?
 *
 * Returns the reason when it should be skipped, so the caller can record it
 * rather than silently returning 200.
 *
 * @param {string} eventId
 * @param {string} raw
 */
export async function replayDecision(eventId, raw) {
  const prior = await priorOutcome(eventId);
  if (!prior.seen) return { process: true, reason: null, digestChanged: false };
  // A retry of a failure is meant to run again.
  if (prior.outcome === 'failed') return { process: true, reason: null, digestChanged: false };

  // The same event id with a different body should be impossible. If it ever
  // happens, the safe reading is that something is impersonating Stripe or a
  // replay has been tampered with — process nothing and say so loudly.
  const digestChanged = Boolean(prior.digest) && prior.digest !== payloadDigest(raw);
  return { process: false, reason: digestChanged ? 'digest_mismatch' : 'duplicate', digestChanged };
}

/**
 * Recent ledger rows, newest first. Used by the reconciliation endpoint and by
 * an operator answering "what happened to this subscription".
 *
 * @param {{ limit?: number, subscriptionId?: string, outcome?: string }} [query]
 */
export async function recentEvents({ limit = 50, subscriptionId, outcome } = {}) {
  const filters = [
    `select=stripe_event_id,type,outcome,error,stripe_subscription_id,received_at`,
    `order=received_at.desc`,
    `limit=${Math.min(200, Math.max(1, limit))}`,
  ];
  if (subscriptionId) filters.push(`stripe_subscription_id=eq.${encodeURIComponent(subscriptionId)}`);
  if (outcome) filters.push(`outcome=eq.${encodeURIComponent(outcome)}`);
  return (await supabaseAdmin(`billing_events?${filters.join('&')}`)) ?? [];
}
