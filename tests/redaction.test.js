import test from 'node:test';
import assert from 'node:assert/strict';

import {
  REDACTED,
  fingerprint,
  looksSensitive,
  redactStack,
  redactText,
  redactUrl,
  stableHash,
} from '../src/telemetry/redact.js';

test('redact: an email address never survives', () => {
  assert.equal(redactText('mail dr.smith+lab@hospital.example.org now'), `mail ${REDACTED.email} now`);
  assert.ok(!looksSensitive(redactText('contact a@b.co')));
});

test('redact: the recovery token this app puts in the URL hash is removed', () => {
  const hash = '#access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.c2lnbmF0dXJl&type=recovery';
  const clean = redactText(hash);
  assert.ok(!clean.includes('eyJhbGciOiJIUzI1NiJ9'), clean);
  assert.ok(!looksSensitive(clean));
});

test('redact: provider keys and billing identifiers are removed', () => {
  for (const secret of ['sk_live_abcd1234efgh', 'pk_test_zzzz9999yyyy', 'whsec_abcdefgh12345678']) {
    const clean = redactText(`failed with ${secret}`);
    assert.ok(!clean.includes(secret), clean);
  }
  assert.equal(redactText('customer cus_ABCDEFGHIJKL missing'), `customer ${REDACTED.key} missing`);
});

test('redact: an Authorization header value is removed but the scheme is kept', () => {
  assert.equal(
    redactText('Authorization: Bearer abcdefghijklmnop'),
    `Authorization: Bearer ${REDACTED.token}`
  );
});

test('redact: named credentials in a query keep their key and lose their value', () => {
  const clean = redactText('?api_key=abcdef123456&password=hunter2');
  assert.match(clean, /api_key=\[token\]/);
  assert.match(clean, /password=\[token\]/);
  assert.ok(!clean.includes('hunter2'));
});

test('redact: identifiers that could be a person are removed', () => {
  assert.equal(redactText('record 1234567890 admitted'), `record ${REDACTED.digits} admitted`);
  assert.equal(
    redactText('id 3f2504e0-4f89-11d3-9a0c-0305e82c3301'),
    `id ${REDACTED.uuid}`
  );
  assert.equal(redactText('from 192.168.10.4'), `from ${REDACTED.ip}`);
});

test('redact: a developer home directory is reduced to the file that failed', () => {
  const clean = redactText('at build (/home/somebody/work/lab/src/app/Viewer.js:12:3)');
  assert.ok(!clean.includes('somebody'));
  assert.match(clean, /app\/Viewer\.js:12:3/);
});

test('redact: an unremarkable message is left alone', () => {
  const message = 'WebGL context could not be created';
  assert.equal(redactText(message), message);
});

test('redactUrl: the query string is always dropped', () => {
  assert.equal(redactUrl('https://lab.example/app?account=recovery'), `https://lab.example/app${REDACTED.query}`);
});

test('redactUrl: a route hash is kept because it says what failed', () => {
  assert.equal(redactUrl('https://lab.example/#/heart-failure'), 'https://lab.example/#/heart-failure');
  assert.equal(redactUrl('https://lab.example/#/organs'), 'https://lab.example/#/organs');
});

test('redactUrl: a hash that is not a route is dropped whole', () => {
  const url = 'https://lab.example/#access_token=eyJhbGciOi.eyJzdWIi.c2ln&expires_in=3600';
  assert.equal(redactUrl(url), `https://lab.example/${REDACTED.hash}`);
});

test('redactUrl: nonsense in, nothing dangerous out', () => {
  assert.equal(redactUrl(''), '');
  assert.equal(redactUrl(null), '');
  assert.ok(!looksSensitive(redactUrl('not a url at all a@b.com')));
});

test('redactStack: frames are redacted, trimmed and capped', () => {
  const stack = [
    'Error: failed for user@example.com',
    ...Array.from({ length: 20 }, (_, i) => `    at frame${i} (/home/dev/app/src/x.js:${i}:1)`),
  ].join('\n');
  const frames = redactStack(stack);
  assert.equal(frames.length, 8);
  assert.ok(frames.every((frame) => !looksSensitive(frame)), frames.join('\n'));
  assert.equal(redactStack(null).length, 0);
});

test('redactStack: an http URL inside a frame keeps its route and loses its query', () => {
  const frames = redactStack('at tick (https://lab.example/assets/App-abc.js?token=secret123456:4:9)');
  assert.ok(!frames[0].includes('secret123456'), frames[0]);
});

test('fingerprint: the same bug with different tokens groups together', () => {
  const a = fingerprint({ name: 'TypeError', message: 'no session for alice@x.com', frames: ['at f'] });
  const b = fingerprint({ name: 'TypeError', message: 'no session for bob@y.org', frames: ['at f'] });
  assert.equal(a, b);
});

test('fingerprint: instance numbers do not split a group, but a different bug does', () => {
  const a = fingerprint({ name: 'RangeError', message: 'index 4 out of bounds', frames: ['at f'] });
  const b = fingerprint({ name: 'RangeError', message: 'index 91 out of bounds', frames: ['at f'] });
  const c = fingerprint({ name: 'RangeError', message: 'index 4 out of bounds', frames: ['at g'] });
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('fingerprint: always an eight character hex id', () => {
  for (const input of [{}, { name: 'X' }, { message: 'y' }]) {
    assert.match(fingerprint(input), /^[0-9a-f]{8}$/);
  }
});

test('stableHash: same input, same output, across calls', () => {
  assert.equal(stableHash('medical-3d-lab'), stableHash('medical-3d-lab'));
  assert.notEqual(stableHash('a'), stableHash('b'));
});

test('redact: a realistic worst-case report leaves nothing sensitive behind', () => {
  const message =
    'POST /billing failed for nurse@clinic.example (cus_ABCDEFGHIJKL, sk_live_9f8e7d6c5b4a) ' +
    'token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcdefghijkl from 10.0.0.42 ' +
    'in /Users/dev/lab/src/access/auth.js, record 987654321000';
  const clean = redactText(message);
  assert.ok(!looksSensitive(clean), clean);
  for (const secret of ['nurse@clinic.example', 'sk_live_9f8e7d6c5b4a', 'eyJhbGciOiJIUzI1NiJ9', '/Users/dev']) {
    assert.ok(!clean.includes(secret), `${secret} survived: ${clean}`);
  }
});
