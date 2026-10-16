#!/usr/bin/env node
/**
 * The operating-rules ledger, checked rather than believed.
 *
 *   npm run rules
 *
 * `docs/rules.md` records what the owner decided to do from now on, one dated
 * entry each, newest first, with replaced entries kept in an archive. This
 * holds that shape: every entry says its three things, no number is reused,
 * the current section is in order, nothing was deleted where it should have
 * been archived, and the archive says what replaced each entry.
 *
 * Whether a rule is right is not something this can tell you.
 */
import { fileURLToPath } from 'node:url';

import { auditLedgerFile, nextId } from './lib/rules.mjs';

const LEDGER = fileURLToPath(new URL('../docs/rules.md', import.meta.url));
const { problems, rules, active, archived } = auditLedgerFile(LEDGER);

console.log(`\nRules ledger — ${active.length} current, ${archived.length} archived in docs/rules.md\n`);
for (const rule of active) console.log(`  current   ${rule.id}  ${rule.title}`);
for (const rule of archived) console.log(`  archived  ${rule.id}  ${rule.title}`);

const today = new Date().toISOString().slice(0, 10);
console.log(`\nNext free id for today: ${nextId(rules, today)}`);
console.log('When two rules disagree, the newer date wins. Replace a rule by adding a new');
console.log('entry at the top and moving the old one to the archive — never by deleting it.\n');

if (problems.length) {
  console.error(`${problems.length} problem(s) with the ledger:`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log('The ledger is well-formed: every replaced rule is archived and points at its replacement.\n');
