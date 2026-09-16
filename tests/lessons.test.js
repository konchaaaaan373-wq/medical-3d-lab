import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { auditLessons, auditLedgerFile, guardKind, parseLessons, HUMAN_ONLY } from '../scripts/lib/lessons.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * The ledger of times a check was green while measuring nothing.
 *
 * Which makes this file the one most likely to be an example of its own
 * subject, so each case below is written to go red for a specific reason and
 * was confirmed to do so by breaking the thing it measures.
 */

test('the ledger is well-formed and every guard it names still exists', () => {
  const { problems, lessons, humanOnly } = auditLedgerFile(
    new URL('../docs/verification-lessons.md', import.meta.url).pathname,
    new URL('../package.json', import.meta.url).pathname,
  );
  assert.deepEqual(problems, []);

  // Something was actually read. An empty parse would satisfy every assertion
  // above it, which is L-01 — the lesson this file exists to not repeat.
  assert.ok(lessons.length >= 20, `only ${lessons.length} lesson(s) parsed`);
  assert.ok(humanOnly.length > 0, 'a ledger where everything is mechanically caught is not being honest');
});

test('a guard that left the repository fails the ledger', () => {
  // The decay this is built to stop: the file gets renamed, the lesson keeps
  // claiming it, and the next reader believes something is covered.
  const markdown = [
    '### L-99 something',
    '',
    '- **症状**: x',
    '- **どう見つかったか**: y',
    '- **いま何が捕まえるか**: `tests/gone.test.js` — z',
  ].join('\n');

  const gone = auditLessons({ markdown, exists: () => false });
  assert.equal(gone.problems.length, 1);
  assert.match(gone.problems[0], /`tests\/gone\.test\.js` is not in the repository/);

  const present = auditLessons({ markdown, exists: () => true });
  assert.deepEqual(present.problems, [], 'and it passes when the file is there');
});

test('an npm script guard has to be a script that exists', () => {
  const markdown = [
    '### L-99 something',
    '',
    '- **症状**: x',
    '- **どう見つかったか**: y',
    '- **いま何が捕まえるか**: `npm run verify:invented` — z',
  ].join('\n');

  assert.match(
    auditLessons({ markdown, scripts: ['test'] }).problems[0],
    /is not a script in package\.json/,
  );
  assert.deepEqual(auditLessons({ markdown, scripts: ['verify:invented'] }).problems, []);
});

test('a lesson that claims coverage without naming it is refused', () => {
  const vague = [
    '### L-99 something',
    '',
    '- **症状**: x',
    '- **どう見つかったか**: y',
    '- **いま何が捕まえるか**: テストが捕まえます',
  ].join('\n');
  assert.match(auditLessons({ markdown: vague }).problems[0], /names no guard/);

  // Saying "a person, and nothing else" is a complete answer. The count of
  // those is the number the loop is trying to bring down, and hiding one by
  // writing something vaguer would move the number the wrong way.
  const honest = vague.replace('テストが捕まえます', `**${HUMAN_ONLY}**`);
  const audited = auditLessons({ markdown: honest });
  assert.deepEqual(audited.problems, []);
  assert.deepEqual(audited.humanOnly, ['L-99 something']);
});

test('the three fields are all required', () => {
  for (const missing of ['症状', 'どう見つかったか', 'いま何が捕まえるか']) {
    const lines = [
      '### L-99 something',
      '',
      '- **症状**: x',
      '- **どう見つかったか**: y',
      '- **いま何が捕まえるか**: **人だけ**',
    ].filter((line) => !line.startsWith(`- **${missing}**`));
    const { problems } = auditLessons({ markdown: lines.join('\n') });
    assert.ok(
      problems.some((problem) => problem.includes(`no **${missing}** field`)),
      `a lesson with no ${missing} passed`,
    );
  }
});

test('a required field that is present but empty is refused', () => {
  // `- **症状**:` with nothing after it parses to an empty string, and a
  // `has()` check accepts it. The first version did, so the ledger reported
  // itself well-formed while an entry stated none of the three facts — this
  // file's own subject, found in review rather than by the loop.
  const empty = [
    '### L-99 something',
    '- **症状**:',
    '- **どう見つかったか**:   ',
    '- **いま何が捕まえるか**: **人だけ**',
  ].join('\n');
  const { problems } = auditLessons({ markdown: empty });
  assert.deepEqual(problems, [
    'L-99 (line 1): **症状** is empty',
    'L-99 (line 1): **どう見つかったか** is empty',
  ]);

  // But a field whose text starts on the wrapped next line is legal, so
  // emptiness is read after the parse rather than during it. Rejecting this
  // would push people to cram the first line, which is how L-02 got written.
  const wrapped = [
    '### L-99 something',
    '- **症状**:',
    '  the sentence starts here',
    '- **どう見つかったか**: y',
    '- **いま何が捕まえるか**: **人だけ**',
  ].join('\n');
  assert.deepEqual(auditLessons({ markdown: wrapped }).problems, []);
});

test('a number is never reused', () => {
  const twice = [
    '### L-99 first',
    '- **症状**: x',
    '- **どう見つかったか**: y',
    '- **いま何が捕まえるか**: **人だけ**',
    '',
    '### L-99 second',
    '- **症状**: x',
    '- **どう見つかったか**: y',
    '- **いま何が捕まえるか**: **人だけ**',
  ].join('\n');
  assert.match(auditLessons({ markdown: twice }).problems[0], /already used by "first"/);
});

test('a lesson inside a fenced block is not counted as a lesson', () => {
  // A worked example in a code block looks exactly like a lesson. Counting one
  // would make the ledger describe itself, and the placeholder guard in it
  // would resolve to nothing.
  //
  // The first version of this test asserted that the document's own template
  // was absent from the parse — which was true no matter what the parser did,
  // because `L-NN` never matches `L-\d+`. An absence asserted against an empty
  // set: L-01, in the file written to stop L-01. So the decoy below carries a
  // real number, and removing the fence handling makes this go red.
  const decoy = [
    '### L-07 a real lesson',
    '- **症状**: x',
    '- **どう見つかったか**: y',
    '- **いま何が捕まえるか**: **人だけ**',
    '',
    '```markdown',
    '### L-99 the worked example',
    '- **症状**: placeholder',
    '- **いま何が捕まえるか**: `path/to/invented.js`',
    '```',
  ].join('\n');

  const { lessons, problems } = auditLessons({ markdown: decoy, exists: () => false });
  assert.deepEqual(lessons.map((lesson) => lesson.id), ['L-07'], 'the fenced example was parsed');
  assert.deepEqual(problems, [], 'and its placeholder guard was resolved');

  // And the real document keeps its template inside a fence, so the rule above
  // is the one this ledger is actually written against.
  const ledger = read('docs/verification-lessons.md');
  const fenced = ledger.split('```').filter((_, index) => index % 2 === 1).join('\n');
  assert.match(fenced, /### L-NN/, 'the write-up template left its code block');
});

test('a guard named on a wrapped line is still read', () => {
  // The guard is usually the longest field and wraps. Reading only the first
  // line of a bullet would report "names no guard" for a lesson that names one
  // — a false failure that would teach people to write vaguer entries.
  const wrapped = [
    '### L-99 something',
    '- **症状**: x',
    '- **どう見つかったか**: y',
    '- **いま何が捕まえるか**: a sentence long enough that the path lands on',
    '  the next line: `tests/lessons.test.js` — and there it is',
  ].join('\n');
  assert.deepEqual(auditLessons({ markdown: wrapped, exists: () => true }).problems, []);
});

test('only the two checkable shapes are treated as guards', () => {
  // Everything else in backticks is prose about the guard — a function name, a
  // CSS selector, a flag — and resolving those would make the ledger unwritable.
  assert.equal(guardKind('tests/lessons.test.js'), 'path');
  assert.equal(guardKind('npm run lessons'), 'script');
  assert.equal(guardKind('sizeOf()'), null);
  assert.equal(guardKind('.feature-lock:not([hidden])'), null);
  assert.equal(guardKind('--locked'), null);
  // A bare filename with no directory is ambiguous, so it is prose too.
  assert.equal(guardKind('CLAUDE.md'), null);
});

test('CLAUDE.md sends a lesson to this ledger, and the ledger says how', () => {
  // The rule and the mechanism have to point at each other, or the rule is
  // advice. This is the one thing in the loop that a test can hold.
  const claude = read('CLAUDE.md');
  assert.match(claude, /docs\/verification-lessons\.md/, 'CLAUDE.md names the ledger');
  assert.match(claude, /npm run lessons/, 'and the command that checks it');

  const ledger = read('docs/verification-lessons.md');
  for (const step of ['ガードを書く', '壊す', '赤を確認する']) {
    assert.ok(ledger.includes(step), `the loop is missing "${step}"`);
  }
});
