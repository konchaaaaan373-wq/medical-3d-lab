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
const METADATA = read('scripts/site-metadata.js');

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
  //
  // In `headTags`, which every emitter shares — **not** in a
  // `transformIndexHtml` hook, which only ever sees `index.html` while the
  // four crawlable `/s/<slug>/` pages are written by `generateBundle`. The
  // first version stamped one page in five and said "every page" in its own
  // comment.
  for (const name of ['build-context', 'build-commit', 'build-review']) {
    assert.ok(METADATA.includes(`'${name}'`), `the shared head tags do not stamp ${name}`);
  }
  assert.match(
    METADATA,
    /\.\.\.buildStampTags\(\)/,
    'the stamp is defined but never added to the tags every page gets',
  );
  // From the environment the deploy runs in, not from configuration somebody
  // has to remember to set. `vite.config.js` carries the same three into the
  // bundle, for the on-screen marker.
  for (const variable of ['CONTEXT', 'COMMIT_REF', 'REVIEW_ID']) {
    assert.ok(METADATA.includes(`process.env.${variable}`), `the head tags ignore ${variable}`);
    assert.ok(VITE.includes(`process.env.${variable}`), `the bundle ignores ${variable}`);
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

  // And the class has to reach it, from **every** script that captures.
  // `is-capture` on `#ui` cannot: the marker is deliberately not inside `#ui`.
  // Checking one script left the other free to grow the marker in every frame
  // it takes, with `npm test` still green.
  for (const script of ['scripts/capture-anatomy-views.mjs', 'scripts/capture-phone-states.mjs']) {
    assert.match(
      read(script),
      /document\.body\.classList\.(toggle|add)\('is-capture'/,
      `${script} never puts is-capture where it can reach the build marker`,
    );
  }
});

test('the marker does not sit on the controls it shares a screen with', () => {
  // Measured, then fixed: at 390×844 the fixed chip landed inside the console
  // (704–832) and covered the clinical-use line. There is no free corner while
  // the controls are shown — the navigation holds the top, the console holds
  // the bottom — so the layout gives it room instead.
  const rule = ruleFor(BASE, 'body.has-build-marker .console');
  assert.ok(rule, 'nothing makes room for the marker, so it overlaps the console');
  assert.match(declaration(rule.body, 'margin-bottom') ?? '', /^\d+px$/);
  assert.match(
    MAIN,
    /classList\.add\('has-build-marker'\)/,
    'the class the layout reacts to is never set',
  );
});
