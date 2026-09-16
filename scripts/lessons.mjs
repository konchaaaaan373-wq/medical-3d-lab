#!/usr/bin/env node
/**
 * The self-improvement loop's mechanical half.
 *
 *   npm run lessons
 *
 * `docs/verification-lessons.md` records the times a check was green while
 * measuring nothing. This keeps the ledger itself honest: every lesson says the
 * three things, every guard it names still exists, and the count of lessons
 * that only a person can catch is printed rather than quietly forgotten.
 *
 * The loop's other half cannot be run: write the guard, break it, confirm red,
 * restore it, confirm green. Every lesson in section A was found that way and
 * by nothing else.
 */
import { auditLedgerFile, HUMAN_ONLY } from './lib/lessons.mjs';

const LEDGER = 'docs/verification-lessons.md';
const { problems, lessons, humanOnly } = auditLedgerFile(LEDGER, 'package.json');

console.log(`\nVerification lessons — ${lessons.length} recorded in ${LEDGER}\n`);

for (const lesson of lessons) {
  const guard = lesson.fields.get('いま何が捕まえるか') ?? '';
  const mark = guard.includes(HUMAN_ONLY) ? 'human' : ' test';
  console.log(`  ${mark}  ${lesson.id}  ${lesson.title}`);
}

console.log(
  `\n${humanOnly.length} of ${lessons.length} are still caught by a person and nothing else:`
);
for (const lesson of humanOnly) console.log(`  - ${lesson}`);
console.log(
  '\nThat number going down is the point. It is not a target to hit by deleting'
  + '\nlessons: a guard that does not go red when broken is not a guard (L-09).\n'
);

if (problems.length) {
  console.error(`${problems.length} problem(s) with the ledger:`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('The ledger is well-formed and every guard it names still exists.\n');
