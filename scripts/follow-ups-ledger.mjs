#!/usr/bin/env node
/**
 * Checks that no two items in `docs/follow-ups.md` share a number.
 *
 *   npm run follow-ups              report anything new against the baseline
 *   npm run follow-ups -- --write   rewrite the baseline (only to shrink it)
 *
 * The reasoning for the baseline is in `scripts/lib/follow-ups.mjs`. In short:
 * the check found twenty-two collisions the day it was written, so the debt is
 * recorded exactly and only new collisions fail. `--write` refuses to make the
 * list longer, which is the only thing keeping it a debt rather than a drain.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { auditFollowUpsFile, duplicateNumbers, key, parseFollowUps } from './lib/follow-ups.mjs';

const LEDGER = fileURLToPath(new URL('../docs/follow-ups.md', import.meta.url));
const BASELINE = fileURLToPath(new URL('../tests/follow-ups-duplicates-baseline.json', import.meta.url));

if (process.argv.includes('--write')) {
  const found = duplicateNumbers(parseFollowUps(readFileSync(LEDGER, 'utf8'))).map(key);
  let was = Infinity;
  try {
    was = (JSON.parse(readFileSync(BASELINE, 'utf8')).duplicates ?? []).length;
  } catch {
    if (!process.argv.includes('--seed')) throw new Error('No baseline yet — pass --seed to create one.');
  }
  if (found.length > was) {
    console.error(`Refusing to write: that would take the baseline from ${was} to ${found.length}.`);
    console.error('A new collision is the thing this check exists to stop. Renumber the newer item instead.');
    process.exit(1);
  }
  writeFileSync(BASELINE, `${JSON.stringify({ duplicates: found }, null, 2)}\n`);
  console.log(`Baseline rewritten: ${found.length} known duplicate(s).`);
  process.exit(0);
}

const { problems, items, duplicates } = auditFollowUpsFile(LEDGER, BASELINE);
console.log(`Follow-ups ledger — ${items.length} item(s), ${duplicates.length} known duplicate number(s)`);
if (problems.length === 0) {
  console.log('  ok    the baseline is exact; no number is newly shared');
  process.exit(0);
}
console.error(`\n${problems.length} problem(s):`);
for (const problem of problems) console.error(`  - ${problem}`);
process.exit(1);
