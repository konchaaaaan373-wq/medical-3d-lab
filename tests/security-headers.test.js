import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
const csp = headers.match(/Content-Security-Policy:\s*(.+)/)?.[1] ?? '';

test('security headers: scripts stay same-origin and WebAssembly is the only eval-like exception', () => {
  assert.match(csp, /script-src 'self' 'wasm-unsafe-eval'/);
  assert.ok(!csp.includes("'unsafe-eval'"));
  assert.ok(!/script-src[^\n;]*\*/.test(csp));
});

test('security headers: Supabase auth is allowed without opening arbitrary network access', () => {
  assert.match(csp, /connect-src 'self' https:\/\/\*\.supabase\.co/);
  assert.ok(!/connect-src[^\n;]*\s\*/.test(csp));
});

test('security headers: the app cannot be framed or load plugin objects', () => {
  assert.match(csp, /frame-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(headers, /X-Frame-Options:\s*DENY/);
});

test('security headers: privacy and transport defaults are explicit', () => {
  assert.match(headers, /X-Content-Type-Options:\s*nosniff/);
  assert.match(headers, /Referrer-Policy:\s*strict-origin-when-cross-origin/);
  assert.match(headers, /Permissions-Policy:\s*camera=\(\), microphone=\(\), geolocation=\(\), payment=\(\)/);
  assert.match(headers, /Strict-Transport-Security:\s*max-age=31536000/);
});
