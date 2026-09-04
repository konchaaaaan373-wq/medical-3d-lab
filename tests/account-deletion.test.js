import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  deleteStripeCustomer,
  deleteSupabaseUser,
  supabaseUserExists,
  verifySupabasePassword,
} from '../netlify/lib/account.js';

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
  ]) {
    if (originalEnv[name] == null) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
}

test.afterEach(restore);

test('account deletion: Stripe Customer is deleted with server credentials and missing is idempotent', async () => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_example';
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return new Response(JSON.stringify({ error: { code: 'resource_missing' } }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result = await deleteStripeCustomer('cus_deleted');
  assert.equal(result.deleted, true);
  assert.equal(result.alreadyMissing, true);
  assert.equal(calls[0].options.method, 'DELETE');
  assert.match(calls[0].options.headers.Authorization, /^Bearer sk_test_example$/);
  assert.match(calls[0].url, /\/v1\/customers\/cus_deleted$/);
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
  const stripe = source.indexOf('await deleteStripeCustomer(customerId)');
  const auth = source.indexOf('await deleteSupabaseUser(user.id)');
  assert.ok(stripe >= 0 && auth > stripe, 'Stripe billing must close before Auth deletion');
});

test('webhook refuses to recreate billing state for deleted Auth users', () => {
  const source = readFileSync(new URL('../netlify/functions/stripe-webhook.js', import.meta.url), 'utf8');
  assert.match(source, /supabaseUserExists/);
  assert.match(source, /status: 'ignored', reason: 'deleted_user'/);
  assert.match(source, /liveSubscriptionOwnerId/);
});
