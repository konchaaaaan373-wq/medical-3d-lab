/**
 * Operational alerts.
 *
 * The rule is the same one the product's telemetry follows and for the same
 * reason: an alert leaves this deployment, so nothing personal may travel in
 * it. A billing failure is identified by its Stripe ids and its error message,
 * both of which pass through the product's own redaction layer first — the one
 * in `src/telemetry/redact.js`, reused rather than reimplemented, because two
 * redactors drift and the weaker one is the one that leaks.
 *
 * With no webhook configured this logs and returns. An alerting channel is a
 * deployment decision; the code that decides *what is worth alerting on* is
 * not, and belongs here either way.
 */
import crypto from 'node:crypto';

import { redactText } from '../../src/telemetry/redact.js';

const ALERT_TIMEOUT_MS = 3_000;
const STRIPE_REFERENCE = /\b(?:acct|ch|cs|cus|evt|in|pi|price|prod|req|sub|we)_[A-Za-z0-9_]+\b/g;

function safeAlertString(key, value) {
  if (/(?:^|_)id$/i.test(key) || /Id$/.test(key)) {
    return `ref:${crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16)}`;
  }
  return redactText(value).replace(STRIPE_REFERENCE, '[stripe-reference]').slice(0, 300);
}

/** Severity, in the order an operator triages. */
export const LEVELS = Object.freeze(['critical', 'error', 'warning', 'info']);

/**
 * What is worth waking somebody for.
 *
 * Written as data so the policy is reviewable, and so a test can assert that a
 * failed webhook is critical without running one.
 */
export const ALERT_RULES = Object.freeze({
  /** A webhook threw. Stripe will retry, but entitlement is wrong until it lands. */
  webhook_failed: 'critical',
  /** The same event id arrived with a different body. Should be impossible. */
  webhook_digest_mismatch: 'critical',
  /** Local state and Stripe disagree about a live subscription. */
  reconcile_drift: 'error',
  /** A subscription carries a price this deployment does not sell. */
  unsupported_price: 'error',
  /** A payment failed and Stripe will retry. Cards decline for ordinary reasons. */
  payment_failed: 'warning',
  /** The last retry failed. A paying customer is about to lose access. */
  payment_final_failure: 'error',
  /** The invoice was written off. Access has gone or is going. */
  payment_uncollectible: 'error',
  /** The card needs the customer to authenticate before it will clear. */
  payment_action_required: 'warning',
  /** A complete refund removes the paid consideration for this access period. */
  full_refund: 'error',
  /** Partial refunds need review but do not automatically revoke all access. */
  partial_refund: 'warning',
  /** Disputed payments are suspended until Stripe reports the outcome. */
  dispute_opened: 'critical',
  dispute_won: 'info',
  dispute_lost: 'error',
  /** A webhook for an account that no longer exists. Expected during deletion. */
  deleted_user_event: 'info',
  /**
   * A subscription event whose owner could not be resolved at all.
   *
   * Not the same thing as `deleted_user_event`, and deliberately louder: that
   * one means the account is gone and the billing rows went with it, which is
   * expected. This one means the customer has no mapping and the event carries
   * no metadata either — so somebody may be paying with nothing local to attach
   * it to. Any revocation still lands (that needs no owner); nothing is
   * granted, which is why this is not critical.
   */
  unresolvable_subscription_event: 'error',

  /** Reconciliation ran and found nothing. Useful as a heartbeat. */
  reconcile_clean: 'info',
});

/** @param {string} kind */
export const levelFor = (kind) => ALERT_RULES[kind] ?? 'warning';

/**
 * Build the alert body. Pure — the network half is `notify`.
 *
 * Every string value is redacted, including ones we believe are safe: the
 * belief is what fails.
 *
 * @param {string} kind a key of `ALERT_RULES`
 * @param {Record<string, unknown>} [context]
 * @param {{ now?: () => Date, deployment?: string }} [options]
 */
export function buildAlert(kind, context = {}, { now = () => new Date(), deployment } = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(context)) {
    if (value == null) continue;
    safe[key] = typeof value === 'string' ? safeAlertString(key, value) : value;
  }
  return {
    kind,
    level: levelFor(kind),
    at: now().toISOString(),
    deployment: deployment ?? process.env.DEPLOY_ENV ?? 'unknown',
    context: safe,
  };
}

/**
 * Send an alert, if there is anywhere to send it.
 *
 * Never throws. An alerting channel that is down must not turn a recoverable
 * billing failure into an unhandled one — the ledger row is the durable record
 * either way, and this is the notification on top of it.
 *
 * @param {string} kind
 * @param {Record<string, unknown>} [context]
 */
export async function notify(kind, context = {}) {
  const alert = buildAlert(kind, context);
  const line = `[billing:${alert.level}] ${kind} ${JSON.stringify(alert.context)}`;
  if (alert.level === 'critical' || alert.level === 'error') console.error(line);
  else console.info(line);

  const endpoint = process.env.OPS_ALERT_WEBHOOK;
  if (!endpoint) return { sent: false, alert };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alert),
      signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
    });
    return { sent: response.ok, alert };
  } catch (error) {
    console.error('[billing] alert delivery failed', { code: error?.code ?? 'unknown' });
    return { sent: false, alert };
  }
}
