/**
 * The derived review states, and the registry they come from.
 *
 * `src/catalog/clinicalReviewStates.js` is generated so the release gate can
 * read a scene's review state at first paint without pulling in the reviewers'
 * notes. A derived copy of a governance fact is a place for two opinions to
 * appear, so this is the thing that stops that: it re-derives from the registry
 * and requires the checked-in file to match, byte for byte.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { renderReviewStates } from '../scripts/review-states.js';
import {
  CLINICAL_REVIEW_STATES,
  clinicalReviewStateForScene,
  hasCurrentClinicalReviewState,
} from '../src/catalog/clinicalReviewStates.js';
import { CLINICAL_REVIEW_STATUSES, clinicalReviewForScene } from '../src/catalog/clinicalReview.js';

const registry = JSON.parse(
  readFileSync(new URL('../docs/clinical-reviews/registry.json', import.meta.url), 'utf8'),
);

test('review states: the generated module is what the registry says', () => {
  const checkedIn = readFileSync(
    new URL('../src/catalog/clinicalReviewStates.js', import.meta.url),
    'utf8',
  );
  assert.equal(
    checkedIn,
    renderReviewStates(registry),
    'src/catalog/clinicalReviewStates.js no longer matches docs/clinical-reviews/registry.json — ' +
      'run `node scripts/review-states.js --write` and commit the result. Do not edit the ' +
      'generated file: the registry is the source of truth for who signed off on what.',
  );
});

test('review states: every scene in the registry has its state, and no others', () => {
  assert.equal(Object.keys(CLINICAL_REVIEW_STATES).length, registry.length);
  for (const record of registry) {
    assert.equal(
      CLINICAL_REVIEW_STATES[record.sceneId],
      record.reviewStatus,
      `${record.sceneId} disagrees with the registry`,
    );
  }
});

test('review states: the two modules answer the same question the same way', () => {
  // The gate reads the derived module and the surfaces read the registry. If
  // they ever disagreed about a scene, a model could be published on a sign-off
  // its own page says it does not have.
  for (const record of registry) {
    assert.equal(
      clinicalReviewStateForScene(record.sceneId)?.reviewStatus,
      clinicalReviewForScene(record.sceneId)?.reviewStatus,
      `${record.sceneId}`,
    );
    assert.equal(
      hasCurrentClinicalReviewState(record.sceneId),
      clinicalReviewForScene(record.sceneId)?.reviewStatus === 'reviewed',
      `${record.sceneId}`,
    );
  }
});

test('review states: a scene with no record resolves to null, not to reviewed', () => {
  // Failing open here would publish a model on a review nobody filed.
  for (const missing of ['not-a-scene', '', null, undefined, {}]) {
    assert.equal(clinicalReviewStateForScene(missing), null, String(missing));
    assert.equal(hasCurrentClinicalReviewState(missing), false, String(missing));
  }
});

test('review states: only states the registry can actually hold are generated', () => {
  for (const [sceneId, state] of Object.entries(CLINICAL_REVIEW_STATES)) {
    assert.ok(
      CLINICAL_REVIEW_STATUSES.includes(state),
      `${sceneId} has state "${state}", which is not one of ${CLINICAL_REVIEW_STATUSES.join(', ')}`,
    );
  }
});

test('review states: the generated module carries none of the reviewers\' prose', () => {
  // The whole point. If a field with a reviewer's writing in it ends up here,
  // the entry chunk grows again and nothing else notices.
  //
  // Asserted against the data rather than the file's text: the header explains
  // what it leaves out, so it names those fields, and a substring search over
  // the whole file finds its own documentation.
  for (const [sceneId, state] of Object.entries(CLINICAL_REVIEW_STATES)) {
    assert.equal(typeof state, 'string', `${sceneId} holds something richer than a state`);
    assert.ok(state.length < 32, `${sceneId} holds "${state.slice(0, 40)}…", which is prose, not a state`);
  }
  // Nothing beyond the states themselves. A reviewer's record has eight fields
  // and seven of them belong in the registry; this is what notices when one of
  // them is "just added" here.
  const carried = new Set(Object.values(CLINICAL_REVIEW_STATES));
  assert.ok(
    [...carried].every((state) => CLINICAL_REVIEW_STATUSES.includes(state)),
    `the module carries values that are not review states: ${[...carried].join(', ')}`,
  );

  const checkedIn = readFileSync(
    new URL('../src/catalog/clinicalReviewStates.js', import.meta.url),
    'utf8',
  );
  // Generous, and far below the 98.5 kB registry: the guard against the file
  // quietly growing back into a copy of it.
  assert.ok(
    checkedIn.length < 8 * 1024,
    `the eager states module is ${(checkedIn.length / 1024).toFixed(1)} kB; it holds one enum per scene`,
  );
});
