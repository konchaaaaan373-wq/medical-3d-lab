/**
 * The billing journeys this product promises to survive, written as data.
 *
 * Gate 2 asks for renewal, payment failure and repurchase to have explicit
 * end-to-end coverage. The awkward part of that request is that "end to end"
 * for billing means *over time*: a renewal is a year later, a failing card is
 * four retries across two weeks, and a repurchase only means anything after a
 * cancellation. None of that is a single assertion, and none of it can be
 * reproduced by staring at a webhook handler.
 *
 * So each journey is an ordered list of what Stripe says and what must be true
 * afterwards. `tests/billing-journeys.test.js` replays them against the
 * deployed webhook handler on a bench (`tests/support/billingSandbox.js`); a
 * run against the real Stripe sandbox, with its test clocks, is the
 * credential-bearing check in `docs/access-and-billing.md`. Both read this
 * file, so what is claimed and what is checked cannot drift apart.
 *
 * ### Reading a step
 *
 * - `subscription` is what Stripe now says about the subscription. It is
 *   merged onto the object Stripe already holds, because a renewal changes a
 *   period end and nothing else, and repeating the rest would hide that.
 * - `event` is the delivery. For a subscription event the object is the
 *   subscription above; for an invoice event, `invoice` is the object.
 * - `expect.access` is the question a *reader* would ask: can this person
 *   still open the paid mode? It is derived through `grantsFromSubscriptions`,
 *   the same function the product uses, rather than compared against a status
 *   string — a status is an implementation detail, access is the promise.
 *
 * Pure data. No Stripe, no network, no DOM.
 */

/** The plan prices a test deployment is configured with. */
export const JOURNEY_PRICES = Object.freeze({
  patient: 'price_patient',
  education: 'price_education',
  complete: 'price_complete',
});

/** A fixed clock, so a period end is a fact rather than a moving target. */
export const JOURNEY_EPOCH = Date.UTC(2026, 0, 15) / 1000;
const MONTH = 30 * 24 * 60 * 60;

export const JOURNEY_USER = '11111111-1111-1111-1111-111111111111';
export const JOURNEY_CUSTOMER = 'cus_journey';

/**
 * Every journey. Order within a journey matters; order between them does not.
 */
export const BILLING_JOURNEYS = Object.freeze([
  {
    id: 'first-purchase',
    title: 'A first purchase grants access',
    why: 'The baseline every other journey starts from. Already verified in the Stripe sandbox; kept here so a regression in it is not attributed to the journey that follows.',
    steps: [
      {
        label: 'Checkout completes',
        subscription: {
          id: 'sub_journey',
          customer: JOURNEY_CUSTOMER,
          status: 'active',
          current_period_end: JOURNEY_EPOCH + MONTH,
          cancel_at_period_end: false,
          items: { data: [{ price: { id: JOURNEY_PRICES.complete } }] },
          metadata: { supabase_user_id: JOURNEY_USER },
        },
        event: {
          type: 'checkout.session.completed',
          object: {
            mode: 'subscription',
            customer: JOURNEY_CUSTOMER,
            subscription: 'sub_journey',
            client_reference_id: JOURNEY_USER,
            customer_details: { email: 'journey@example.test' },
          },
        },
        expect: {
          outcome: 'processed',
          resultCode: 'checkout_synced',
          access: ['free', 'patient', 'education'],
          status: 'active',
          alerts: [],
        },
      },
      {
        label: 'The subscription event arrives after it',
        event: { type: 'customer.subscription.created' },
        expect: {
          outcome: 'processed',
          resultCode: 'subscription_synced',
          access: ['free', 'patient', 'education'],
          status: 'active',
          alerts: [],
        },
      },
    ],
  },

  {
    id: 'renewal',
    title: 'A renewal extends access without changing status',
    why: 'The journey with nothing to see. A successful renewal changes no subscription status, so a handler that only follows status writes nothing and a year of a customer\'s history leaves no trace. What must move is the period end.',
    inherits: 'first-purchase',
    steps: [
      {
        label: 'Stripe charges the card for the next period',
        event: {
          type: 'invoice.paid',
          invoice: {
            id: 'in_renewal',
            billing_reason: 'subscription_cycle',
            subscription: 'sub_journey',
            customer: JOURNEY_CUSTOMER,
            amount_due: 2400,
            currency: 'jpy',
            attempt_count: 1,
          },
        },
        expect: {
          outcome: 'processed',
          resultCode: 'invoice_renewal',
          access: ['free', 'patient', 'education'],
          status: 'active',
          // A renewal is an ordinary event. Waking somebody for it is how an
          // alert channel gets muted before the one that matters arrives.
          alerts: [],
        },
      },
      {
        label: 'The subscription moves into the new period',
        subscription: { current_period_end: JOURNEY_EPOCH + 2 * MONTH },
        event: { type: 'customer.subscription.updated' },
        expect: {
          outcome: 'processed',
          access: ['free', 'patient', 'education'],
          status: 'active',
          periodEnd: JOURNEY_EPOCH + 2 * MONTH,
          alerts: [],
        },
      },
    ],
  },

  {
    id: 'payment-failure-recovered',
    title: 'A failing card keeps access while Stripe retries, then recovers',
    why: 'Cards decline for ordinary reasons — an expiry, a bank\'s fraud rule, a limit. Cutting a paying customer off at the first decline is wrong, so `past_due` holds access while Stripe retries. The alert is a warning, not an emergency.',
    inherits: 'first-purchase',
    steps: [
      {
        label: 'The first charge attempt is declined',
        event: {
          type: 'invoice.payment_failed',
          invoice: {
            id: 'in_retry',
            billing_reason: 'subscription_cycle',
            subscription: 'sub_journey',
            customer: JOURNEY_CUSTOMER,
            attempt_count: 1,
            next_payment_attempt: JOURNEY_EPOCH + 3 * 24 * 60 * 60,
            amount_due: 2400,
            currency: 'jpy',
          },
        },
        expect: {
          outcome: 'processed',
          resultCode: 'invoice_payment_failed',
          alerts: ['payment_failed'],
          alertLevels: ['warning'],
        },
      },
      {
        label: 'Stripe moves the subscription to past_due',
        subscription: { status: 'past_due' },
        event: { type: 'customer.subscription.updated' },
        expect: {
          outcome: 'processed',
          status: 'past_due',
          // The grace period is the whole point: the reader keeps their access
          // while their bank and Stripe sort it out.
          access: ['free', 'patient', 'education'],
          alerts: [],
        },
      },
      {
        label: 'The retry succeeds',
        subscription: { status: 'active', current_period_end: JOURNEY_EPOCH + 2 * MONTH },
        event: { type: 'customer.subscription.updated' },
        expect: {
          outcome: 'processed',
          status: 'active',
          access: ['free', 'patient', 'education'],
          periodEnd: JOURNEY_EPOCH + 2 * MONTH,
          alerts: [],
        },
      },
    ],
  },

  {
    id: 'payment-failure-final',
    title: 'When the retries run out, access goes and somebody is told',
    why: 'The moment worth an alert is not the first decline; it is the last one, when Stripe has stopped retrying and a paying customer is about to lose access. `next_payment_attempt` being null is what says so.',
    inherits: 'first-purchase',
    steps: [
      {
        label: 'The final retry fails',
        event: {
          type: 'invoice.payment_failed',
          invoice: {
            id: 'in_final',
            billing_reason: 'subscription_cycle',
            subscription: 'sub_journey',
            customer: JOURNEY_CUSTOMER,
            attempt_count: 4,
            next_payment_attempt: null,
            amount_due: 2400,
            currency: 'jpy',
          },
        },
        expect: {
          outcome: 'processed',
          resultCode: 'invoice_payment_failed',
          alerts: ['payment_final_failure'],
          alertLevels: ['error'],
        },
      },
      {
        label: 'Stripe gives up and marks the subscription unpaid',
        subscription: { status: 'unpaid' },
        event: { type: 'customer.subscription.updated' },
        expect: {
          outcome: 'processed',
          status: 'unpaid',
          // `unpaid` is not in the grace set. Access stops here.
          access: ['free'],
          alerts: [],
        },
      },
      {
        label: 'The subscription is deleted',
        subscription: { status: 'canceled' },
        event: { type: 'customer.subscription.deleted' },
        expect: {
          outcome: 'processed',
          status: 'canceled',
          access: ['free'],
          alerts: [],
        },
      },
    ],
  },

  {
    id: 'repurchase',
    title: 'A cancelled customer can buy again',
    why: 'The failure this exists to catch is silent: a stale local row for the old subscription still saying `active`, so the product sends a returning customer to Billing Portal to manage a subscription that no longer exists. The new subscription must grant access, and the old row must not be what answers.',
    inherits: 'first-purchase',
    steps: [
      {
        label: 'The original subscription is cancelled',
        subscription: { status: 'canceled', cancel_at_period_end: false },
        event: { type: 'customer.subscription.deleted' },
        expect: { outcome: 'processed', status: 'canceled', access: ['free'], alerts: [] },
      },
      {
        label: 'The same person buys again, on a new subscription',
        subscription: {
          id: 'sub_journey_2',
          customer: JOURNEY_CUSTOMER,
          status: 'active',
          current_period_end: JOURNEY_EPOCH + 6 * MONTH,
          cancel_at_period_end: false,
          items: { data: [{ price: { id: JOURNEY_PRICES.patient } }] },
          metadata: { supabase_user_id: JOURNEY_USER },
        },
        event: {
          type: 'checkout.session.completed',
          object: {
            mode: 'subscription',
            customer: JOURNEY_CUSTOMER,
            subscription: 'sub_journey_2',
            client_reference_id: JOURNEY_USER,
          },
        },
        expect: {
          outcome: 'processed',
          resultCode: 'checkout_synced',
          subscriptionId: 'sub_journey_2',
          status: 'active',
          // The new plan is `patient`, so education must *not* come back with
          // it. A repurchase that restored the old plan's grants would be a
          // quiet gift of a plan nobody paid for.
          access: ['free', 'patient'],
          alerts: [],
        },
      },
    ],
  },

  {
    id: 'plan-change',
    title: 'A plan change follows the price, not the metadata',
    why: 'Portal writes the new price onto the same subscription. Entitlement has to follow that price; falling back to the metadata written at Checkout is exactly how an upgrade or a downgrade leaves the old access in place.',
    inherits: 'first-purchase',
    steps: [
      {
        label: 'Portal downgrades Complete to Patient',
        subscription: { items: { data: [{ price: { id: JOURNEY_PRICES.patient } }] } },
        event: { type: 'customer.subscription.updated' },
        expect: {
          outcome: 'processed',
          status: 'active',
          access: ['free', 'patient'],
          alerts: [],
        },
      },
    ],
  },

  {
    id: 'cancel-at-period-end',
    title: 'A cancellation scheduled for the period end keeps access until then',
    why: 'The customer has paid for the rest of the period. Taking access away the moment they click cancel would be taking something they own.',
    inherits: 'first-purchase',
    steps: [
      {
        label: 'The customer schedules a cancellation',
        subscription: { cancel_at_period_end: true },
        event: { type: 'customer.subscription.updated' },
        expect: {
          outcome: 'processed',
          status: 'active',
          cancelAtPeriodEnd: true,
          access: ['free', 'patient', 'education'],
          alerts: [],
        },
      },
      {
        label: 'The period ends',
        subscription: { status: 'canceled' },
        event: { type: 'customer.subscription.deleted' },
        expect: { outcome: 'processed', status: 'canceled', access: ['free'], alerts: [] },
      },
    ],
  },

  {
    id: 'uncollectible',
    title: 'A written-off invoice is an operational event, not a silent one',
    why: 'Stripe marking an invoice uncollectible means the money is not coming. Access follows the subscription events as usual; what this journey checks is that somebody is told.',
    inherits: 'first-purchase',
    steps: [
      {
        label: 'The invoice is written off',
        event: {
          type: 'invoice.marked_uncollectible',
          invoice: {
            id: 'in_writeoff',
            billing_reason: 'subscription_cycle',
            subscription: 'sub_journey',
            customer: JOURNEY_CUSTOMER,
            attempt_count: 4,
            amount_due: 2400,
            currency: 'jpy',
          },
        },
        expect: {
          outcome: 'processed',
          resultCode: 'invoice_uncollectible',
          alerts: ['payment_uncollectible'],
          alertLevels: ['error'],
        },
      },
    ],
  },
]);

/** @param {string} id */
export const journeyById = (id) => BILLING_JOURNEYS.find((journey) => journey.id === id) ?? null;

/**
 * Everything structurally wrong with the declaration, as readable lines.
 *
 * Returned rather than thrown, in the same shape as `validateCatalog` and
 * `validateViewportMatrix`, so a test and a script can share one function.
 */
export function validateJourneys(journeys = BILLING_JOURNEYS) {
  const problems = [];
  const ids = new Set();

  for (const journey of journeys) {
    const where = `journey "${journey.id}"`;
    if (ids.has(journey.id)) problems.push(`${where}: duplicate id`);
    ids.add(journey.id);
    if (!journey.title) problems.push(`${where}: no title`);
    // A journey without a stated reason is a journey nobody can decide to
    // delete, which is how a suite becomes something people skip.
    if (!journey.why || journey.why.length < 40) problems.push(`${where}: does not say why it exists`);
    if (!Array.isArray(journey.steps) || journey.steps.length === 0) {
      problems.push(`${where}: has no steps`);
      continue;
    }
    if (journey.inherits && !journeys.some((other) => other.id === journey.inherits)) {
      problems.push(`${where}: inherits "${journey.inherits}", which is not a journey`);
    }

    for (const [index, step] of journey.steps.entries()) {
      const at = `${where} step ${index + 1}`;
      if (!step.label) problems.push(`${at}: no label`);
      if (!step.event?.type) problems.push(`${at}: delivers no event`);
      if (!step.expect) problems.push(`${at}: asserts nothing`);
      const isInvoice = String(step.event?.type ?? '').startsWith('invoice.');
      if (isInvoice && !step.event.invoice) problems.push(`${at}: an invoice event with no invoice`);
      if (step.expect?.access && !step.expect.access.includes('free')) {
        problems.push(`${at}: expects access without "free", which is never withdrawn`);
      }
    }
  }

  for (const required of ['renewal', 'payment-failure-final', 'repurchase']) {
    if (!journeys.some((journey) => journey.id === required)) {
      problems.push(`Gate 2 names the "${required}" journey, and it is not declared`);
    }
  }
  return problems;
}
