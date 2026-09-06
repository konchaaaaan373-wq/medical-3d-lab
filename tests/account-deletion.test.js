import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  deleteStripeCustomer,
  deleteSupabaseUser,
  supabaseUserExists,
  verifySupabasePassword,
} from '../netlify/lib/account.js';
import deleteAccount from '../netlify/functions/delete-account.js';
import { billingCustomerFor } from '../netlify/lib/billing.js';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

function restore() {
  globalThis.fetch = originalFetch;
  for (const name of [
    'SUPABASE_URL',
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_TEST_SECRET_KEY_FOR_DELETION',
    'STRIPE_LIVE_SECRET_KEY_FOR_DELETION',
  ]) {
    if (originalEnv[name] == null) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
}

test.afterEach(restore);

test('account deletion: verified Stripe Customer absence is idempotent', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_example';
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify({ error: { code: 'resource_missing' } }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result = await deleteStripeCustomer('cus_deleted', { allowMissing: true });
  assert.equal(result.deleted, true);
  assert.equal(result.alreadyMissing, true);
  assert.equal(calls[0].options.method, 'DELETE');
  assert.match(calls[0].options.headers.Authorization, /^Bearer sk_test_example$/);
  assert.match(calls[0].url, /\/v1\/customers\/cus_deleted$/);
});

test('account deletion: unverified Stripe Customer absence fails closed', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_example';
  globalThis.fetch = async () => response({ error: { code: 'resource_missing' } }, 404);
  await assert.rejects(
    deleteStripeCustomer('cus_unknown'),
    (error) => error.code === 'unverified_customer_absence'
  );
});

test('account deletion: Supabase Auth deletion uses the server-only admin endpoint', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_example';
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify({ id: 'user-1' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  await deleteSupabaseUser('user-1');
  assert.equal(calls[0].options.method, 'DELETE');
  assert.equal(calls[0].options.headers.apikey, 'sb_secret_example');
  assert.match(calls[0].url, /\/auth\/v1\/admin\/users\/user-1$/);
});

test('account deletion: a deleted Auth identity is distinguishable from an infrastructure failure', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_example';
  globalThis.fetch = async () => new Response('', { status: 404 });
  assert.equal(await supabaseUserExists('gone'), false);
});

test('account deletion: current password is verified and the temporary session is revoked', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_example';
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(
      JSON.stringify(String(url).includes('/token?') ? { access_token: 'temporary-token' } : {}),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };
  assert.equal(await verifySupabasePassword('user@example.com', 'current-password'), true);
  assert.match(calls[0].url, /grant_type=password/);
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    email: 'user@example.com',
    password: 'current-password',
  });
  assert.match(calls[1].url, /\/logout\?scope=local$/);
  assert.equal(calls[1].options.headers.Authorization, 'Bearer temporary-token');
});

test('account deletion endpoint closes Stripe before deleting Auth', () => {
  const source = readFileSync(new URL('../netlify/functions/delete-account.js', import.meta.url), 'utf8');
  assert.match(source, /verifySupabasePassword/);
  assert.match(source, /reauthenticationRequired: true/);
  assert.match(source, /deployContext !== 'production'/);
  const lock = source.indexOf("await supabaseAdmin('billing_account_deletions?on_conflict=user_id'");
  const stripe = source.indexOf('await deleteStripeCustomer(customer.stripe_customer_id');
  const auth = source.indexOf('await deleteSupabaseUser(user.id)');
  assert.ok(lock >= 0 && stripe > lock, 'Checkout must lock before Stripe billing closes');
  assert.ok(auth > stripe, 'Stripe billing must close before Auth deletion');
});

test('account deletion: the database prevents Checkout from racing the destructive request', () => {
  const migration = readFileSync(
    new URL(
      '../supabase/migrations/20260906043135_billing_account_deletion_lock.sql',
      import.meta.url
    ),
    'utf8'
  );
  assert.match(migration, /create table if not exists public\.billing_account_deletions/i);
  assert.match(migration, /references auth\.users\(id\) on delete cascade/i);
  assert.match(migration, /before insert or update on public\.billing_checkout_attempts/i);
  assert.match(migration, /Account deletion is in progress\./);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all .* from public, anon, authenticated/i);
  const checkout = readFileSync(
    new URL('../netlify/functions/create-checkout.js', import.meta.url),
    'utf8'
  );
  const deletionGate = checkout.indexOf('billing_account_deletions?user_id=eq.');
  const stripeCustomer = checkout.indexOf('billingCustomerFor(user');
  const stripeSession = checkout.indexOf("stripePost('checkout/sessions'");
  assert.ok(deletionGate >= 0 && stripeCustomer > deletionGate && stripeSession > deletionGate);
  assert.match(checkout, /accountDeletionPending: true/);

  const customerMigration = readFileSync(
    new URL(
      '../supabase/migrations/20260906043927_billing_customer_deletion_lock.sql',
      import.meta.url
    ),
    'utf8'
  );
  assert.match(customerMigration, /before insert or update on public\.billing_customers/i);
  assert.match(customerMigration, /block_checkout_during_account_deletion/i);

  const transactionMigration = readFileSync(
    new URL(
      '../supabase/migrations/20260906045116_billing_account_transaction_lock.sql',
      import.meta.url
    ),
    'utf8'
  );
  assert.match(transactionMigration, /pg_advisory_xact_lock\(hashtextextended\(new\.user_id::text, 0\)\)/i);
  assert.match(transactionMigration, /before insert on public\.billing_account_deletions/i);
  assert.match(transactionMigration, /tg_table_name = 'billing_customers'/i);
  assert.match(transactionMigration, /new\.stripe_customer_id is not distinct from old\.stripe_customer_id/i);

  const provenanceMigration = readFileSync(
    new URL(
      '../supabase/migrations/20260906050213_billing_stripe_account_provenance.sql',
      import.meta.url
    ),
    'utf8'
  );
  assert.match(provenanceMigration, /add column if not exists stripe_account_id text/i);
  assert.match(provenanceMigration, /\^acct_\[A-Za-z0-9\]\+\$/);
});

test('account deletion: personal data is attached only after Customer ownership is durable', async () => {
  const calls = [];
  const admin = async (path, options = {}) => {
    calls.push({ kind: 'database', path, options });
    if (!options.method) return [];
    return null;
  };
  const post = async (path, params, options = {}) => {
    calls.push({ kind: 'stripe', path, params, options });
    return path === 'customers' ? { id: 'cus_anonymous' } : { id: 'cus_anonymous' };
  };

  const result = await billingCustomerFor(
    { id: 'user-private', email: 'private@example.com' },
    { mode: 'test', admin, post }
  );

  assert.equal(result, 'cus_anonymous');
  const creation = calls.find((call) => call.path === 'customers');
  const ownership = calls.find(
    (call) => call.kind === 'database' && call.options.method === 'POST'
  );
  const enrichment = calls.find((call) => call.path === 'customers/cus_anonymous');
  assert.deepEqual(creation.params, {});
  assert.doesNotMatch(JSON.stringify(creation), /user-private|private@example\.com/);
  assert.ok(calls.indexOf(creation) < calls.indexOf(ownership));
  assert.ok(calls.indexOf(ownership) < calls.indexOf(enrichment));
  assert.equal(enrichment.params.email, 'private@example.com');
  assert.equal(enrichment.params['metadata[supabase_user_id]'], 'user-private');
});

test('account deletion: a losing Customer race never sends personal data to Stripe', async () => {
  const stripeCalls = [];
  const admin = async (_path, options = {}) => {
    if (!options.method) return [];
    throw new Error('Account deletion is in progress.');
  };
  const post = async (path, params, options = {}) => {
    stripeCalls.push({ path, params, options });
    return { id: 'cus_unowned' };
  };

  await assert.rejects(
    billingCustomerFor(
      { id: 'user-losing-race', email: 'losing@example.com' },
      { mode: 'test', admin, post }
    ),
    /Account deletion is in progress/
  );
  assert.equal(stripeCalls.length, 1);
  assert.equal(stripeCalls[0].path, 'customers');
  assert.deepEqual(stripeCalls[0].params, {});
  assert.doesNotMatch(JSON.stringify(stripeCalls), /user-losing-race|losing@example\.com/);
});

test('account deletion: a free account remains deletable without Stripe configuration', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_example';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_example';
  delete process.env.STRIPE_SECRET_KEY;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    calls.push({ target, options });
    if (target.endsWith('/auth/v1/user')) {
      return response({ id: 'user-free', email: 'free@example.com' });
    }
    if (target.includes('/auth/v1/token?grant_type=password')) {
      return response({ access_token: 'temporary-token' });
    }
    if (target.includes('/auth/v1/logout?scope=local')) return response({});
    if (target.includes('/rest/v1/billing_account_deletions?')) return response([]);
    if (target.includes('/rest/v1/billing_customers?')) return response([]);
    if (target.endsWith('/auth/v1/admin/users/user-free') && options.method === 'DELETE') {
      return response({ id: 'user-free' });
    }
    throw new Error(`Unexpected request: ${options.method ?? 'GET'} ${target}`);
  };

  const result = await deleteAccount(
    new Request('https://medical3dlab.example/.netlify/functions/delete-account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer current-session', 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'current-password' }),
    }),
    { deploy: { context: 'production' } }
  );

  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { deleted: true });
  const lock = calls.find((call) => call.target.includes('/rest/v1/billing_account_deletions?'));
  const customerRead = calls.find((call) => call.target.includes('/rest/v1/billing_customers?'));
  assert.equal(lock.options.method, 'POST');
  assert.ok(calls.indexOf(lock) < calls.indexOf(customerRead));
  assert.ok(calls.some((call) => call.target.includes('stripe_account_id')));
  assert.equal(calls.some((call) => call.target.includes('api.stripe.com')), false);
});

test('account deletion: every stored Stripe mode closes before Auth is deleted', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_example';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_example';
  process.env.STRIPE_SECRET_KEY = 'rk_live_primary';
  process.env.STRIPE_TEST_SECRET_KEY_FOR_DELETION = 'rk_test_cleanup';
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    calls.push({ target, options });
    if (target.endsWith('/auth/v1/user')) {
      return response({ id: 'user-both', email: 'both@example.com' });
    }
    if (target.includes('/auth/v1/token?grant_type=password')) {
      return response({ access_token: 'temporary-token' });
    }
    if (target.includes('/auth/v1/logout?scope=local')) return response({});
    if (target.includes('/rest/v1/billing_account_deletions?')) return response([]);
    if (target.includes('/rest/v1/billing_customers?')) {
      return response([
        { stripe_customer_id: 'cus_live', stripe_mode: 'live', stripe_account_id: 'acct_live' },
        { stripe_customer_id: 'cus_test', stripe_mode: 'test', stripe_account_id: 'acct_test' },
      ]);
    }
    if (target.endsWith('/v1/account')) {
      return response({
        id: options.headers.Authorization === 'Bearer rk_live_primary'
          ? 'acct_live'
          : 'acct_test',
      });
    }
    if (target.includes('api.stripe.com/v1/customers/cus_live')) {
      assert.equal(options.headers.Authorization, 'Bearer rk_live_primary');
      return response({ id: 'cus_live', deleted: true });
    }
    if (target.includes('api.stripe.com/v1/customers/cus_test')) {
      assert.equal(options.headers.Authorization, 'Bearer rk_test_cleanup');
      return response({ id: 'cus_test', deleted: true });
    }
    if (target.endsWith('/auth/v1/admin/users/user-both') && options.method === 'DELETE') {
      return response({ id: 'user-both' });
    }
    throw new Error(`Unexpected request: ${options.method ?? 'GET'} ${target}`);
  };

  const result = await deleteAccount(
    new Request('https://medical3dlab.example/.netlify/functions/delete-account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer current-session', 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'current-password' }),
    }),
    { deploy: { context: 'production' } }
  );

  assert.equal(result.status, 200);
  const stripeDeletes = calls.filter(
    (call) => call.target.includes('/v1/customers/') && call.options.method === 'DELETE'
  );
  const authDelete = calls.find(
    (call) => call.target.endsWith('/auth/v1/admin/users/user-both') && call.options.method === 'DELETE'
  );
  assert.equal(stripeDeletes.length, 2);
  assert.ok(stripeDeletes.every((call) => calls.indexOf(call) < calls.indexOf(authDelete)));
});

test('account deletion: missing access to one stored Stripe mode keeps Auth intact', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_example';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_example';
  process.env.STRIPE_SECRET_KEY = 'rk_live_primary';
  delete process.env.STRIPE_TEST_SECRET_KEY_FOR_DELETION;
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    calls.push({ target, options });
    if (target.endsWith('/auth/v1/user')) {
      return response({ id: 'user-both', email: 'both@example.com' });
    }
    if (target.includes('/auth/v1/token?grant_type=password')) {
      return response({ access_token: 'temporary-token' });
    }
    if (target.includes('/auth/v1/logout?scope=local')) return response({});
    if (target.includes('/rest/v1/billing_account_deletions?')) return response([]);
    if (target.includes('/rest/v1/billing_customers?')) {
      return response([
        { stripe_customer_id: 'cus_live', stripe_mode: 'live', stripe_account_id: 'acct_live' },
        { stripe_customer_id: 'cus_test', stripe_mode: 'test', stripe_account_id: 'acct_test' },
      ]);
    }
    throw new Error(`Unexpected request: ${options.method ?? 'GET'} ${target}`);
  };

  const result = await deleteAccount(
    new Request('https://medical3dlab.example/.netlify/functions/delete-account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer current-session', 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'current-password' }),
    }),
    { deploy: { context: 'production' } }
  );

  assert.equal(result.status, 503);
  assert.equal(calls.some((call) => call.target.includes('api.stripe.com')), false);
  assert.equal(calls.some((call) => call.target.includes('/auth/v1/admin/users/')), false);
});

test('account deletion: a same-mode key from another Stripe account keeps Auth intact', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_example';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_example';
  process.env.STRIPE_SECRET_KEY = 'rk_live_wrong_account';
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    calls.push({ target, options });
    if (target.endsWith('/auth/v1/user')) {
      return response({ id: 'user-provenance', email: 'provenance@example.com' });
    }
    if (target.includes('/auth/v1/token?grant_type=password')) {
      return response({ access_token: 'temporary-token' });
    }
    if (target.includes('/auth/v1/logout?scope=local')) return response({});
    if (target.includes('/rest/v1/billing_account_deletions?')) return response([]);
    if (target.includes('/rest/v1/billing_customers?')) {
      return response([{
        stripe_customer_id: 'cus_real',
        stripe_mode: 'live',
        stripe_account_id: 'acct_expected',
      }]);
    }
    if (target.endsWith('/v1/account')) return response({ id: 'acct_wrong' });
    throw new Error(`Unexpected request: ${options.method ?? 'GET'} ${target}`);
  };

  const result = await deleteAccount(
    new Request('https://medical3dlab.example/.netlify/functions/delete-account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer current-session', 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'current-password' }),
    }),
    { deploy: { context: 'production' } }
  );

  assert.equal(result.status, 503);
  assert.equal(calls.some((call) => call.options.method === 'DELETE'), false);
  assert.equal(calls.some((call) => call.target.includes('/auth/v1/admin/users/')), false);
});

test('account deletion: legacy Customer provenance is verified and saved before deletion', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_example';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_example';
  process.env.STRIPE_SECRET_KEY = 'rk_live_primary';
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    const target = String(url);
    calls.push({ target, options });
    if (target.endsWith('/auth/v1/user')) {
      return response({ id: 'user-legacy', email: 'legacy@example.com' });
    }
    if (target.includes('/auth/v1/token?grant_type=password')) {
      return response({ access_token: 'temporary-token' });
    }
    if (target.includes('/auth/v1/logout?scope=local')) return response({});
    if (target.includes('/rest/v1/billing_account_deletions?')) return response([]);
    if (target.includes('/rest/v1/billing_customers?') && options.method === 'GET') {
      return response([{
        stripe_customer_id: 'cus_legacy',
        stripe_mode: 'live',
        stripe_account_id: null,
      }]);
    }
    if (target.includes('/rest/v1/billing_customers?') && options.method === 'PATCH') {
      assert.deepEqual(JSON.parse(options.body), { stripe_account_id: 'acct_verified' });
      return response([]);
    }
    if (target.endsWith('/v1/account')) return response({ id: 'acct_verified' });
    if (target.endsWith('/v1/customers/cus_legacy') && !options.method) {
      return response({
        id: 'cus_legacy',
        livemode: true,
        metadata: { supabase_user_id: 'user-legacy', stripe_mode: 'live' },
      });
    }
    if (target.endsWith('/v1/customers/cus_legacy') && options.method === 'DELETE') {
      return response({ id: 'cus_legacy', deleted: true });
    }
    if (target.endsWith('/auth/v1/admin/users/user-legacy') && options.method === 'DELETE') {
      return response({ id: 'user-legacy' });
    }
    throw new Error(`Unexpected request: ${options.method ?? 'GET'} ${target}`);
  };

  const result = await deleteAccount(
    new Request('https://medical3dlab.example/.netlify/functions/delete-account', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer current-session', 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'current-password' }),
    }),
    { deploy: { context: 'production' } }
  );

  assert.equal(result.status, 200);
  const provenance = calls.find(
    (call) => call.target.includes('/rest/v1/billing_customers?') && call.options.method === 'PATCH'
  );
  const stripeDelete = calls.find(
    (call) => call.target.endsWith('/v1/customers/cus_legacy') && call.options.method === 'DELETE'
  );
  assert.ok(calls.indexOf(provenance) < calls.indexOf(stripeDelete));
});

test('account deletion: signed-in users can reach a password-confirmed destructive UI', () => {
  const source = readFileSync(new URL('../src/access/AccessManager.js', import.meta.url), 'utf8');
  assert.match(source, /Delete account \/ アカウント削除/);
  assert.match(source, /autocomplete: 'current-password'/);
  assert.match(source, /authenticatedFetch\('\/.netlify\/functions\/delete-account'/);
  assert.match(source, /method: 'DELETE'/);
  assert.match(source, /JSON\.stringify\(\{ password: currentPassword \}\)/);
  const confirmed = source.indexOf("data.deleted !== true");
  const localSignOut = source.indexOf('signOut();', confirmed);
  const invalidation = source.indexOf('invalidateSessionState();', localSignOut);
  assert.ok(confirmed >= 0 && localSignOut > confirmed && invalidation > localSignOut);
});

test('webhook refuses to recreate billing state for deleted Auth users', () => {
  const source = readFileSync(new URL('../netlify/functions/stripe-webhook.js', import.meta.url), 'utf8');
  assert.match(source, /supabaseUserExists/);
  assert.match(source, /status: 'ignored', reason: 'deleted_user'/);
  assert.match(source, /liveSubscriptionOwnerId/);
});

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
