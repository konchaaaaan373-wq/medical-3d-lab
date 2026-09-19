import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { declaration, rulesOf } from '../scripts/lib/css.mjs';
import { BUILD_CONTEXT, buildLabel, isProductionBuild } from '../src/app/buildIdentity.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * "Which build am I looking at?"
 *
 * Twice, the same screen was reported as broken and answered as fixed, and
 * both were right: the address was a deploy preview of a pull request merged
 * before the fix, and a merged PR's preview never rebuilds. Nothing on the
 * page said which build it was, so the only way to know was to read the
 * address bar and go and check what that PR contained
 * (`docs/verification-lessons.md` L-51).
 *
 * The answer now travels in the build itself. These hold the three places it
 * has to survive: the module that reads it, the page that shows it, and the
 * stylesheet that keeps it visible exactly where the reporting happens.
 */
const MARKER = read('src/components/BuildMarker.js');
const MAIN = read('src/main.js');
const BASE = read('src/styles/base.css');
const VITE = read('vite.config.js');

const ruleFor = (css, selectors) =>
  [...rulesOf(css)].filter((rule) => rule.selectors === selectors).at(-1);

test('an unstamped build is not production', () => {
  // `node --test` never runs the `define`, so the constants are absent here —
  // which is the same position a build on a host that is not Netlify is in.
  // The fallback has to be the cautious one: a build nobody stamped is not the
  // published site, and says so.
  assert.equal(BUILD_CONTEXT, 'local');
  assert.equal(isProductionBuild(), false);
  assert.match(buildLabel(), /ローカル版/);
  assert.match(buildLabel(true), /Local build/);
});

test('the build states its identity where a request can read it, not only a browser', () => {
  // A meta tag, so `curl`, CI or `verify:live` can answer "which build is
  // served here?" without running the page. The three names are the contract.
  for (const name of ['build-context', 'build-commit', 'build-review']) {
    assert.ok(VITE.includes(`name="${name}"`), `the build does not stamp ${name} into the HTML`);
  }
  // From the environment the deploy runs in, not from configuration somebody
  // has to remember to set.
  for (const variable of ['CONTEXT', 'COMMIT_REF', 'REVIEW_ID']) {
    assert.ok(VITE.includes(`process.env.${variable}`), `the build ignores ${variable}`);
  }
});

test('production shows nothing, and every other build shows itself', () => {
  assert.match(
    MARKER,
    /if \(isProductionBuild\(\)\) return null;/,
    'the marker does not exempt the published site, so production would carry it',
  );
  assert.match(MAIN, /createBuildMarker\(\)/, 'nothing mounts the build marker');
});

test('the marker survives hiding the controls, because that is the screenshot people send', () => {
  // Outside `#ui`, which is what `#ui.is-hidden > *` empties. Inside it, the
  // one state most likely to be reported would be the one state that does not
  // say which build it is.
  assert.match(
    MAIN,
    /document\.body\.append\(buildMarker\)/,
    'the marker is mounted somewhere hiding the controls can reach',
  );
  const rule = ruleFor(BASE, '.build-marker');
  assert.ok(rule, 'the marker has no placement of its own');
  assert.equal(declaration(rule.body, 'position'), 'fixed');
  // Opposite corner from the way back, which is pinned bottom-right.
  assert.match(declaration(rule.body, 'left') ?? '', /env\(safe-area-inset-/);
  // It says something; it is not something to press.
  assert.equal(declaration(rule.body, 'pointer-events'), 'none');
});

test('a scripted capture still gets a clean frame', () => {
  const rule = ruleFor(BASE, 'body.is-capture .build-marker');
  assert.ok(rule, 'nothing clears the marker for a scripted capture');
  assert.equal(declaration(rule.body, 'display'), 'none');

  // And the class has to reach it. `is-capture` on `#ui` cannot: the marker is
  // deliberately not inside `#ui`.
  const capture = read('scripts/capture-anatomy-views.mjs');
  assert.match(
    capture,
    /document\.body\.classList\.toggle\('is-capture'/,
    'the capture script sets the class only where it cannot reach the marker',
  );
});
