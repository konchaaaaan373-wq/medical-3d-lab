import test from 'node:test';
import assert from 'node:assert/strict';

import { EXIT, formatOutcome, validateFiles } from '../scripts/validate-candidate-gltf.mjs';

/**
 * The validator CLI's three outcomes, and that they are three.
 *
 * The first version printed two reports and exited 0 whatever they said, so a
 * candidate with 408 validator errors passed a green command. These tests drive
 * the logic with a validator double, because the point is the outcome, not the
 * validator: a real run needs a real GLB, which is not committed.
 */

const bytes = (n = 8) => new Uint8Array(n).fill(1);

/** A validator double that answers however the test needs it to. */
const doubleFor = (byPath) => ({
  validateBytes: async (_data, { uri }) => {
    const answer = byPath[uri];
    if (typeof answer === 'function') return answer();
    return answer;
  },
});

const report = ({ errors = 0, warnings = 0, infos = 0, hints = 0, codes = [] }) => ({
  validatorVersion: '2.0.0-dev.3.10',
  validatedAt: '2026-09-10T00:00:00.000Z',
  issues: {
    numErrors: errors,
    numWarnings: warnings,
    numInfos: infos,
    numHints: hints,
    messages: codes.map((code) => ({ severity: 0, code, message: code, pointer: '/meshes/0' })),
  },
});

const read = async () => bytes();

test('validator CLI: no errors is exit 0', async () => {
  const outcome = await validateFiles({
    inputs: ['a.glb', 'b.glb'],
    validator: doubleFor({ 'a.glb': report({}), 'b.glb': report({ warnings: 5, infos: 700, hints: 3 }) }),
    read,
  });
  assert.equal(outcome.status, 'ok');
  assert.equal(outcome.exitCode, EXIT.OK);
  assert.equal(outcome.exitCode, 0);
  assert.deepEqual(outcome.files.map((f) => f.status), ['ok', 'ok']);
  assert.match(formatOutcome(outcome), /PASS/);
});

test('validator CLI: warnings do not fail the run, and errors do', async () => {
  // The line between invalid glTF and untidy glTF is the validator's, and it is
  // not moved here. Only numErrors changes the exit code.
  const warned = await validateFiles({
    inputs: ['w.glb'],
    validator: doubleFor({ 'w.glb': report({ warnings: 42 }) }),
    read,
  });
  assert.equal(warned.exitCode, EXIT.OK, '42 warnings, no errors: still a pass');
  assert.equal(warned.files[0].warnings, 42);

  const failed = await validateFiles({
    inputs: ['x.glb'],
    validator: doubleFor({ 'x.glb': report({ errors: 1, codes: ['ACCESSOR_VECTOR3_NON_UNIT'] }) }),
    read,
  });
  assert.equal(failed.exitCode, EXIT.INVALID, 'one error is enough');
  assert.equal(failed.exitCode, 1);
});

test('validator CLI: the real candidates\' shape of failure exits 1 and is still reported', async () => {
  // The numbers the real files produce, as a double: 408 and 33 degenerate
  // normals. The run must fail *and* still say what it found.
  const outcome = await validateFiles({
    inputs: ['heart.glb', 'vessels.glb'],
    validator: doubleFor({
      'heart.glb': report({ errors: 408, hints: 3, codes: Array(408).fill('ACCESSOR_VECTOR3_NON_UNIT') }),
      'vessels.glb': report({ errors: 33, hints: 3, codes: Array(33).fill('ACCESSOR_VECTOR3_NON_UNIT') }),
    }),
    read,
  });
  assert.equal(outcome.exitCode, EXIT.INVALID);
  assert.equal(outcome.files[0].errors, 408);
  assert.equal(outcome.files[1].errors, 33);
  assert.deepEqual(outcome.files[0].errorCodes, { ACCESSOR_VECTOR3_NON_UNIT: 408 });

  const text = formatOutcome(outcome);
  assert.match(text, /FAIL/);
  assert.match(text, /errors 408/);
  assert.match(text, /errors 33/);
  assert.match(text, /source files are unchanged/, 'and it does not offer to repair anybody\'s data');
});

test('validator CLI: a mixed run fails on the one that failed', async () => {
  const outcome = await validateFiles({
    inputs: ['good.glb', 'bad.glb'],
    validator: doubleFor({ 'good.glb': report({}), 'bad.glb': report({ errors: 2, codes: ['X', 'Y'] }) }),
    read,
  });
  assert.equal(outcome.exitCode, EXIT.INVALID);
  assert.deepEqual(outcome.files.map((f) => f.status), ['ok', 'invalid']);
});

test('validator CLI: not being able to run is neither a pass nor a fail', async () => {
  const missing = await validateFiles({
    inputs: ['nope.glb'],
    validator: doubleFor({}),
    read: async () => { throw new Error('ENOENT: no such file'); },
  });
  assert.equal(missing.status, 'cannot-run');
  assert.equal(missing.exitCode, EXIT.CANNOT_RUN);
  assert.equal(missing.exitCode, 2);
  assert.match(formatOutcome(missing), /COULD NOT RUN/);
  assert.match(formatOutcome(missing), /neither a pass nor a fail/);

  const uninstalled = await validateFiles({ inputs: ['a.glb'], validator: null, read });
  assert.equal(uninstalled.exitCode, EXIT.CANNOT_RUN);
  assert.match(uninstalled.reason, /not installed/);

  const threw = await validateFiles({
    inputs: ['a.glb'],
    validator: { validateBytes: async () => { throw new Error('bad chunk'); } },
    read,
  });
  assert.equal(threw.exitCode, EXIT.CANNOT_RUN);
  assert.match(threw.files[0].reason, /the validator threw/);
});

test('validator CLI: a file that cannot be read outranks a file that failed', async () => {
  // Otherwise a run that could not see half its inputs would report the half it
  // did see as the whole answer.
  const outcome = await validateFiles({
    inputs: ['bad.glb', 'missing.glb'],
    validator: doubleFor({ 'bad.glb': report({ errors: 3, codes: ['X'] }) }),
    read: async (path) => {
      if (path === 'missing.glb') throw new Error('ENOENT');
      return bytes();
    },
  });
  assert.equal(outcome.status, 'cannot-run');
  assert.equal(outcome.exitCode, EXIT.CANNOT_RUN);
});

test('validator CLI: what is saved is the raw report, the input hash and the version', async () => {
  const written = new Map();
  const outcome = await validateFiles({
    inputs: ['dev-assets/heart/VH_M_Heart.glb'],
    validator: doubleFor({ 'dev-assets/heart/VH_M_Heart.glb': report({ errors: 1, codes: ['Z'] }) }),
    read,
    write: async (path, text) => written.set(path, text),
  });
  assert.equal(outcome.exitCode, EXIT.INVALID, 'saving happens on a failing run too');
  assert.equal(written.size, 1);
  const [path, text] = [...written.entries()][0];
  assert.match(path, /^docs\/asset-qa\/measurements\/gltf-validator-VH_M_Heart\.json$/);
  const saved = JSON.parse(text);
  assert.equal(saved.path, 'dev-assets/heart/VH_M_Heart.glb');
  assert.match(saved.sha256, /^[0-9a-f]{64}$/);
  assert.equal(saved.validatorVersion, '2.0.0-dev.3.10');
  assert.equal(saved.validatedAt, '2026-09-10T00:00:00.000Z');
  assert.equal(saved.report.issues.numErrors, 1, 'the raw report, not a summary of it');
});

test('validator CLI: the source files are only ever read', async () => {
  // A repair would be a change to somebody else's data made by a test runner.
  // The only writer this function has is the report writer, and it is only ever
  // handed a path under the measurements directory.
  const written = [];
  await validateFiles({
    inputs: ['dev-assets/heart/VH_M_Heart.glb'],
    validator: doubleFor({ 'dev-assets/heart/VH_M_Heart.glb': report({ errors: 5, codes: ['Z'] }) }),
    read,
    write: async (path) => written.push(path),
  });
  assert.equal(written.length, 1);
  for (const path of written) {
    assert.ok(path.startsWith('docs/asset-qa/measurements/'), path);
    assert.ok(!path.includes('dev-assets'), 'never writes where it read');
  }
});
