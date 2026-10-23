import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * One Node version, read by everything that runs this repository's code.
 *
 * Until 2026-10-22 every workflow said `node-version: 22` — twelve copies —
 * while Netlify built the site and ran its functions on whatever version the
 * site happened to be pinned to, which nothing in the repository stated. CI
 * being green said nothing about the Node that ships, and the hourly
 * `scheduled-billing-reconcile` runs on the build's Node (Netlify derives the
 * functions runtime from it unless `AWS_LAMBDA_JS_RUNTIME` is set in the UI —
 * F-277 holds that half, which no file here can see).
 *
 * `.nvmrc` is the version. Netlify reads it ahead of a `NODE_VERSION` set in
 * the UI, and every `actions/setup-node` step reads it through
 * `node-version-file`, so changing Node is a one-line commit. What this file
 * pins is that nothing grows a second copy.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const WORKFLOWS = '.github/workflows';
const workflowFiles = readdirSync(join(ROOT, WORKFLOWS))
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => `${WORKFLOWS}/${name}`);

/**
 * The first major of each `actions/*` action whose `action.yml` runs on Node
 * 24. Older majors target Node 20, which GitHub deprecated and now force-runs
 * on 24 with a warning on every job (seen on `main` up to run 840). An action
 * that is not listed fails below rather than being waved through.
 */
const FIRST_NODE24_MAJOR = Object.freeze({
  checkout: 5,
  'setup-node': 5,
  'upload-artifact': 6,
});

/** Each `- uses: actions/setup-node@…` step, with the lines that belong to it. */
function setupNodeSteps(source) {
  const lines = source.split('\n');
  const steps = [];
  lines.forEach((line, index) => {
    const start = line.match(/^(\s*)- uses: actions\/setup-node@/);
    if (!start) return;
    const indent = start[1].length;
    const body = [];
    for (const next of lines.slice(index + 1)) {
      if (next.trim() !== '' && next.search(/\S/) <= indent) break;
      body.push(next);
    }
    steps.push({ line: index + 1, body: body.join('\n') });
  });
  return steps;
}

test('node runtime: `.nvmrc` names one LTS major and is the only version file', () => {
  const version = read('.nvmrc').trim();
  // A bare major: Netlify resolves it and so does setup-node, each to the
  // newest patch — which is how a security release arrives without a commit.
  // A range (`>=24`) is not understood by Netlify; an exact patch goes stale.
  assert.match(version, /^\d+$/, `.nvmrc must be a bare major such as "24", not "${version}"`);
  assert.equal(Number(version) % 2, 0, `Node ${version} is an odd major — odd majors never become LTS`);
  // Netlify reads `.node-version` too. Two files are two answers.
  assert.equal(existsSync(join(ROOT, '.node-version')), false, 'remove .node-version — .nvmrc is the version');
});

test('node runtime: every workflow sets Node up from `.nvmrc`, never from a literal', () => {
  let found = 0;
  for (const file of workflowFiles) {
    const source = read(file);
    for (const step of setupNodeSteps(source)) {
      found += 1;
      assert.match(
        step.body,
        /^\s*node-version-file:\s*\.nvmrc\s*$/m,
        `${file}:${step.line} — setup-node must read node-version-file: .nvmrc`
      );
    }
    assert.doesNotMatch(
      source,
      /^\s*node-version:/m,
      `${file} — a literal node-version is a second copy of .nvmrc`
    );
  }
  // Not vacuous: if the step parser stops matching, this goes red instead of
  // reporting that zero steps all agree.
  assert.ok(found > 0, 'no actions/setup-node step was found — the parser no longer matches the workflows');
});

test('node runtime: every actions/* step is a major that runs on Node 24', () => {
  for (const file of workflowFiles) {
    for (const [, name, major] of read(file).matchAll(/uses:\s*actions\/([\w-]+)@v(\d+)/g)) {
      const minimum = FIRST_NODE24_MAJOR[name];
      assert.ok(minimum, `${file} uses actions/${name}, which has no entry in FIRST_NODE24_MAJOR — look up the major whose action.yml says node24 and add it`);
      assert.ok(
        Number(major) >= minimum,
        `${file} uses actions/${name}@v${major}, which runs on Node 20 — v${minimum} is the first on Node 24`
      );
    }
  }
});

test('node runtime: netlify.toml does not set a Node version of its own', () => {
  const netlify = read('netlify.toml')
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');
  // NODE_VERSION here would be a second copy that `.nvmrc` silently outranks.
  // AWS_LAMBDA_JS_RUNTIME is not read from this file at all — it only works
  // from the UI, which is why F-277 exists.
  assert.doesNotMatch(netlify, /\bNODE_VERSION\b/, 'netlify.toml sets NODE_VERSION — .nvmrc is the version');
  assert.doesNotMatch(netlify, /\bAWS_LAMBDA_JS_RUNTIME\b/, 'AWS_LAMBDA_JS_RUNTIME is ignored in netlify.toml');
});
