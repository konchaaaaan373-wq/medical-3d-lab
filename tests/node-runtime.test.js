import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildNodeMajor, functionsNodeMajor, nodeStampProblems, nvmrcMajor } from '../scripts/node-runtime.js';
import { headTags } from '../scripts/site-metadata.js';

/**
 * One Node version, read by everything that runs this repository's code.
 *
 * Until 2026-10-22 every workflow said `node-version: 22` — twelve copies —
 * while Netlify built the site and ran its functions on whatever version the
 * site happened to be pinned to, which nothing in the repository stated. CI
 * being green said nothing about the Node that ships, and the hourly
 * `scheduled-billing-reconcile` runs on the build's Node (Netlify derives the
 * functions runtime from it unless `AWS_LAMBDA_JS_RUNTIME` is set in the UI).
 *
 * `.nvmrc` is the version. Netlify reads it ahead of a `NODE_VERSION` set in
 * the UI, and every `actions/setup-node` step reads it through
 * `node-version-file`, so changing Node is a one-line commit. What this file
 * pins is that nothing grows a second copy.
 *
 * The other half — what Netlify actually built on, and handed its functions —
 * the build now stamps into every page and `verify:live` reads back from the
 * live origin. The last four tests hold that chain.
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
  // from the UI, which is why the build stamps what it was given (below).
  assert.doesNotMatch(netlify, /\bNODE_VERSION\b/, 'netlify.toml sets NODE_VERSION — .nvmrc is the version');
  assert.doesNotMatch(netlify, /\bAWS_LAMBDA_JS_RUNTIME\b/, 'AWS_LAMBDA_JS_RUNTIME is ignored in netlify.toml');
});

test('node stamp: the functions get AWS_LAMBDA_JS_RUNTIME when it is set, the build\'s Node when not', () => {
  // The same rule as `getLambdaNodeVersion` in @netlify/build 37.6.1
  // (`plugins_core/functions/zisi.js`): the variable wins, otherwise the
  // build's own version is what the function bundler is given.
  assert.equal(functionsNodeMajor({}, '24'), '24');
  assert.equal(functionsNodeMajor({ AWS_LAMBDA_JS_RUNTIME: '' }, '24'), '24');
  assert.equal(functionsNodeMajor({ AWS_LAMBDA_JS_RUNTIME: 'nodejs22.x' }, '24'), '22');
  // An override with no number still overrides; it must not read as "24".
  assert.equal(functionsNodeMajor({ AWS_LAMBDA_JS_RUNTIME: 'latest' }, '24'), 'unparsed');
  assert.equal(buildNodeMajor({ node: '24.22.1' }), '24');
  assert.equal(nvmrcMajor('24\n'), '24');
  assert.equal(nvmrcMajor(read('.nvmrc')), read('.nvmrc').trim());
});

test('node stamp: a served build is held to .nvmrc, and each way it can miss is named', () => {
  const expected = '24';
  assert.deepEqual(nodeStampProblems({ buildNode: '24', functionsNode: '24', expected }), []);

  const [unstamped, ...rest] = nodeStampProblems({ buildNode: '', functionsNode: '', expected });
  assert.match(unstamped, /no build-node meta tag/);
  assert.equal(rest.length, 0, 'an unstamped build is one fact, not three');

  // Netlify built on another Node: NODE_VERSION in the UI, or .nvmrc unread.
  // Its functions followed the build, so both lines appear — and the second
  // must not blame AWS_LAMBDA_JS_RUNTIME, which is not what happened.
  const built22 = nodeStampProblems({ buildNode: '22', functionsNode: '22', expected });
  assert.equal(built22.length, 2);
  assert.match(built22[0], /made on Node 22, but \.nvmrc says 24/);
  assert.doesNotMatch(built22[1], /AWS_LAMBDA_JS_RUNTIME/);

  // The build obeyed .nvmrc but an override pinned the functions elsewhere.
  const pinned = nodeStampProblems({ buildNode: '24', functionsNode: '22', expected });
  assert.equal(pinned.length, 1);
  assert.match(pinned[0], /functions Node 22.*AWS_LAMBDA_JS_RUNTIME/);

  assert.match(nodeStampProblems({ buildNode: '24', functionsNode: '24', expected: '' })[0], /names no Node major/);
});

test('node stamp: every page carries both majors, from the build\'s own Node and environment', () => {
  const saved = process.env.AWS_LAMBDA_JS_RUNTIME;
  try {
    delete process.env.AWS_LAMBDA_JS_RUNTIME;
    const plain = headTags({ title: 't', description: 'd' }).join('\n');
    const major = process.versions.node.split('.')[0];
    assert.match(plain, new RegExp(`<meta name="build-node" content="${major}" />`));
    assert.match(plain, new RegExp(`<meta name="build-functions-node" content="${major}" />`));
    // A major, never the patch version: the repository is public and `.nvmrc`
    // already says the major; anything finer would say more than that.
    assert.doesNotMatch(plain, new RegExp(process.versions.node.replace(/\./g, '\\.')));

    process.env.AWS_LAMBDA_JS_RUNTIME = 'nodejs22.x';
    const pinned = headTags({ title: 't', description: 'd' }).join('\n');
    assert.match(pinned, /<meta name="build-functions-node" content="22" \/>/);
  } finally {
    if (saved === undefined) delete process.env.AWS_LAMBDA_JS_RUNTIME;
    else process.env.AWS_LAMBDA_JS_RUNTIME = saved;
  }
});

test('node stamp: verify:live reads both tags back and holds a production build to .nvmrc', () => {
  // The live check needs the network, so it cannot run here; what can rot
  // silently is the wiring — a tag renamed on one side, or the comparison
  // dropped while the line that prints the values stays.
  const live = read('scripts/check-live-site.mjs');
  for (const name of ['build-node', 'build-functions-node']) {
    assert.ok(live.includes(`'${name}'`), `verify:live never reads ${name}`);
  }
  assert.match(live, /nodeStampProblems\(/, 'verify:live reads the stamp but never judges it');
  assert.match(live, /nvmrcMajor\(readFileSync\(new URL\('\.\.\/\.nvmrc'/, 'verify:live does not read .nvmrc');
});
