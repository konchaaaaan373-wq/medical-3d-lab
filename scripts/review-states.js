#!/usr/bin/env node
/**
 * The review states, without the reviewer's notes.
 *
 *   node scripts/review-states.js            # check (what `npm test` does)
 *   node scripts/review-states.js --write    # regenerate after editing the registry
 *
 * ## Why a derived file exists at all
 *
 * `docs/clinical-reviews/registry.json` is the single source of truth for
 * whether a scene has a current clinical sign-off, and it is also where the
 * reviewer writes down the scope they covered, the sources they read and the
 * limitations they could not resolve. That prose is the larger part of it by
 * far — 84 kB of the 98.5 kB.
 *
 * The release gate needs one field of it, `reviewStatus`, and the release gate
 * runs at first paint: `RELEASED_SCENES` is a module constant, so opening any
 * page evaluates the publication rule for every scene. A bundler cannot take
 * one field out of a JSON import, so the whole registry — every limitation
 * every reviewer has ever written — was in the entry chunk that a first-time
 * visitor downloads before anything renders. Measured: 22.8 kB gzipped, a
 * quarter of the entry budget, to read an enum.
 *
 * So the states are derived into a module small enough to be eager, and the
 * notes stay where they are and stay lazy. One file is authored; the other is
 * generated from it and `tests/clinical-review-states.test.js` fails when they
 * disagree, so the derived copy cannot drift into a second opinion.
 *
 * This is deliberately *not* "copy the review flag into the scene manifest",
 * which `catalog/clinicalReview.js` rules out for a good reason: that would be
 * a second place a human edits. Nobody edits this file.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const REGISTRY = fileURLToPath(new URL('../docs/clinical-reviews/registry.json', import.meta.url));
const GENERATED = fileURLToPath(new URL('../src/catalog/clinicalReviewStates.js', import.meta.url));

/** The generated module's full text, from the registry. */
export function renderReviewStates(registry) {
  const entries = registry
    .map((record) => [String(record.sceneId), String(record.reviewStatus)])
    .sort((a, b) => a[0].localeCompare(b[0]));
  const lines = entries.map(([id, status]) => `  '${id}': '${status}',`).join('\n');
  return `/**
 * Which scenes have a current clinical sign-off — the states only.
 *
 * **Generated. Do not edit.** \`node scripts/review-states.js --write\`, from
 * \`docs/clinical-reviews/registry.json\`, which is the source of truth for
 * every one of these and for the reviewer's notes that are not here.
 *
 * It exists because the release gate runs at first paint and needs this one
 * field, while the notes beside it in the registry are 84 kB of prose that only
 * a reader who opens a model card ever sees. Importing the registry to answer
 * an enum put all of it in the entry chunk: 22.8 kB gzipped, a quarter of the
 * budget. See the header of \`scripts/review-states.js\`.
 *
 * \`tests/clinical-review-states.test.js\` fails if this disagrees with the
 * registry, so it cannot become a second opinion about who signed off on what.
 *
 * Anything richer than a state — the scope, the sources, the limitations, the
 * labels — comes from \`catalog/clinicalReview.js\`, which reads the registry
 * itself and must only ever be imported from a lazily-loaded surface.
 */
export const CLINICAL_REVIEW_STATES = Object.freeze({
${lines}
});

/**
 * The recorded state for a scene, in the shape the gate reads.
 *
 * An object rather than the bare string, so this is a drop-in for the registry
 * record the gate used to resolve and a caller injecting a full record in a
 * test still works.
 *
 * @param {string | {id: string} | null | undefined} scene
 * @returns {{reviewStatus: string} | null} null when the scene has no record
 */
export function clinicalReviewStateForScene(scene) {
  const id = typeof scene === 'string' ? scene : scene?.id;
  const reviewStatus = id == null ? undefined : CLINICAL_REVIEW_STATES[id];
  return reviewStatus ? Object.freeze({ reviewStatus }) : null;
}

/** A current, versioned sign-off. Historical or stale review does not qualify. */
export const hasCurrentClinicalReviewState = (scene) =>
  clinicalReviewStateForScene(scene)?.reviewStatus === 'reviewed';
`;
}

/** @returns {{registry: unknown[], expected: string, actual: string}} */
export function readBoth() {
  const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
  return { registry, expected: renderReviewStates(registry), actual: readFileSync(GENERATED, 'utf8') };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const write = process.argv.includes('--write');
  const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
  const expected = renderReviewStates(registry);
  if (write) {
    writeFileSync(GENERATED, expected);
    console.log(`Clinical review states — wrote ${registry.length} entries to src/catalog/clinicalReviewStates.js`);
  } else {
    const actual = readFileSync(GENERATED, 'utf8');
    if (actual === expected) {
      console.log(`Clinical review states — ${registry.length} entries`);
      console.log('  ok    the generated states match the registry');
    } else {
      console.error('Clinical review states — the generated module disagrees with the registry.');
      console.error('  Run `node scripts/review-states.js --write` and commit the result.');
      process.exit(1);
    }
  }
}
