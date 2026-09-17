import test from 'node:test';
import assert from 'node:assert/strict';

import { sceneById } from '../src/catalog/index.js';
import {
  BETA_ANATOMY_CANDIDATES,
  NEXT_BETA_DISEASE_CANDIDATES,
  NEXT_BETA_CANDIDATE_STATUS,
  betaPublicationProblems,
  NEXT_BETA_PUBLICATION_DECISIONS,
  RELEASE_CHANNEL,
  RELEASED_SCENES,
  nextBetaPublicationProblems,
  sceneReleaseProblems,
} from '../src/catalog/release.js';
import { SCENES } from '../src/catalog/index.js';
import { PATIENT_GUIDES } from '../src/data/patientGuides.js';

/**
 * The release after this one, and the ways it must refuse to open early.
 *
 * The current beta publishes anatomy, which is why most of the catalogue
 * reports "not one of the scenes this release opens" rather than a failure.
 * This channel is where a disease — a mechanism, with a professional view and a
 * patient explanation of the same solved state — would be published, and it
 * exists so that question can be answered without touching the one in force.
 */

test('next-beta: registering the policy changes nothing about what is published', () => {
  // The whole risk of adding a second channel. `RELEASE_CHANNEL` selects, and
  // it still selects `beta`; a policy that is registered and not selected
  // publishes nothing by existing.
  assert.equal(RELEASE_CHANNEL, 'beta');
  assert.deepEqual(RELEASED_SCENES.map((scene) => scene.id), ['brain-anatomy', 'heart-anatomy', 'lung-anatomy', 'liver-anatomy']);
});

test('next-beta ⊇ beta: switching the channel can only ever add', () => {
  // The property the whole design rests on. Anything the current release
  // publishes is published here too, and nothing is asked to be decided twice.
  // Checked over the whole catalogue rather than the candidates, because a
  // scene that fell out would fall out silently.
  const onBeta = SCENES.filter((scene) => betaPublicationProblems(scene.id).length === 0);
  assert.ok(onBeta.length >= 1, 'the current release publishes something to inherit');

  for (const scene of onBeta) {
    assert.deepEqual(
      nextBetaPublicationProblems(scene.id),
      [],
      `${scene.id} is published today and the next channel would close it`
    );
  }

  // And it is inheritance, not a coincidence of both gates agreeing: the brain
  // is open here while its own clinical review is `pending`, which this
  // channel's disease bar would refuse.
  const brain = BETA_ANATOMY_CANDIDATES.find((id) => betaPublicationProblems(id).length === 0);
  assert.ok(brain, 'an anatomy scene is open on the beta');
  assert.deepEqual(nextBetaPublicationProblems(brain), []);
  const inherited = NEXT_BETA_CANDIDATE_STATUS.find((entry) => entry.sceneId === brain);
  assert.equal(inherited.source, 'inherited', 'and it is marked as inherited rather than decided again');
});

test('next-beta: no disease is open today, and each says why', () => {
  assert.ok(NEXT_BETA_DISEASE_CANDIDATES.length >= 4);
  // The brain must not be in this list: it arrives by inheritance, and listing
  // it here is what asked it for a second review and a second decision.
  assert.ok(
    !NEXT_BETA_DISEASE_CANDIDATES.includes('brain-anatomy'),
    'an already-published scene is inherited, not re-listed as a candidate'
  );

  for (const entry of NEXT_BETA_CANDIDATE_STATUS.filter((row) => row.source === 'candidate')) {
    assert.equal(entry.open, false, `${entry.sceneId} is open with no decision recorded`);
    assert.ok(entry.problems.length > 0);
  }
  assert.deepEqual(NEXT_BETA_PUBLICATION_DECISIONS, [], 'no decision is recorded yet');
});

test('next-beta: candidates open one at a time', () => {
  // The first release unit is the brain plus amyloid-beta and heart-failure.
  // Approving those two must not be held up by COPD's re-review, so a decision
  // on one candidate must not change the answer for another.
  const before = Object.fromEntries(
    NEXT_BETA_DISEASE_CANDIDATES.map((id) => [id, nextBetaPublicationProblems(id).length])
  );
  const decision = {
    sceneId: 'amyloid-beta',
    decidedAt: '2026-09-11',
    decidedBy: { name: 'A Person', role: 'engineering' },
    record: 'docs/beta-candidate-matrix.md',
    assetRevisions: {},
    sceneRevision: { cardRevision: 1, modelDigest: 'x' },
    scope: { structures: ['a'], views: ['b'], interactions: ['c'] },
    evidence: ['docs/beta-candidate-matrix.md'],
    unverified: ['everything else'],
  };
  for (const id of NEXT_BETA_DISEASE_CANDIDATES) {
    if (id === 'amyloid-beta') continue;
    assert.equal(
      nextBetaPublicationProblems(id, { decisions: [decision] }).length,
      before[id],
      `${id} changed because a decision was recorded for another scene`
    );
  }
});

test('next-beta: a name that is not on the allowlist opens nothing', () => {
  // The rule this channel is deliberately not: "anything marked reviewed".
  // `asthma-heterogeneity` is `reviewed` and is not a candidate, so it must be
  // refused for that reason and no other.
  const asthma = nextBetaPublicationProblems('asthma-heterogeneity');
  assert.equal(asthma.length, 1);
  assert.match(asthma[0], /not one of the scenes the next release opens/);

  for (const id of ['pneumonia', 'renal-filtration', 'stomach-anatomy', '', 'undefined']) {
    assert.match(nextBetaPublicationProblems(id)[0], /not one of the scenes the next release opens/, id);
  }
});

test('next-beta: a current clinical review is required, unlike on the beta', () => {
  // The bar this channel adds. Every candidate fails it today, and the message
  // has to name the state rather than saying "not reviewed", because
  // `pending`, `stale` and `legacy-unversioned` are three different situations.
  const states = new Set();
  // Candidates only. An inherited scene is not asked for a review here — that
  // is the point of inheritance, and asking would close what is open today.
  for (const entry of NEXT_BETA_CANDIDATE_STATUS.filter((row) => row.source === 'candidate')) {
    const line = entry.problems.find((problem) => /clinical review/.test(problem));
    assert.ok(line, `${entry.sceneId}: the review bar is not reported`);
    const [, state] = line.match(/clinical review is "([^"]+)"/) ?? [];
    assert.ok(state, `${entry.sceneId}: the message does not name the review state`);
    states.add(state);
  }
  assert.ok(states.size >= 2, `more than one review state is represented: ${[...states].join(', ')}`);
});

test('next-beta: a disease is published with both views or neither', () => {
  // The experience this release exists for is professional *and* patient of one
  // solved state. Every disease candidate carries a patient explanation, and a
  // candidate that lost one would be refused rather than published half.
  for (const id of NEXT_BETA_DISEASE_CANDIDATES) {
    const scene = sceneById(id);
    if (!scene?.disease) continue;
    assert.ok(PATIENT_GUIDES[id], `${id} is a disease candidate with no patient explanation`);
  }

  const withoutGuide = nextBetaPublicationProblems('heart-failure', { authoredGuideIds: [] });
  assert.ok(
    withoutGuide.some((problem) => /no patient explanation/.test(problem)),
    'a disease with no patient explanation is refused'
  );
});

test('next-beta: a decision cannot publish a scene on its own', () => {
  // A decision that names everything the schema wants, on a scene whose review
  // is not current, must still be refused — otherwise a decision promotes
  // itself past the bar this channel was created to hold.
  const decision = {
    sceneId: 'heart-failure',
    decidedAt: '2026-09-11',
    decidedBy: { name: 'A Person', role: 'engineering' },
    record: 'docs/beta-candidate-matrix.md',
    assetRevisions: {},
    sceneRevision: { cardRevision: 1, modelDigest: 'x' },
    scope: { structures: ['a'], views: ['b'], interactions: ['c'] },
    evidence: ['docs/beta-candidate-matrix.md'],
    unverified: ['everything else'],
  };
  const problems = nextBetaPublicationProblems('heart-failure', { decisions: [decision] });
  assert.ok(problems.some((problem) => /clinical review/.test(problem)), 'the review bar still holds');
});

test('next-beta: it is reachable through the channel selector, and only by name', () => {
  const scene = sceneById('heart-failure');
  assert.ok(sceneReleaseProblems(scene, { channel: 'next-beta' }).length > 0);
  // An unregistered channel still opens nothing at all.
  assert.match(sceneReleaseProblems(scene, { channel: 'next-beta ' })[0], /has no publication policy/);
});
