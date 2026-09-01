import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SCENES } from '../src/catalog/index.js';
import { adoptRevisions, digestSources, revisionProblems, staleReviews } from '../scripts/model-revisions.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const readJson = (path) => JSON.parse(read(path));

const revisions = readJson('docs/model-cards/revisions.json');
const reviews = readJson('docs/clinical-reviews/registry.json');
const sceneIds = new Set(SCENES.map((scene) => scene.id));

/** A tiny in-memory file system, for testing the rules rather than the repo. */
const fakeRead = (files) => (path) => {
  if (!(path in files)) throw new Error(`no such file: ${path}`);
  return files[path];
};

// --- the rules -------------------------------------------------------------

test('digest: the same content always produces the same digest', () => {
  const read = fakeRead({ 'a.js': 'one', 'b.js': 'two' });
  assert.equal(digestSources(['a.js', 'b.js'], read), digestSources(['a.js', 'b.js'], read));
});

test('digest: the order the sources are listed in does not matter', () => {
  const read = fakeRead({ 'a.js': 'one', 'b.js': 'two' });
  assert.equal(digestSources(['a.js', 'b.js'], read), digestSources(['b.js', 'a.js'], read));
});

test('digest: a change in any source changes it', () => {
  const before = digestSources(['a.js', 'b.js'], fakeRead({ 'a.js': 'one', 'b.js': 'two' }));
  const after = digestSources(['a.js', 'b.js'], fakeRead({ 'a.js': 'one', 'b.js': 'TWO' }));
  assert.notEqual(before, after);
});

test('digest: two files cannot be rearranged into the same digest', () => {
  // Without a separator, ["ab", "c"] and ["a", "bc"] would hash identically.
  const read = fakeRead({ 'a.js': 'ab', 'b.js': 'c', 'c.js': 'a', 'd.js': 'bc' });
  assert.notEqual(digestSources(['a.js', 'b.js'], read), digestSources(['c.js', 'd.js'], read));
});

test('rules: a changed model with an unrevised card is reported, with what to do', () => {
  const read = fakeRead({ 'model.js': 'changed', 'card.md': '#' });
  const problems = revisionProblems(
    [{ sceneId: 's', card: 'card.md', modelSources: ['model.js'], cardRevision: 1, modelDigest: 'stale' }],
    read
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0], /the model changed but the card was not revised/);
  assert.match(problems[0], /revisions:adopt/, 'the failure should say what to do about it');
  assert.match(problems[0], /revision 2/);
});

test('rules: an entry missing its fields is reported rather than skipped', () => {
  const problems = revisionProblems([{ sceneId: 's' }], fakeRead({}));
  assert.match(problems.join('\n'), /missing "card"/);
  assert.match(problems.join('\n'), /missing "modelSources"/);
  assert.match(problems.join('\n'), /declares no model sources/);
});

test('rules: a source that cannot be read is a problem, not a pass', () => {
  const problems = revisionProblems(
    [{ sceneId: 's', card: 'card.md', modelSources: ['gone.js'], cardRevision: 1, modelDigest: 'x' }],
    fakeRead({ 'card.md': '#' })
  );
  assert.match(problems[0], /cannot read a declared source/);
});

test('rules: a card that does not exist is a problem', () => {
  const read = fakeRead({ 'model.js': 'code' });
  const digest = digestSources(['model.js'], read);
  const problems = revisionProblems(
    [{ sceneId: 's', card: 'missing.md', modelSources: ['model.js'], cardRevision: 1, modelDigest: digest }],
    read
  );
  assert.match(problems.join('\n'), /does not exist/);
});

test('rules: a duplicate or unregistered scene is reported', () => {
  const read = fakeRead({ 'model.js': 'code', 'card.md': '#' });
  const entry = {
    sceneId: 'ghost',
    card: 'card.md',
    modelSources: ['model.js'],
    cardRevision: 1,
    modelDigest: digestSources(['model.js'], read),
  };
  const problems = revisionProblems([entry, entry], read, { sceneIds: new Set(['real']) });
  assert.match(problems.join('\n'), /duplicate entry/);
  assert.match(problems.join('\n'), /not a registered scene/);
});

test('adopt: a revision is bumped only where the digest actually moved', () => {
  const read = fakeRead({ 'a.js': 'one', 'b.js': 'two' });
  const entries = [
    { sceneId: 'moved', card: 'c.md', modelSources: ['a.js'], cardRevision: 3, modelDigest: 'stale' },
    { sceneId: 'still', card: 'c.md', modelSources: ['b.js'], cardRevision: 7, modelDigest: digestSources(['b.js'], read) },
  ];
  const { entries: next, changed } = adoptRevisions(entries, read, { today: '2026-09-01' });

  assert.deepEqual(changed.map((item) => item.sceneId), ['moved']);
  assert.equal(next[0].cardRevision, 4);
  assert.equal(next[0].cardUpdatedAt, '2026-09-01');
  // A revision number that rises when nothing changed teaches everyone to
  // ignore it.
  assert.equal(next[1].cardRevision, 7);
  assert.equal(next[1].cardUpdatedAt, undefined);
});

test('stale: a review whose model has changed is reported', () => {
  const read = fakeRead({ 'model.js': 'rewritten' });
  const entries = [{ sceneId: 's', card: 'c.md', modelSources: ['model.js'], cardRevision: 1, modelDigest: 'x' }];
  const stale = staleReviews([{ sceneId: 's', reviewStatus: 'reviewed', reviewedModelDigest: 'old' }], entries, read);
  assert.equal(stale.length, 1);
  assert.match(stale[0].reason, /changed since it was reviewed/);
  assert.equal(stale[0].current, digestSources(['model.js'], read));
});

test('stale: a review that does not record what it reviewed is itself the problem', () => {
  const read = fakeRead({ 'model.js': 'code' });
  const entries = [{ sceneId: 's', card: 'c.md', modelSources: ['model.js'], cardRevision: 1, modelDigest: 'x' }];
  const stale = staleReviews([{ sceneId: 's', reviewStatus: 'reviewed' }], entries, read);
  assert.match(stale[0].reason, /does not record what it reviewed/);
});

test('stale: only completed reviews are checked', () => {
  const read = fakeRead({ 'model.js': 'code' });
  const entries = [{ sceneId: 's', card: 'c.md', modelSources: ['model.js'], cardRevision: 1, modelDigest: 'x' }];
  for (const status of ['pending', 'legacy-unversioned']) {
    assert.deepEqual(staleReviews([{ sceneId: 's', reviewStatus: status }], entries, read), []);
  }
});

// --- this repository -------------------------------------------------------

test('repository: every model card describes the model it is filed against', () => {
  const problems = revisionProblems(revisions, read, { sceneIds });
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('repository: every scene with a model card has a revision entry', () => {
  const recorded = new Set(revisions.map((entry) => entry.sceneId));
  for (const scene of SCENES.filter((entry) => entry.modelCard)) {
    assert.ok(recorded.has(scene.id), `${scene.id} declares a model card with no revision entry`);
  }
});

test('repository: every revision entry names a card that the catalogue or a production scene uses', () => {
  const cards = new Set(SCENES.map((scene) => scene.modelCard).filter(Boolean));
  for (const entry of revisions) {
    const scene = SCENES.find((item) => item.id === entry.sceneId);
    assert.ok(scene, `${entry.sceneId} is not a scene`);
    // Production scenes pre-date the modelCard field; their card is still real.
    if (scene.modelCard) assert.ok(cards.has(entry.card), `${entry.sceneId}: card path disagrees with the catalogue`);
    assert.doesNotThrow(() => read(entry.card));
  }
});

test('repository: a clinical review either still describes its model, or says it does not', () => {
  // A stale review is not automatically invalid — it is a review of something
  // else. What is not acceptable is a stale review that keeps quiet about it.
  const stale = staleReviews(reviews, revisions, read);
  const byScene = new Map(reviews.map((record) => [record.sceneId, record]));

  for (const item of stale) {
    const record = byScene.get(item.sceneId);
    const declared = record?.modelChangedSinceReview;
    assert.ok(
      declared,
      `${item.sceneId}: ${item.reason}, and the registry does not say so. ` +
        'Record it under "modelChangedSinceReview" or have the review re-signed.'
    );
    assert.equal(declared.currentModelDigest, item.current, `${item.sceneId}: the recorded change is itself out of date`);
    assert.match(declared.changedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(declared.summary?.length > 20, `${item.sceneId}: says nothing about what changed`);
    assert.ok(
      declared.effectOnReviewedBehaviour?.length > 20,
      `${item.sceneId}: does not say whether the reviewed behaviour still holds`
    );
  }
});

test('repository: a completed review records the digest of what it signed', () => {
  for (const record of reviews.filter((entry) => entry.reviewStatus === 'reviewed')) {
    assert.match(
      record.reviewedModelDigest ?? '',
      /^[0-9a-f]{16}$/,
      `${record.sceneId} claims a completed review without recording what was reviewed`
    );
  }
});

test('repository: a review that changed keeps the change in its unresolved limitations', () => {
  for (const record of reviews.filter((entry) => entry.modelChangedSinceReview)) {
    const limitations = record.unresolvedLimitations.join('\n');
    assert.match(
      limitations,
      /since the recorded review|not been clinically reviewed/i,
      `${record.sceneId}: the drift is recorded but a reader of the limitations would not learn about it`
    );
  }
});
