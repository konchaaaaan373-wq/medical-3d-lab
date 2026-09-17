/**
 * Reading the follow-ups ledger, and refusing to let two items share a number.
 *
 * `docs/follow-ups.md` is the merged-but-unverified ledger, and its items are
 * cited by number from commit messages, PR bodies, other ledger entries, source
 * comments and each other. A number that means two things breaks every one of
 * those citations silently — the reader follows F-138 to whichever entry they
 * find first and reads about something else.
 *
 * **This has happened three times and nothing has ever caught it.** The lesson
 * ledger has had a duplicate check since L-16; the follow-ups ledger, which
 * collides more often because every branch adds to it, had none. On
 * 2026-09-17 three branches were open at once and two of them wrote an F-138:
 * one for a section plane cutting the ureters, one for going private before
 * launch. Both branches were green.
 *
 * It checks the one thing a machine can be sure of. Whether an item is still
 * true, still open, or worth keeping is not mechanical, and a check that
 * pretended otherwise would be this repo's L-01.
 */
import { readFileSync } from 'node:fs';

const HEADING = /^### (F-\d+)\s+(.+)$/;

/**
 * Every item in the ledger, in the order it appears.
 *
 * Fenced blocks are skipped so a worked example in the document is not read as
 * an item — the same reason `parseLessons` skips them.
 *
 * @param {string} markdown
 * @returns {{id: string, title: string, line: number}[]}
 */
export function parseFollowUps(markdown) {
  const items = [];
  let fenced = false;
  const lines = markdown.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].startsWith('```')) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const heading = HEADING.exec(lines[index]);
    if (heading) items.push({ id: heading[1], title: heading[2].trim(), line: index + 1 });
  }
  return items;
}

/**
 * Every occurrence of a number that some earlier item already used.
 *
 * The first use is not a duplicate; each one after it is, and carries the
 * entry it collides with so a report can name both.
 *
 * @param {ReturnType<typeof parseFollowUps>} items
 * @returns {{id: string, title: string, line: number, first: {title: string, line: number}}[]}
 */
export function duplicateNumbers(items) {
  const seen = new Map();
  const duplicates = [];
  for (const item of items) {
    const first = seen.get(item.id);
    if (first) duplicates.push({ ...item, first: { title: first.title, line: first.line } });
    else seen.set(item.id, item);
  }
  return duplicates;
}

/** How a duplicate is named in the baseline: the number and the title, never the line. */
export const key = (duplicate) => `${duplicate.id} ${duplicate.title}`;

/**
 * What is wrong, as readable lines. Empty means the baseline is exact.
 *
 * **Why a baseline and not a rule.** Turning the check on found twenty-two
 * collisions already in the ledger, some months old and cited from commit
 * messages and other entries that cannot be rewritten. Renumbering all of them
 * inside whatever PR happens to add the check would be a large, silent edit to
 * a document people navigate by number. So the existing ones are written down
 * — exactly, by number and title — and **a new one is a failure**. The same
 * shape as `type-floor`, and for the same reason: the list can only get
 * shorter, and it is a debt that is visible rather than an exception that
 * claims a review nobody did.
 *
 * @param {ReturnType<typeof duplicateNumbers>} found
 * @param {{duplicates: string[]}} baseline
 * @returns {string[]}
 */
export function followUpProblems(found, baseline) {
  const problems = [];
  const allowed = new Set(baseline.duplicates ?? []);
  const here = new Set(found.map(key));

  for (const duplicate of found) {
    if (allowed.has(key(duplicate))) continue;
    problems.push(
      `${duplicate.id} (line ${duplicate.line}) "${duplicate.title}": the number is already used by ` +
        `"${duplicate.first.title}" (line ${duplicate.first.line}) — numbers are never reused. ` +
        'Give the newer item the next free number and update every citation of it.'
    );
  }
  for (const entry of allowed) {
    if (!here.has(entry)) {
      problems.push(
        `"${entry}" is no longer a duplicate; delete its baseline entry (npm run follow-ups -- --write)`
      );
    }
  }
  return problems;
}

/**
 * Check the ledger against its baseline of known collisions.
 *
 * @param {object} options
 * @param {string} options.markdown the ledger's text
 * @param {{duplicates: string[]}} [options.baseline]
 * @returns {{problems: string[], items: ReturnType<typeof parseFollowUps>, duplicates: ReturnType<typeof duplicateNumbers>}}
 */
export function auditFollowUps({ markdown, baseline = { duplicates: [] } }) {
  const items = parseFollowUps(markdown);
  const duplicates = duplicateNumbers(items);
  const problems = items.length === 0 ? ['the ledger has no items in it at all'] : [];
  return { problems: [...problems, ...followUpProblems(duplicates, baseline)], items, duplicates };
}

/** Read the ledger and its baseline off disk, then audit. */
export function auditFollowUpsFile(ledgerPath, baselinePath) {
  return auditFollowUps({
    markdown: readFileSync(ledgerPath, 'utf8'),
    baseline: JSON.parse(readFileSync(baselinePath, 'utf8')),
  });
}
