import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { DEPARTURE_BACKSTOP_MS } from '../src/app/departure.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * The browser half of the departure, and the contract between it and the code.
 *
 * `tests/departure.test.js` drives `installDeparture` against a stand-in window,
 * which can assert what the module does with a `pageshow` but cannot make a
 * browser emit one. `scripts/check-departure.mjs` is the other half. These are
 * the few things that have to agree between them, and that a unit test is the
 * right place to hold because they are facts about the source, not about a run.
 */

test('the check waits longer than the backstop it is waiting for', () => {
  const check = read('scripts/check-departure.mjs');
  const waits = Number(check.match(/await sleep\((\d+)_000\);/)?.[1]);
  assert.ok(waits, 'the check sleeps past the backstop before reading the veil');
  assert.ok(
    waits * 1000 > DEPARTURE_BACKSTOP_MS,
    `the check waits ${waits}s for a ${DEPARTURE_BACKSTOP_MS / 1000}s backstop, so it reads too early`
  );
});

test('the check answers the reload with 204 rather than failing or hanging it', () => {
  // Three wrong ways to say "the reload never lands", each wrong differently.
  // Aborting sends Chromium to its network-error page and takes the document
  // with it, so the veil reads as missing. Holding the request pending keeps
  // the document but Chromium defers script for a navigation in flight — not
  // `page.evaluate`, not `Runtime.evaluate` over CDP — so the page is there and
  // cannot be asked anything. And a pending route never released hangs
  // teardown. A 204 abandons the navigation and leaves the document scriptable,
  // which is what "asked for and never arrived" actually looks like.
  const check = read('scripts/check-departure.mjs');
  const backstop = check.slice(
    check.indexOf('// ------------------------------------------------------- the backstop'),
    check.indexOf('// ---------------------------------------------------------- BFCache')
  );
  // Comments off first. The block explains *why* aborting is wrong, so an
  // assertion that the word is absent matches the explanation and reports the
  // code as doing the thing it says not to.
  //
  // Line comments only. Stripping `/* ... */` as well ate nearly the whole
  // block, because `page.route('**/*')` contains `/*` and the non-greedy match
  // ran from there to the next `*/` it found. A glob is not a comment.
  const code = backstop
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');

  assert.match(code, /route\.fulfill\(\{ status: 204 \}\)/, 'the navigation is answered, not failed');
  assert.doesNotMatch(code, /route\.abort/, 'aborting would replace the document with an error page');
  assert.doesNotMatch(code, /hung\.push/, 'and holding it pending would make the page unaskable');
});

test('every read of the page can give up', () => {
  // Playwright puts no timeout on `evaluate` and will not run one while a
  // navigation is pending — which the backstop path arranges deliberately. A
  // bare `page.evaluate` there hangs the run instead of reporting, and it did.
  const check = read('scripts/check-departure.mjs');
  const body = check.slice(check.indexOf('try {'));
  const bareReads = [...body.matchAll(/await page\.evaluate\(VEIL\)/g)];
  assert.deepEqual(bareReads.map((match) => match[0]), [], 'reads go through `ask`, which times out');
  assert.match(check, /Promise\.race\(\[\s*page\.evaluate\(script\)/);
});

test('a path the browser will not enter is reported, not counted as a pass', () => {
  const check = read('scripts/check-departure.mjs');
  // Three outcomes, and the middle one has to exist: true, false, and "this
  // browser would not go there". Collapsing it into a pass is how a check comes
  // to certify something it never drove.
  assert.match(check, /ok === null \? 'skip '/);
  assert.match(check, /persisted !== true/, 'BFCache is only claimed when `persisted` says so');
  assert.match(check, /skipped\.length && strict/, 'and --strict can still demand all of them');
});
