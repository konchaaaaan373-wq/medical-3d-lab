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
import { auditLedgerFile, COVERAGE } from './lib/lessons.mjs';

const LEDGER = 'docs/verification-lessons.md';
const { problems, lessons, humanOnly } = auditLedgerFile(LEDGER, 'package.json');

console.log(`\nVerification lessons — ${lessons.length} recorded in ${LEDGER}\n`);

// The mark and the count below are the same judgement. They used to be two:
// the mark asked "does it say 人だけ" and the count asked "does it name no
// guard", so fifteen lines read `human` while the summary said eleven.
const MARK = { [COVERAGE.guarded]: '  test', [COVERAGE.partly]: 'partly', [COVERAGE.human]: ' human' };
for (const lesson of lessons) {
  console.log(`  ${MARK[lesson.coverage]}  ${lesson.id}  ${lesson.title}`);
}

console.log(
  `\n${humanOnly.length} of ${lessons.length} still need a person for some part of them:`
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
