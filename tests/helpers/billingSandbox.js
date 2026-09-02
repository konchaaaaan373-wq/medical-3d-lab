/**
 * A Stripe and Supabase bench, so a billing journey can be run rather than
 * argued about.
 *
 * The unit tests in `tests/billing-*.test.js` each stub `globalThis.fetch`
 * with a handful of hand-written responses. That is fine for one assertion
 * about one function and useless for a *journey*: renewal, a failing card and
 * a repurchase are sequences, and what matters is the state left behind after
 * step four, not what step one returned.
 *
 * So this is a small, faithful backend rather than a stub. It holds tables,
 * applies writes, and answers the same queries the real code sends. The code
 * under test does not know it is here — no injection, no seams — which is the
 * point: the webhook handler exercised is the deployed one, reached through
 * the same HTTP calls.
 *
 * **What it is not.** It is not Stripe. It does not price, prorate, retry, or
 * decide when a card has finally failed; the journeys hand it those facts
 * because Stripe decides them. What it faithfully reproduces is the shape of
 * the API surface this product actually uses, which is the part a bug can hide
 * in. The Stripe sandbox proper — real API, real test clocks — is a separate,
 * credential-bearing check described in `docs/access-and-billing.md`.
 */

const STRIPE_API = 'https://api.stripe.com/v1/';

/** PostgREST-style filters, limited to the two operators this product sends. */
const OPERATORS = {
  eq: (row, value) => String(row ?? '') === value,
  lte: (row, value) => String(row ?? '') <= value,
  gte: (row, value) => String(row ?? '') >= value,
};

/**
 * Read one PostgREST path into a table name and the filters/options on it.
 *
 * `billing_events?stripe_event_id=eq.evt_1&select=status&limit=1` becomes the
 * table, one filter, and the options that change what comes back.
 */
function parsePath(path) {
  const [table, rawQuery = ''] = String(path).split('?');
  const params = new URLSearchParams(rawQuery);
  const filters = [];
  let onConflict = null;
  let limit = null;
  for (const [key, value] of params.entries()) {
    if (key === 'select') continue;
    if (key === 'on_conflict') {
      onConflict = value;
      continue;
    }
    if (key === 'limit') {
      limit = Number(value);
      continue;
    }
    const [operator, ...rest] = value.split('.');
    filters.push({ column: key, operator, value: decodeURIComponent(rest.join('.')) });
  }
  return { table, filters, onConflict, limit };
}

const matches = (row, filters) =>
  filters.every(({ column, operator, value }) => {
    const compare = OPERATORS[operator];
    if (!compare) throw new Error(`The sandbox does not implement the "${operator}" filter.`);
    return compare(row[column], value);
  });

/**
 * @param {object} [options]
 * @param {() => Date} [options.now] the clock the sandbox stamps rows with
 */
export function createBillingSandbox({ now = () => new Date() } = {}) {
  /** Supabase tables, as plain arrays. */
  const tables = {
    billing_events: [],
    billing_customers: [],
    billing_subscriptions: [],
  };
  /** Auth identities that exist. Deleting one is how account deletion is simulated. */
  const users = new Set();
  /** Stripe objects, by id. */
  const subscriptions = new Map();
  /** Every alert `notify()` delivered, in order. */
  const alerts = [];
  /** Every request the code under test made, for assertions about *how* it asked. */
  const requests = [];
  /** Stripe reads that should fail, by object id — a deleted subscription, say. */
  const unreadableSubscriptions = new Set();

  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  function restQuery(path, method, body, prefer) {
    const { table, filters, onConflict, limit } = parsePath(path);
    const rows = tables[table];
    if (!rows) throw new Error(`The sandbox has no "${table}" table.`);

    if (method === 'GET') {
      const found = rows.filter((row) => matches(row, filters));
      return limit ? found.slice(0, limit) : found;
    }

    if (method === 'POST') {
      const incoming = Array.isArray(body) ? body : [body];
      const key = onConflict;
      const written = [];
      for (const record of incoming) {
        const existing = key ? rows.find((row) => row[key] === record[key]) : null;
        if (!existing) {
          rows.push({ ...record });
          written.push({ ...record });
          continue;
        }
        // `ignore-duplicates` is the claim: the row already exists, so nothing
        // is written and nothing comes back. That empty array is what tells
        // `claimBillingEvent` somebody else owns this event.
        if (String(prefer).includes('ignore-duplicates')) continue;
        Object.assign(existing, record);
        written.push({ ...existing });
      }
      return String(prefer).includes('return=representation') ? written : [];
    }

    if (method === 'PATCH') {
      const affected = rows.filter((row) => matches(row, filters));
      for (const row of affected) Object.assign(row, body);
      return String(prefer).includes('return=representation') ? affected.map((row) => ({ ...row })) : [];
    }

    throw new Error(`The sandbox does not implement ${method} on the REST API.`);
  }

  async function handle(url, options = {}) {
    const target = String(url);
    const method = options.method ?? 'GET';
    const prefer = options.headers?.Prefer ?? options.headers?.prefer ?? '';
    requests.push({ target, method });

    // --- Supabase, REST
    const restAt = target.indexOf('/rest/v1/');
    if (restAt >= 0) {
      const path = target.slice(restAt + '/rest/v1/'.length);
      const body = options.body ? JSON.parse(options.body) : null;
      return json(restQuery(path, method, body, prefer));
    }

    // --- Supabase, auth admin: does this identity still exist?
    const adminAt = target.indexOf('/auth/v1/admin/users/');
    if (adminAt >= 0) {
      const userId = decodeURIComponent(target.slice(adminAt + '/auth/v1/admin/users/'.length));
      if (method === 'DELETE') {
        users.delete(userId);
        return json({});
      }
      return users.has(userId) ? json({ id: userId }) : json({ error: 'not found' }, 404);
    }

    // --- Stripe
    if (target.startsWith(STRIPE_API)) {
      const path = target.slice(STRIPE_API.length);
      const [resource, id] = path.split('/');
      if (resource === 'subscriptions' && id) {
        if (unreadableSubscriptions.has(id)) return json({ error: { message: 'No such subscription' } }, 404);
        const subscription = subscriptions.get(id);
        return subscription ? json(subscription) : json({ error: { message: 'No such subscription' } }, 404);
      }
      if (resource === 'customers') return json({ id: id || 'cus_sandbox' });
      throw new Error(`The sandbox does not implement Stripe ${method} /${path}.`);
    }

    // --- the operational alert webhook
    if (target === process.env.OPS_ALERT_WEBHOOK) {
      alerts.push(JSON.parse(options.body));
      return json({ ok: true });
    }

    throw new Error(`The sandbox was asked for an address it does not serve: ${target}`);
  }

  let previousFetch = null;
  return {
    tables,
    users,
    subscriptions,
    alerts,
    requests,
    unreadableSubscriptions,
    now,

    install() {
      previousFetch = globalThis.fetch;
      globalThis.fetch = handle;
      return this;
    },
    restore() {
      if (previousFetch) globalThis.fetch = previousFetch;
      previousFetch = null;
    },

    /** The local entitlement row for a subscription, which is what access reads. */
    entitlementFor(subscriptionId) {
      return (
        tables.billing_subscriptions.find((row) => row.stripe_subscription_id === subscriptionId) ?? null
      );
    },
    /** The ledger row for an event, which is what makes redelivery safe. */
    ledgerFor(eventId) {
      return tables.billing_events.find((row) => row.stripe_event_id === eventId) ?? null;
    },
    alertKinds() {
      return alerts.map((alert) => alert.kind);
    },
  };
}
