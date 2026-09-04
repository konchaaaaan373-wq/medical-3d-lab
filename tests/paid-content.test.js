import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import paidContent, { entitledGuide } from '../netlify/functions/paid-content.js';

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const name of [
    'SUPABASE_URL',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_SECRET_KEY',
    'STRIPE_SECRET_KEY',
  ]) {
    if (originalEnv[name] == null) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
});

function configure() {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_example';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_example';
  process.env.STRIPE_SECRET_KEY = 'rk_test_example';
}

test('paid content: guide data requires a current entitlement', () => {
  const result = entitledGuide({
    sceneId: 'copd-hyperinflation',
    type: 'patient',
    subscriptions: [{ entitlement: 'patient', status: 'active' }],
    features: { patient: true },
  });
  assert.equal(result.allowed, true);
  assert.ok(result.guide.steps.length > 0);
});

test('paid content: free or suspended access cannot retrieve a paid guide', () => {
  const base = { sceneId: 'copd-hyperinflation', type: 'patient', features: { patient: true } };
  assert.equal(entitledGuide({ ...base, subscriptions: [] }).reason, 'forbidden');
  assert.equal(
    entitledGuide({
      ...base,
      subscriptions: [{ entitlement: 'patient', status: 'active', access_suspended_reason: 'dispute' }],
    }).reason,
    'forbidden'
  );
});

test('paid content: unavailable clinical-review content fails closed before billing lookup', async () => {
  configure();
  const calls = [];
  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return response({ id: '11111111-1111-1111-1111-111111111111' });
  };
  const result = await paidContent(new Request(
    'https://medical3dlab.example/.netlify/functions/paid-content?scene=copd-hyperinflation&type=patient',
    { headers: { Authorization: 'Bearer access-token' } }
  ));
  assert.equal(result.status, 404);
  assert.equal(calls.some((target) => target.includes('/rest/v1/')), false);
});

test('paid content: authored guides are no longer imported into the browser access installer', () => {
  const source = readFileSync(new URL('../src/access/installAccess.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /data\/(?:patient|education)Guides/);
  assert.match(source, /\.netlify\/functions\/paid-content/);
  assert.match(
    source,
    /const panel = await ensureGuide\(\);\s*if \(!panel \|\| !access\.has\(ENTITLEMENT\.PATIENT\)\) return;\s*openGuide\(\);/
  );
  assert.match(
    source,
    /const panel = await ensureGuide\(\);\s*if \(!panel \|\| !access\.has\(ENTITLEMENT\.EDUCATION\)\) return;\s*openGuide\(\);/
  );
});

test('paid content: logout invalidates every in-flight entitlement refresh', () => {
  const source = readFileSync(new URL('../src/access/AccessManager.js', import.meta.url), 'utf8');
  const authSource = readFileSync(new URL('../src/access/auth.js', import.meta.url), 'utf8');
  assert.match(source, /const generation = \+\+refreshGeneration/);
  assert.match(source, /if \(generation !== refreshGeneration\) return \{ reconciliationSucceeded: false, stale: true \};/);
  assert.match(source, /function invalidateSessionState\(\) \{[\s\S]*refreshGeneration \+= 1;/);
  assert.match(source, /signOut\(\);\s*invalidateSessionState\(\);\s*notify\(\);/);
  assert.match(authSource, /function store\(session\) \{[\s\S]*sessionGeneration \+= 1;/);
  assert.match(authSource, /const generation = sessionGeneration;[\s\S]*if \(generation !== sessionGeneration\) return null;[\s\S]*store\(next\);/);
});

function response(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
