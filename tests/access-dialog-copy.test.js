/**
 * The access dialog's "accounts are not configured yet" copy.
 *
 * `!authConfigured()` (`src/access/AccessManager.js`'s `dialogContent()`) is
 * the branch every visitor to this deployment actually sees today — Supabase
 * is not wired up, so `authConfigured()` is false for everyone, always. It
 * had no coverage at all before this file.
 *
 * `createAccessManager` cannot be built and opened here the way the rest of
 * the app can be exercised under `node --test`: `open()` and the dialog's
 * `keydown` handler use `document.activeElement instanceof HTMLElement`,
 * `node.getClientRects()` and `CSS.escape`, none of which the fake DOM in
 * `tests/helpers/fake-dom.js` provides (see `tests/language.test.js`'s
 * `AccessManager` test and `tests/credential-flow.test.js`'s header comment,
 * which hit the same wall and both fall back to source text — the latter
 * only got a *built* view by extracting `credentialForm` as a pure function,
 * which this branch has no equivalent of). Reproducing `HTMLElement`,
 * `getClientRects` and `CSS.escape` well enough to call `open()` for two
 * paragraphs of static copy is scaffolding this fix does not need: the
 * source is the assertable thing, as it already is for every other
 * `AccessManager` test.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * The literal body of `if (!authConfigured()) { ... }` inside
 * `dialogContent()`, found by brace-matching from the `if` rather than a
 * fixed line range, so this keeps working if unrelated code above it moves.
 */
function authNotConfiguredBranch(source) {
  const marker = 'if (!authConfigured()) {';
  const start = source.indexOf(marker);
  assert.ok(start >= 0, 'AccessManager.js no longer has an `if (!authConfigured())` branch in dialogContent()');
  let depth = 0;
  let i = start + marker.length - 1; // position of the opening `{`
  for (; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  assert.ok(depth === 0, 'unbalanced braces while scanning the !authConfigured() branch');
  return source.slice(start, i + 1);
}

test('access dialog: the not-configured branch tells a visitor what changes for them, in both languages', () => {
  const source = read('src/access/AccessManager.js');
  const branch = authNotConfiguredBranch(source);

  assert.ok(
    branch.includes(
      "el('p', { class: 'access-copy lang-en', text: 'Accounts are not available on this site yet, so neither sign-in nor sign-up works here. Published models remain available without signing in.' })"
    ),
    'the English copy is missing or no longer an exact match, in the !authConfigured() branch'
  );
  assert.ok(
    branch.includes(
      "el('p', { class: 'access-copy lang-ja', text: 'このサイトではまだアカウント機能（ログイン・登録）を提供していません。公開中のモデルはログインなしでご覧いただけます。' })"
    ),
    'the Japanese copy is missing or no longer an exact match, in the !authConfigured() branch'
  );
});

test('access dialog: the not-configured branch does not describe implementation status to a visitor', () => {
  // What it used to say (true, but not a visitor's business): the paywall UI
  // is installed, account access just is not configured on this deployment.
  // The branch's own `//` comments are allowed to *mention* that old wording
  // (as the one right above `if (!authConfigured())` does, explaining why it
  // changed) — what must not come back is the wording inside a rendered
  // `text:` string, so line comments are stripped before checking. See
  // docs/verification-lessons.md L-06: a `doesNotMatch` that matched the very
  // comment explaining why the old text is gone.
  const source = read('src/access/AccessManager.js');
  const branch = authNotConfiguredBranch(source);
  const withoutLineComments = branch
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');

  assert.ok(!withoutLineComments.includes('課金UIは実装済み'), 'the old Japanese "the paywall UI is installed" wording is back');
  assert.ok(!withoutLineComments.includes('paywall UI is installed'), 'the old English "the paywall UI is installed" wording is back');
});

test('access dialog: the not-configured branch still renders the dialog\'s close control', () => {
  // `dialogContent()` builds `head` (which contains `closeButton`) once,
  // above the `!authConfigured()` early return, and every branch — including
  // this one — must still hand it back, or a visitor who cannot sign in also
  // cannot close the dialog without it.
  const source = read('src/access/AccessManager.js');
  const branch = authNotConfiguredBranch(source);

  assert.match(
    branch,
    /return \[\s*head,/,
    'the !authConfigured() branch must still return `head` (which carries the close button) first'
  );
});
