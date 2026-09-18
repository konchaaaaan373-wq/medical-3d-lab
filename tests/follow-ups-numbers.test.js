import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * F numbers, counted rather than believed.
 *
 * `npm run lessons` has refused a reused L number for a long time, and the
 * result is visible: zero duplicated L numbers. Nothing ever counted the F
 * numbers, and the result is visible there too — **eighteen** of them are
 * used more than once, some three times.
 *
 * The ledger's own header said four. It is the document that owns the
 * numbering rule, and the number it stated was not one anybody had measured.
 * So the list below is the only place the duplicates are written down, and it
 * is checked against the file on every run.
 *
 * The list may only shrink. Fixing a duplicate means editing its line here,
 * which is the point: an exemption nobody can forget to remove.
 */

const ledger = readFileSync(new URL('../docs/follow-ups.md', import.meta.url), 'utf8');

const headings = [...ledger.matchAll(/^### F-(\d+)/gm)].map((match) => Number(match[1]));

const counted = new Map();
for (const number of headings) counted.set(number, (counted.get(number) ?? 0) + 1);

/**
 * How often each number already appears, as of 2026-09-17.
 *
 * These are not forgiven, only recorded: they were taken by parallel branches
 * that each merged, and renumbering them now would break every reference in
 * the conversations and pull requests that point at them. Which side moves is
 * the two owners' call, which is why this file records rather than decides.
 */
const ALREADY_TAKEN_TWICE = new Map([
  [25, 2],
  [40, 2],
  [42, 2],
  [43, 2],
  [44, 3],
  [45, 3],
  [46, 3],
  [47, 3],
  [87, 2],
  [88, 2],
  [89, 2],
  [90, 2],
  [92, 2],
  [93, 2],
  [97, 2],
  [101, 3],
  [103, 2],
  [106, 2],
]);

test('no F number is used more often than it already was', () => {
  const worse = [];
  for (const [number, times] of counted) {
    const allowed = ALREADY_TAKEN_TWICE.get(number) ?? 1;
    if (times > allowed) worse.push(`F-${number}: ${times} headings, ${allowed} expected`);
  }

  const free = Math.max(...headings) + 1;
  assert.deepEqual(
    worse,
    [],
    `a number is taken twice. Renumber this branch — the next free one is F-${free}, ` +
      'and read it off `main` rather than off a branch (L-16).\n  ' +
      worse.join('\n  ')
  );
});

test('the recorded duplicates are still duplicated, so the list can only shrink', () => {
  // Without this, a fixed duplicate leaves a permanent exemption behind and
  // the list slowly stops describing the file — which is how the header came
  // to say four when the answer was eighteen.
  const stale = [];
  for (const [number, times] of ALREADY_TAKEN_TWICE) {
    const now = counted.get(number) ?? 0;
    if (now !== times) stale.push(`F-${number}: ${now} headings now, this list still says ${times}`);
  }

  assert.deepEqual(
    stale,
    [],
    'a duplicate was fixed or moved without updating this list. Edit the line, or delete it ' +
      'if the number is now used once:\n  ' + stale.join('\n  ')
  );
});

test('the ledger points at this file instead of restating the count', () => {
  // The rule CLAUDE.md applies to the published scene list applies here for
  // the same reason: a number copied into prose is a number that stops being
  // true without anything going red.
  assert.match(
    ledger,
    /tests\/follow-ups-numbers\.test\.js/,
    'the ledger header names this file as where the duplicates are recorded'
  );
});
