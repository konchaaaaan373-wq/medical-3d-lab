#!/usr/bin/env node
/**
 * What would happen if the channel were switched — **without switching it**.
 *
 *   npm run verify:next-beta
 *
 * Reads the same gate the release reads (`nextBetaPublicationProblems`) and
 * prints, per candidate, either READY or what stops it. It writes nothing: no
 * registry entry, no publication decision, no channel. A dry run that could
 * change the answer would not be a dry run.
 *
 * Exit codes say which of three situations it is, because they are different:
 *
 *   0  every candidate is READY — the switch is the only thing left
 *   1  at least one candidate is blocked (the normal state, and not an error
 *      in the sense of something being broken)
 *   2  the channel in force is already `next-beta`, so this is not a dry run
 *
 * **It cannot be used to approve anything.** The two blockers every candidate
 * reports today are a clinical review and a publication decision, and both are
 * records a person writes.
 */
import {
  NEXT_BETA_CANDIDATES,
  RELEASE_CHANNEL,
  nextBetaPublicationProblems,
} from '../src/catalog/release.js';
import { sceneById } from '../src/catalog/index.js';
import { clinicalReviewForScene } from '../src/catalog/clinicalReview.js';

const quiet = process.argv.includes('--quiet');
const say = (line) => { if (!quiet) console.log(line); };

if (RELEASE_CHANNEL === 'next-beta') {
  console.error('RELEASE_CHANNEL is already "next-beta" — this is a dry run and has nothing to preview.');
  process.exit(2);
}

/** The long gate messages, shortened to what a reader scans for. */
function shorten(problem) {
  if (/clinical review is "([^"]+)"/.test(problem)) {
    const [, state] = problem.match(/clinical review is "([^"]+)"/);
    return state === 'stale' ? 'stale review' : `clinical review (${state})`;
  }
  if (/publication decision on file/.test(problem)) return 'publication decision';
  if (/candidate asset/.test(problem)) return 'asset not released';
  if (/patient explanation/.test(problem)) return 'patient explanation';
  if (/model profile/.test(problem)) return 'model profile';
  return problem.length > 60 ? `${problem.slice(0, 57)}…` : problem;
}

say(`Next-beta dry run — channel in force is "${RELEASE_CHANNEL}", and this changes nothing.\n`);

let blocked = 0;
const width = Math.max(...NEXT_BETA_CANDIDATES.map((id) => id.length));
for (const id of NEXT_BETA_CANDIDATES) {
  const problems = nextBetaPublicationProblems(id);
  const scene = sceneById(id);
  const review = clinicalReviewForScene(scene)?.reviewStatus ?? 'no record';
  if (!problems.length) {
    say(`  ${id.padEnd(width)}  READY`);
    continue;
  }
  blocked += 1;
  say(`  ${id.padEnd(width)}  BLOCKED: ${[...new Set(problems.map(shorten))].join(', ')}`);
  if (!quiet && problems.length > 2) for (const problem of problems) say(`  ${' '.repeat(width)}    · ${problem}`);
  void review;
}

if (!quiet) {
  say('');
  if (blocked) {
    say(`${blocked} of ${NEXT_BETA_CANDIDATES.length} blocked. Every line above is a record somebody writes,`);
    say('not code somebody changes — see docs/decisions/NEXT-BETA-APPLY.md.');
  } else {
    say('Every candidate is READY. The remaining step is the channel switch, which is a release decision.');
  }
}
process.exit(blocked ? 1 : 0);
