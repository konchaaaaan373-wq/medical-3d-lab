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
 *
 *   npm run verify:next-beta -- --pins
 *
 * prints, for each blocked candidate, the values those two records have to
 * carry — the revision pin, the commit under review, the packet a reviewer
 * read. Reading them here rather than copying them by hand is the point: a
 * mistyped digest pins a decision to a scene that does not exist. The reviewer
 * name, role, date and verdict stay as placeholders, because this script does
 * not know them and must not invent them.
 */
import { execFileSync } from 'node:child_process';
import {
  NEXT_BETA_CANDIDATE_STATUS,
  RELEASE_CHANNEL,
  RELEASED_SCENES,
} from '../src/catalog/release.js';
import { sceneById } from '../src/catalog/index.js';
import { clinicalReviewForScene, hasCurrentClinicalReview } from '../src/catalog/clinicalReview.js';
import { modelProfileForScene } from '../src/catalog/modelProfiles.js';
import { sceneRevisionPin } from '../src/catalog/modelRevisions.js';
import { NEXT_BETA_PUBLICATION_DECISIONS } from '../src/catalog/release.js';

const quiet = process.argv.includes('--quiet');
const pins = process.argv.includes('--pins');
const say = (line) => { if (!quiet) console.log(line); };

if (RELEASE_CHANNEL === 'next-beta') {
  console.error('RELEASE_CHANNEL is already "next-beta" — this is a dry run and has nothing to preview.');
  process.exit(2);
}

/** The long gate messages, shortened to what a reader scans for. */
function shorten(problem) {
  if (/clinical review is "([^"]+)"/.test(problem)) {
    const [, state] = problem.match(/clinical review is "([^"]+)"/);
    return state === 'stale' ? 'stale clinical review' : `clinical review (${state})`;
  }
  if (/publication decision on file/.test(problem)) return 'publication decision';
  if (/candidate asset/.test(problem)) return 'asset not released';
  if (/patient explanation/.test(problem)) return 'patient explanation';
  if (/model profile/.test(problem)) return 'model profile';
  return problem.length > 60 ? `${problem.slice(0, 57)}…` : problem;
}

/** The three records a candidate needs, each present or not. */
function records(id) {
  const scene = sceneById(id);
  return {
    review: hasCurrentClinicalReview(scene),
    decision: NEXT_BETA_PUBLICATION_DECISIONS.some((entry) => entry.sceneId === id),
    revision: Boolean(sceneRevisionPin(scene)),
  };
}

say(`Next-beta dry run — channel in force is "${RELEASE_CHANNEL}", and this changes nothing.`);
say(`It adds to the current release rather than replacing it: ${RELEASED_SCENES.length} scene(s) published today stay published.\n`);

let blocked = 0;
const width = Math.max(...NEXT_BETA_CANDIDATE_STATUS.map((entry) => entry.sceneId.length));
const mark = (ok) => (ok ? '✅' : '❌');

for (const entry of NEXT_BETA_CANDIDATE_STATUS) {
  const { sceneId, source, open, problems } = entry;
  if (open && source === 'inherited') {
    say(`  ${sceneId.padEnd(width)}  READY   (inherited from the current beta — not re-decided)`);
    continue;
  }
  if (open) {
    say(`  ${sceneId.padEnd(width)}  READY`);
    continue;
  }
  blocked += 1;
  say(`  ${sceneId.padEnd(width)}  BLOCKED: ${[...new Set(problems.map(shorten))].join(', ')}`);
  const has = records(sceneId);
  // Which of the three records is missing, without anyone opening a registry.
  say(`  ${' '.repeat(width)}    review ${mark(has.review)}  decision ${mark(has.decision)}  revision pin ${mark(has.revision)}`);
  const review = clinicalReviewForScene(sceneById(sceneId));
  if (!has.review && review) say(`  ${' '.repeat(width)}    review is "${review.reviewStatus}"`);
}

if (pins) {
  say('');
  say('--- values for docs/decisions/NEXT-BETA-APPLY.md, read from the product just now ---');
  say('');
  let head = 'unknown';
  try {
    head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    // Not a checkout, or no git. The pins below are still right; only the
    // commit under review has to be filled in by hand.
  }
  say(`reviewedCommit (HEAD right now): ${head}`);
  say('If the scene is edited after a reviewer reads it, this changes and the review goes stale.');
  say('');
  for (const entry of NEXT_BETA_CANDIDATE_STATUS) {
    if (entry.open) continue;
    const scene = sceneById(entry.sceneId);
    const pin = sceneRevisionPin(scene);
    const profile = modelProfileForScene(scene);
    const assets = profile?.assets ?? [];
    say(`  ${entry.sceneId}`);
    say(`    sceneRevision:   { cardRevision: ${pin?.cardRevision ?? '?'}, modelDigest: '${pin?.modelDigest ?? '?'}' }`);
    say(`    assetRevisions:  ${assets.length ? `${assets.length} asset(s) — take each sha256 from src/catalog/assetManifest.js` : '{}  (procedural — no external asset)'}`);
    say(`    evidence:        docs/clinical-reviews/packets/${scene?.slug ?? entry.sceneId}.md, docs/model-cards/${scene?.slug ?? entry.sceneId}.md`);
    say('');
  }
  say('Reviewer, role, date and verdict are deliberately absent: nobody has decided yet.');
}

if (!quiet) {
  say('');
  if (blocked) {
    say(`${blocked} blocked. Every line above is a record somebody writes, not code somebody changes`);
    say('— see docs/decisions/NEXT-BETA-APPLY.md. Candidates open one at a time: the first two do not');
    say('wait for the rest.');
  } else {
    say('Every candidate is READY. The remaining step is the channel switch, which is a release decision.');
  }
}
process.exit(blocked ? 1 : 0);
