import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PUBLIC_DIAGNOSTIC_ALLOWED_FIELDS,
  browserFamilyMajor,
  buildPublicDiagnosticText,
  copyPublicDiagnostic,
  normalizeDiagnosticState,
} from '../src/app/publicDiagnostics.js';

test('browser family is coarse and major-version only', () => {
  assert.equal(browserFamilyMajor('Mozilla/5.0 Chrome/151.0.8123.1 Safari/537.36'), 'Chrome 151');
  assert.equal(browserFamilyMajor('Mozilla/5.0 Version/18.6 Safari/605.1.15'), 'Safari 18');
  assert.equal(browserFamilyMajor('Mozilla/5.0 Firefox/143.0'), 'Firefox 143');
  assert.equal(browserFamilyMajor('Mozilla/5.0 Edg/151.0.1.2 Chrome/151.0.1.2'), 'Edge 151');
});

test('unknown states fail closed', () => {
  assert.equal(normalizeDiagnosticState('READY'), 'ready');
  assert.equal(normalizeDiagnosticState('renderer exploded'), 'unknown');
});

test('diagnostic output ignores fields outside the explicit allowlist', () => {
  const output = buildPublicDiagnosticText({
    modelId: 'brain-anatomy',
    build: 'e98c6c7',
    revision: 'brain-r7',
    language: 'ja',
    state: 'error',
    browser: 'Chrome 151',
    steps: 'モデルを開く→情報を見る→戻る',
    url: 'https://example.invalid/#/brain?token=secret',
    token: 'secret',
    cookie: 'session=secret',
    userId: 'u-123',
    selectedStructure: 'hippocampus',
    stack: 'raw stack',
  });
  assert.match(output, /model: brain-anatomy/);
  assert.match(output, /state: error/);
  assert.match(output, /モデルを開く/);
  for (const forbidden of ['example.invalid', 'token=secret', 'session=secret', 'u-123', 'hippocampus', 'raw stack']) {
    assert.equal(output.includes(forbidden), false, forbidden);
  }
});

test('allowlist is exactly the B5 diagnostic fields', () => {
  assert.deepEqual([...PUBLIC_DIAGNOSTIC_ALLOWED_FIELDS], [
    'modelId', 'build', 'revision', 'language', 'state', 'browser', 'steps',
  ]);
});

test('copy succeeds only after Clipboard write resolves', async () => {
  const calls = [];
  const clipboard = { async writeText(text) { calls.push(text); } };
  assert.equal(await copyPublicDiagnostic('safe', clipboard), true);
  assert.deepEqual(calls, ['safe']);
});

test('clipboard refusal remains a failure', async () => {
  const clipboard = { async writeText() { throw new Error('denied'); } };
  await assert.rejects(() => copyPublicDiagnostic('safe', clipboard), /denied/);
});
