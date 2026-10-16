import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { auditLedgerFile, auditRules, hasRealDate, malformedHeadings, nextId, parseRules } from '../scripts/lib/rules.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

/**
 * The ledger of what the owner decided to do from now on.
 *
 * Its one ordering rule — the newer date wins, and a replaced rule is archived
 * rather than deleted — is only mechanical while the shape below holds. Each
 * case was confirmed to go red by breaking the thing it measures.
 */

const entry = (id, title, fields) =>
  [`### ${id} — ${title}`, ...Object.entries(fields).map(([name, text]) => `- **${name}**: ${text}`), ''].join('\n');

const ok = { 決めたこと: 'x', なぜ: 'y', 置き換えるもの: 'なし' };

const ledger = (active, archive = '') => ['## 現行（新しい順）', '', active, '## アーカイブ', '', archive].join('\n');

test('the real ledger is well-formed, nothing has left it, and something was read', () => {
  const { problems, active } = auditLedgerFile(
    new URL('../docs/rules.md', import.meta.url).pathname,
    new URL('./rules-ids-baseline.json', import.meta.url).pathname,
  );
  assert.deepEqual(problems, []);
  // An empty parse would satisfy every assertion above it (L-01).
  assert.ok(active.length >= 2, `only ${active.length} current rule(s) parsed`);
});

test('the three fields are all required, and may not be empty', () => {
  for (const missing of ['決めたこと', 'なぜ', '置き換えるもの']) {
    const fields = { ...ok };
    delete fields[missing];
    const { problems } = auditRules({ markdown: ledger(entry('R-2026-10-16-01', 'a', fields)) });
    assert.ok(problems.some((problem) => problem.includes(`no **${missing}** field`)), `missing ${missing} passed`);
  }
  const empty = ledger(entry('R-2026-10-16-01', 'a', { ...ok, なぜ: '' }));
  assert.deepEqual(auditRules({ markdown: empty }).problems, ['R-2026-10-16-01 (line 3): **なぜ** is empty']);
});

test('a deleted rule is refused: a replaced rule has to be in the archive', () => {
  // The decay this exists to stop. Someone changes a rule, deletes the old
  // entry, and the reason for the change goes with it.
  const deleted = ledger(entry('R-2026-10-20-01', 'new', { ...ok, 置き換えるもの: '`R-2026-10-16-01`' }));
  assert.match(auditRules({ markdown: deleted }).problems[0], /not in the ledger — a replaced rule is moved to the archive, not deleted/);

  // Still sitting in 現行 is the other half-done state: two rules, no winner.
  const stillActive = ledger(
    entry('R-2026-10-20-01', 'new', { ...ok, 置き換えるもの: '`R-2026-10-16-01`' })
      + entry('R-2026-10-16-01', 'old', ok),
  );
  assert.match(auditRules({ markdown: stillActive }).problems[0], /still in 現行 — move it to the archive/);

  // Archived, and both entries point at each other: legal.
  const archived = ledger(
    entry('R-2026-10-20-01', 'new', { ...ok, 置き換えるもの: '`R-2026-10-16-01`' }),
    entry('R-2026-10-16-01', 'old', { ...ok, 置き換えたもの: '`R-2026-10-20-01`' }),
  );
  const audited = auditRules({ markdown: archived });
  assert.deepEqual(audited.problems, []);
  assert.deepEqual(audited.archived.map((rule) => rule.id), ['R-2026-10-16-01']);
});

test('a rule deleted outright, with nothing naming it, is caught by the id baseline', () => {
  // The snapshot alone cannot see this: old entry gone, new entry says なし.
  // Found by review on the first PR (Codex, #172). The baseline is the record
  // of every id the ledger has ever held, so the deletion has something to
  // be measured against.
  const after = ledger(entry('R-2026-10-20-01', 'new', ok));
  const { problems } = auditRules({ markdown: after, known: ['R-2026-10-16-01'] });
  assert.match(problems[0], /R-2026-10-16-01 was in the ledger and is gone — a rule is archived, never deleted/);

  // And a new id has to be recorded, or the baseline stops describing the file.
  const unrecorded = auditRules({ markdown: after, known: [] });
  assert.match(unrecorded.problems[0], /R-2026-10-20-01 is new and not yet in the id baseline/);
  assert.deepEqual(unrecorded.unrecorded, ['R-2026-10-20-01']);

  // Without a baseline the check is simply not run — the other tests here
  // audit snippets that have no history.
  assert.deepEqual(auditRules({ markdown: after }).problems, []);
});

test('a heading that looks like a rule but does not parse is refused, not ignored', () => {
  // `R-2026-10-17-1` (one digit) or a missing title would otherwise vanish
  // from the parse with its date, fields and order unchecked (Codex, #172).
  for (const bad of ['### R-2026-10-17-1 — typo', '### R-2026-10-17-01', '### R-2026-10-17-01 —   ']) {
    const markdown = ledger(`${entry('R-2026-10-16-01', 'a', ok)}${bad}\n${Object.entries(ok).map(([k, v]) => `- **${k}**: ${v}`).join('\n')}\n`);
    assert.equal(malformedHeadings(markdown).length, 1, `"${bad}" was not flagged`);
    assert.ok(
      auditRules({ markdown }).problems.some((problem) => problem.includes('looks like a rule but is not')),
      `"${bad}" passed the audit`,
    );
  }
  // The fenced template is still not a rule, malformed or otherwise.
  assert.deepEqual(malformedHeadings('```\n### R-YYYY-MM-DD-NN — x\n```\n'), []);
});

test('an archived rule has to say what replaced it, and the replacer has to agree', () => {
  const silent = ledger(entry('R-2026-10-20-01', 'new', ok), entry('R-2026-10-16-01', 'old', ok));
  assert.match(auditRules({ markdown: silent }).problems[0], /names no \*\*置き換えたもの\*\*/);

  const oneSided = ledger(
    entry('R-2026-10-20-01', 'new', ok),
    entry('R-2026-10-16-01', 'old', { ...ok, 置き換えたもの: '`R-2026-10-20-01`' }),
  );
  assert.match(auditRules({ markdown: oneSided }).problems[0], /does not name it under \*\*置き換えるもの\*\*/);
});

test('the newer date wins, so 現行 is sorted newest first and a rule cannot replace a newer one', () => {
  const backwards = ledger(entry('R-2026-10-16-01', 'old', ok) + entry('R-2026-10-20-01', 'new', ok));
  assert.match(auditRules({ markdown: backwards }).problems[0], /is newer than R-2026-10-16-01 above it/);

  const sameDay = ledger(entry('R-2026-10-16-01', 'first', ok) + entry('R-2026-10-16-02', 'second', ok));
  assert.match(auditRules({ markdown: sameDay }).problems[0], /newer than/, 'the day-sequence orders too');

  const upward = ledger(
    entry('R-2026-10-20-01', 'new', ok),
    entry('R-2026-10-21-01', 'newer', { ...ok, 置き換えたもの: '`R-2026-10-20-01`' }),
  ).replace('- **置き換えるもの**: なし', '- **置き換えるもの**: `R-2026-10-21-01`');
  assert.ok(
    auditRules({ markdown: upward }).problems.some((problem) => problem.includes('not older than it — the newer date wins')),
  );
});

test('a number is never reused, and the date in it has to be a real date', () => {
  const twice = ledger(entry('R-2026-10-16-01', 'first', ok) + entry('R-2026-10-16-01', 'second', ok));
  assert.match(auditRules({ markdown: twice }).problems[0], /already used by "first"/);

  assert.equal(hasRealDate('R-2026-10-16-01'), true);
  assert.equal(hasRealDate('R-2026-02-30-01'), false);
  assert.equal(hasRealDate('R-2026-13-01-01'), false);
  const fake = ledger(entry('R-2026-13-01-01', 'a', ok));
  assert.match(auditRules({ markdown: fake }).problems[0], /not a calendar date/);
});

test('a rule outside the two sections, or an active rule claiming to be replaced, is refused', () => {
  const stray = `${entry('R-2026-10-16-01', 'a', ok)}\n## 現行\n`;
  assert.match(auditRules({ markdown: stray }).problems[0], /outside both the 現行 and アーカイブ sections/);

  const confused = ledger(entry('R-2026-10-16-01', 'a', { ...ok, 置き換えたもの: '`R-2026-10-20-01`' }));
  assert.ok(auditRules({ markdown: confused }).problems.some((problem) => problem.includes('belongs in the archive')));
});

test('the template inside a fenced block is not counted as a rule', () => {
  // The decoy carries a real-looking id, so removing the fence handling makes
  // this go red (the lesson of tests/lessons.test.js).
  const decoy = ledger(`${entry('R-2026-10-16-01', 'real', ok)}\n\`\`\`markdown\n${entry('R-2026-10-17-01', 'example', ok)}\`\`\`\n`);
  assert.deepEqual(parseRules(decoy).map((rule) => rule.id), ['R-2026-10-16-01']);

  const real = read('docs/rules.md');
  const fenced = real.split('```').filter((_, index) => index % 2 === 1).join('\n');
  assert.match(fenced, /### R-YYYY-MM-DD-NN/, 'the write-up template left its code block');
});

test('the next free id counts the day, not the ledger', () => {
  const rules = parseRules(ledger(entry('R-2026-10-16-02', 'b', ok) + entry('R-2026-10-16-01', 'a', ok)));
  assert.equal(nextId(rules, '2026-10-16'), 'R-2026-10-16-03');
  assert.equal(nextId(rules, '2026-10-17'), 'R-2026-10-17-01');
});

test('CLAUDE.md sends a rule to this ledger, and says the newer date wins', () => {
  // The rule and the mechanism have to point at each other, or the rule is
  // advice that the next session will not have read.
  const claude = read('CLAUDE.md');
  assert.match(claude, /docs\/rules\.md/, 'CLAUDE.md names the ledger');
  assert.match(claude, /npm run rules/, 'and the command that checks it');
  assert.match(claude, /新しい日付が勝つ/, 'and the precedence rule');

  const real = read('docs/rules.md');
  for (const promise of ['常に md を参照する', '同じ PR で本書に 1 項目足す', '古いルールは消さない']) {
    assert.ok(real.includes(promise), `the ledger is missing "${promise}"`);
  }
});
