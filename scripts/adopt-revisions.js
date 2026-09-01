#!/usr/bin/env node
/**
 * Record the current model sources against their model cards.
 *
 * Run after a deliberate medical change, once the card has actually been
 * updated:
 *
 *   npm run revisions:check    what has drifted, and nothing written
 *   npm run revisions:adopt    bump the revision and record the new digest
 *
 * `adopt` is separate from `check` and neither is automatic, because the point
 * of the mechanism is to make somebody look at the card. A tool that silently
 * re-recorded the digest would restore the exact gap it exists to close.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import { adoptRevisions, revisionProblems, staleReviews } from './model-revisions.js';

const REVISIONS = 'docs/model-cards/revisions.json';
const REVIEWS = 'docs/clinical-reviews/registry.json';

const read = (path) => readFileSync(path, 'utf8');
const readJson = (path) => JSON.parse(read(path));

const adopt = process.argv.includes('--adopt');
const entries = readJson(REVISIONS);
const reviews = readJson(REVIEWS);

const problems = revisionProblems(entries, read);
const stale = staleReviews(reviews, entries, read);

if (!adopt) {
  console.log(`Model card revisions — ${entries.length} entries`);
  if (problems.length) {
    console.error(`\n${problems.length} card(s) out of date:`);
    for (const problem of problems) console.error(`  - ${problem}`);
  } else {
    console.log('  ok    every model card describes the model it is filed against');
  }

  if (stale.length) {
    console.warn(`\n${stale.length} clinical review(s) no longer describe the model they signed:`);
    for (const item of stale) console.warn(`  - ${item.sceneId}: ${item.reason}`);
    console.warn(
      '  A stale review is not automatically invalid. Record what changed under\n' +
        '  "modelChangedSinceReview" in the review registry, or have it re-signed.'
    );
  }

  process.exit(problems.length ? 1 : 0);
}

const { entries: next, changed } = adoptRevisions(entries, read);
if (!changed.length) {
  console.log('Nothing to adopt: every recorded digest already matches its sources.');
  process.exit(0);
}

writeFileSync(REVISIONS, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Adopted ${changed.length} change(s):`);
for (const item of changed) console.log(`  ${item.sceneId}: ${item.from} -> ${item.to}`);
console.log(
  '\nCheck that the model card actually describes the new behaviour, and that any\n' +
    'clinical review of it is either still accurate or recorded as superseded.'
);
