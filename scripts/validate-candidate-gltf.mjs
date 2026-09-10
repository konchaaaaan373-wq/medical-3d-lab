#!/usr/bin/env node
/**
 * Run the Khronos glTF Validator over the candidate assets, and **fail when it
 * fails**.
 *
 *   npm i --no-save gltf-validator
 *   npm run assets:dev
 *   npm run assets:validate                 # writes the reports, exits non-zero on errors
 *   npm run assets:validate -- --quiet      # exit code only
 *
 * ## Exit codes are the point
 *
 * The first version of this script printed two reports and exited 0 whatever
 * they said, so a candidate with 408 validator errors passed a green CLI. Now:
 *
 *   0  every file validated with **no errors**
 *   1  at least one file produced **errors** — the report is still written
 *   2  **could not run**: a file is missing, or the validator is not installed
 *
 * Those are three different facts and a caller has to be able to tell them
 * apart. "Could not run" is never reported as "passed", and it is never
 * reported as "failed" either.
 *
 * **Warnings do not change the exit code.** Only `numErrors` does. Warnings,
 * infos and hints are counted, written into the report, and printed; the line
 * between "this file is invalid glTF" and "this file could be tidier" is the
 * validator's own, and it is not moved here.
 *
 * ## What is written, and what is not touched
 *
 * For each input: the raw JSON report exactly as the validator returned it, the
 * SHA-256 of the bytes that were validated, the validator's own version string
 * and its timestamp. Reports go to `docs/asset-qa/measurements/`. **The source
 * GLBs are opened read-only and are never rewritten** — this script does not
 * repair anybody's data, and a failing gate is a decision for a person.
 *
 * Passing this says nothing about licences, anatomy or publication. The release
 * gate is elsewhere and stays shut.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';

/** What each exit code means, in one place, so the messages and the codes agree. */
export const EXIT = Object.freeze({ OK: 0, INVALID: 1, CANNOT_RUN: 2 });

const DEFAULT_INPUTS = [
  'dev-assets/heart/VH_M_Heart.glb',
  'dev-assets/heart/VH_M_Blood_Vasculature.glb',
];
const REPORT_DIR = 'docs/asset-qa/measurements';

/**
 * Validate a list of files and report what happened. Pure of process concerns:
 * it takes its validator and its file reader, so a test can hand it a double
 * and check the outcome without a real GLB.
 *
 * @param {object} options
 * @param {string[]} options.inputs
 * @param {{validateBytes: Function}|null} options.validator null when it could not be loaded
 * @param {(path: string) => Promise<Uint8Array>} options.read
 * @param {(path: string, text: string) => Promise<void>} [options.write] omitted to skip saving
 * @returns {Promise<{status: 'ok'|'invalid'|'cannot-run', exitCode: number, files: object[], reason?: string}>}
 */
export async function validateFiles({ inputs, validator, read, write = null }) {
  if (!validator) {
    return {
      status: 'cannot-run',
      exitCode: EXIT.CANNOT_RUN,
      files: [],
      reason: 'the glTF Validator is not installed (npm i --no-save gltf-validator)',
    };
  }

  const files = [];
  for (const path of inputs) {
    let bytes;
    try {
      bytes = await read(path);
    } catch (error) {
      files.push({ path, status: 'cannot-run', reason: `could not be read: ${error.message}` });
      continue;
    }
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    let report;
    try {
      report = await validator.validateBytes(new Uint8Array(bytes), {
        uri: path,
        externalResourceFunction: () => Promise.reject(new Error('no external resources are expected')),
      });
    } catch (error) {
      files.push({ path, sha256, status: 'cannot-run', reason: `the validator threw: ${error.message}` });
      continue;
    }
    const issues = report.issues ?? {};
    const errors = issues.numErrors ?? 0;
    const entry = {
      path,
      sha256,
      bytes: bytes.length,
      status: errors > 0 ? 'invalid' : 'ok',
      validatorVersion: report.validatorVersion ?? null,
      validatedAt: report.validatedAt ?? null,
      errors,
      warnings: issues.numWarnings ?? 0,
      infos: issues.numInfos ?? 0,
      hints: issues.numHints ?? 0,
      // What the errors are, and where — enough to act on without the raw file.
      errorCodes: countBy((issues.messages ?? []).filter((m) => m.severity === 0), (m) => m.code),
      report,
    };
    if (write) {
      const name = `gltf-validator-${basename(path).replace(/\.[^.]+$/, '')}.json`;
      entry.reportPath = `${REPORT_DIR}/${name}`;
      await write(entry.reportPath, `${JSON.stringify({
        path, sha256, bytes: bytes.length, validatorVersion: entry.validatorVersion,
        validatedAt: entry.validatedAt, report,
      }, null, 1)}\n`);
    }
    files.push(entry);
  }

  // Order matters: a file nobody could read is not a file that passed, and it
  // is not a file that failed either.
  if (files.some((f) => f.status === 'cannot-run')) {
    return {
      status: 'cannot-run',
      exitCode: EXIT.CANNOT_RUN,
      files,
      reason: files.find((f) => f.status === 'cannot-run').reason,
    };
  }
  if (files.some((f) => f.status === 'invalid')) return { status: 'invalid', exitCode: EXIT.INVALID, files };
  return { status: 'ok', exitCode: EXIT.OK, files };
}

function countBy(items, key) {
  const out = {};
  for (const item of items) out[key(item)] = (out[key(item)] ?? 0) + 1;
  return out;
}

/** Human-readable, and the same facts as the exit code. */
export function formatOutcome(outcome) {
  const lines = [];
  for (const file of outcome.files) {
    if (file.status === 'cannot-run') {
      lines.push(`  cannot run  ${file.path} — ${file.reason}`);
      continue;
    }
    lines.push(
      `  ${file.status === 'ok' ? 'ok        ' : 'INVALID   '}  ${file.path}`,
      `              sha256 ${file.sha256}`,
      `              validator ${file.validatorVersion} at ${file.validatedAt}`,
      `              errors ${file.errors}  warnings ${file.warnings}  infos ${file.infos}  hints ${file.hints}`
    );
    const codes = Object.entries(file.errorCodes ?? {});
    if (codes.length) lines.push(`              error codes: ${codes.map(([c, n]) => `${c} x${n}`).join(', ')}`);
    if (file.reportPath) lines.push(`              report ${file.reportPath}`);
  }
  const verdict = {
    ok: 'PASS — every file validated with no errors.',
    invalid: 'FAIL — at least one file produced validator errors. The source files are unchanged; '
      + 'what to do about them is a decision, not a repair this script makes.',
    'cannot-run': `COULD NOT RUN — ${outcome.reason}. This is neither a pass nor a fail.`,
  }[outcome.status];
  lines.push('', verdict);
  return lines.join('\n');
}

/* c8 ignore start — the process wrapper; the logic above is what tests drive. */
const invokedDirectly = process.argv[1] && process.argv[1].endsWith('validate-candidate-gltf.mjs');
if (invokedDirectly) {
  const args = process.argv.slice(2);
  const quiet = args.includes('--quiet');
  const inputs = args.filter((a) => !a.startsWith('--'));
  let loaded = null;
  try {
    loaded = (await import('gltf-validator')).default;
  } catch {
    loaded = null;
  }
  await mkdir(REPORT_DIR, { recursive: true });
  const outcome = await validateFiles({
    inputs: inputs.length ? inputs : DEFAULT_INPUTS,
    validator: loaded,
    read: (path) => readFile(path),
    write: (path, text) => writeFile(path, text),
  });
  if (!quiet) console.log(formatOutcome(outcome));
  process.exit(outcome.exitCode);
}
/* c8 ignore stop */
