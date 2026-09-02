import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { SCENES } from '../src/catalog/index.js';
import { adoptRevisions, digestSources, revisionProblems } from '../scripts/model-revisions.js';

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

test('repository: model-card revision is a different obligation from review staleness', () => {
  // Two questions that look alike and are not. `stalePaths` in the clinical
  // review registry answers "does this attestation still describe the code,
  // and may it be shown as current?" — owned by src/catalog/clinicalReview.js.
  // This registry answers "does the model *card* still describe the model?"
  // A review can be correctly stale while its card is fine, and a card can be
  // out of date under a review that was never current.
  const source = read('scripts/model-revisions.js');
  assert.ok(!/staleReviews/.test(source), 'review staleness is not this module\'s job');
  assert.match(source, /stalePaths/, 'and the split should be explained where it could be confused');

  // Nothing in the review registry carries a second digest of its own.
  const stray = reviews.filter((record) => record.reviewedModelDigest || record.modelChangedSinceReview);
  assert.deepEqual(stray, [], 'a second staleness mechanism has grown back');
});

test('repository: every scene with a stale review is presented as stale, not reviewed', () => {
  for (const record of reviews.filter((entry) => entry.reviewStatus === 'stale')) {
    assert.ok(Array.isArray(record.stalePaths) && record.stalePaths.length > 0,
      `${record.sceneId}: stale without saying what changed`);
  }
});
