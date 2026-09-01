/**
 * Invoice lifecycle — renewal, payment failure and recovery.
 *
 * Entitlement itself already follows `customer.subscription.updated`: when a
 * payment fails, Stripe moves the subscription to `past_due` and then to
 * `unpaid` or `canceled`, and the existing handler writes that. So this is not
 * about access. It is about the two things the subscription events cannot say:
 *
 *   - **that a renewal happened at all.** A successful renewal changes no
 *     status, so nothing is written and nothing is recorded. Without an invoice
 *     row the ledger simply skips a year of a customer's history.
 *   - **that a payment is failing right now, and how many attempts are left.**
 *     `past_due` says a payment failed; it does not say this is the third
 *     attempt and the subscription is about to be cancelled, which is the
 *     moment somebody should be told.
 *
 * The classification is pure and tested directly; nothing here writes state.
 */

/** Invoice events worth recording. Anything else is noise for this product. */
export const INVOICE_EVENTS = Object.freeze([
  'invoice.paid',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'invoice.marked_uncollectible',
]);

/** @param {string} type */
export const isInvoiceEvent = (type) => INVOICE_EVENTS.includes(String(type));

const idOf = (value) => (typeof value === 'string' ? value : value?.id ?? null);

/**
 * What an invoice event means for this product.
 *
 * `billing_reason` is what separates the first payment of a subscription from
 * every later one — Stripe uses the same event type for both, and "your
 * subscription renewed" and "your subscription started" are different facts.
 *
 * @param {object} event a Stripe invoice event
 * @returns {{
 *   kind: 'renewal'|'first_payment'|'payment_failed'|'action_required'|'uncollectible'|'other',
 *   subscriptionId: string|null,
 *   customerId: string|null,
 *   attempt: number,
 *   finalAttempt: boolean,
 *   amountDue: number|null,
 *   currency: string|null,
 *   alert: string|null,
 * }}
 */
export function classifyInvoice(event) {
  const invoice = event?.data?.object ?? {};
  const type = String(event?.type ?? '');
  const reason = String(invoice.billing_reason ?? '');

  let kind = 'other';
  if (type === 'invoice.paid' || type === 'invoice.payment_succeeded') {
    kind = reason === 'subscription_create' ? 'first_payment' : 'renewal';
  } else if (type === 'invoice.payment_failed') {
    kind = 'payment_failed';
  } else if (type === 'invoice.payment_action_required') {
    kind = 'action_required';
  } else if (type === 'invoice.marked_uncollectible') {
    kind = 'uncollectible';
  }

  // `next_payment_attempt` is null once Stripe has given up retrying. That is
  // the attempt worth alerting on: access is about to go.
  const finalAttempt = kind === 'payment_failed' && invoice.next_payment_attempt == null;

  return {
    kind,
    subscriptionId: idOf(invoice.subscription),
    customerId: idOf(invoice.customer),
    attempt: Number.isFinite(invoice.attempt_count) ? invoice.attempt_count : 0,
    finalAttempt,
    amountDue: Number.isFinite(invoice.amount_due) ? invoice.amount_due : null,
    currency: typeof invoice.currency === 'string' ? invoice.currency : null,
    alert: alertForInvoice(kind, finalAttempt),
  };
}

/**
 * Which alert an invoice deserves, if any.
 *
 * A first failed payment is a warning: cards decline for ordinary reasons and
 * Stripe will retry. The *last* failed attempt, and an invoice written off
 * entirely, are the ones where a paying customer is about to lose access
 * without anybody having looked.
 *
 * A renewal is not alerted on. It is the normal case, and paging on the normal
 * case is how alerts get muted.
 */
export function alertForInvoice(kind, finalAttempt) {
  if (kind === 'uncollectible') return 'payment_uncollectible';
  if (kind === 'payment_failed') return finalAttempt ? 'payment_final_failure' : 'payment_failed';
  if (kind === 'action_required') return 'payment_action_required';
  return null;
}

/**
 * The ledger outcome for an invoice event.
 *
 * Recorded as `applied` even though no state changed, because the ledger's
 * question is "did we see and handle this", not "did a table change". An
 * invoice we saw and correctly did nothing about is `ignored`.
 *
 * @param {ReturnType<typeof classifyInvoice>} classification
 */
export const invoiceOutcome = (classification) =>
  classification.kind === 'other' ? 'ignored' : 'applied';
