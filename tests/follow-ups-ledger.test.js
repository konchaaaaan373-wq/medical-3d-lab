import test from 'node:test';
import assert from 'node:assert/strict';

import { auditFollowUps, auditFollowUpsFile, duplicateNumbers, followUpProblems, parseFollowUps } from '../scripts/lib/follow-ups.mjs';

/**
 * The follow-ups ledger's numbers have to mean one thing each.
 *
 * Every other guarantee about that ledger is a judgement — is the item still
 * true, still open, worth keeping — and none of them can be checked here. This
 * checks the one thing that can be, and that nothing checked until now: two
 * items sharing a number, each branch green on its own.
 */

test('the ledger has no duplicate number the baseline does not already record', () => {
  const { problems, items, duplicates } = auditFollowUpsFile(
    new URL('../docs/follow-ups.md', import.meta.url).pathname,
    new URL('./follow-ups-duplicates-baseline.json', import.meta.url).pathname,
  );
  assert.deepEqual(problems, []);

  // Something was actually read: an empty parse satisfies the assertion above
  // it while measuring nothing, which is the lesson ledger's L-01.
  assert.ok(items.length >= 100, `only ${items.length} item(s) parsed`);
  assert.ok(duplicates.length > 0, 'the baseline records a real debt; an empty one means the parse stopped working');
});

test('a number used twice is reported, and names both items', () => {
  const markdown = [
    '### F-1 the first thing',
    'body',
    '### F-2 something else',
    'body',
    '### F-1 the second thing',
    'body',
  ].join('\n');
  const { problems } = auditFollowUps({ markdown });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /F-1 \(line 5\) "the second thing"/);
  assert.match(problems[0], /already used by "the first thing" \(line 1\)/);
});

test('a duplicate in the baseline passes, and one beside it still fails', () => {
  // The baseline is a debt, not an amnesty: recording F-1 must not quiet F-2.
  const markdown = ['### F-1 a', '### F-1 b', '### F-2 c', '### F-2 d'].join('\n');
  const baseline = { duplicates: ['F-1 b'] };
  const problems = followUpProblems(duplicateNumbers(parseFollowUps(markdown)), baseline);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /F-2 \(line 4\) "d"/);
});

test('a baseline entry that is no longer duplicated is reported too', () => {
  // Otherwise the list never gets shorter: a fixed collision would sit in it
  // forever, and the number it records would stop meaning anything.
  const problems = followUpProblems(duplicateNumbers(parseFollowUps('### F-1 a\n')), { duplicates: ['F-1 b'] });
  assert.deepEqual(problems, [
    '"F-1 b" is no longer a duplicate; delete its baseline entry (npm run follow-ups -- --write)',
  ]);
});

test('an example inside a fence is not an item', () => {
  // The document explains its own format; counting the explanation would make
  // the ledger describe itself.
  const markdown = ['```', '### F-1 how to write one', '```', '### F-1 the only real item'].join('\n');
  const { problems, items } = auditFollowUps({ markdown });
  assert.deepEqual(problems, []);
  assert.deepEqual(items.map((item) => item.line), [4]);
});

test('an empty ledger is a failure, not a pass', () => {
  // A parser that silently matches nothing is how a green check measures
  // nothing at all.
  assert.deepEqual(auditFollowUps({ markdown: '# no items here\n' }).problems, [
    'the ledger has no items in it at all',
  ]);
  assert.deepEqual(parseFollowUps('# nothing'), []);
});
