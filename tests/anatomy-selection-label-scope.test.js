import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/**
 * Which scenes `verify:anatomy`'s check 3c is allowed to *fail*.
 *
 * 3c asserts that the structure a reader pinned is named on the model. That
 * only holds for a scene that can move a label's anchor when the one it has
 * goes behind something: ranked candidates plus `reanchor()`. A scene that
 * keeps one fixed point per structure can be occluded from an angle with
 * nothing it can do about it — F-40 in its original shape — and asserting
 * against it would report a regression that did not happen (L-29).
 *
 * The first version of the promotion listed `heart-anatomy` beside
 * `brain-anatomy` because both implement `getStructureAnnotation`, and said in
 * a comment that `_visibleAnchorFor` lived in both scene classes. It does not;
 * heart still caches a single `outwardSurfacePoint()`. This ties the two sets
 * to what the scene classes can actually do, so the same mistake cannot be
 * made silently again — including in the other direction, when heart does gain
 * candidate search and should be promoted.
 */
const CHECK = readFileSync('scripts/check-anatomy-interaction.mjs', 'utf8');

/** Scene sources, by the slug `verify:anatomy` is run with. */
const SCENE_SOURCES = {
  'brain-anatomy': 'src/scenes/nervous/scenes/brainAnatomy/BrainAnatomyScene.js',
  'heart-anatomy': 'src/scenes/cardiovascular/scenes/heartAnatomy/HeartAnatomyScene.js',
};

/** The slugs in one of the check's two sets. */
function slugsIn(setName) {
  const match = CHECK.match(new RegExp(`const ${setName} = new Set\\(\\[([^\\]]*)\\]`));
  assert.ok(match, `${setName} is gone from check-anatomy-interaction.mjs`);
  return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

test('3c only fails scenes whose anchors can move', () => {
  for (const slug of slugsIn('SCENES_WITH_MOVABLE_ANCHORS')) {
    const path = SCENE_SOURCES[slug];
    assert.ok(path, `${slug} is asserted by 3c but this test does not know its scene class`);
    const source = readFileSync(path, 'utf8');
    assert.match(
      source,
      /reanchor/,
      `${slug} is held to "a selection is labelled whenever it is drawn", but ${path} has no ` +
        'reanchor() — an occluded anchor there is F-40, and 3c would call it a regression'
    );
    assert.match(source, /_visibleAnchorFor/, `${path} has no candidate search to reanchor to`);
  }
});

test('3c notes, rather than fails, a scene that anchors a selection at one fixed point', () => {
  const fixed = slugsIn('SCENES_WITH_FIXED_ANCHORS');
  for (const slug of fixed) {
    const path = SCENE_SOURCES[slug];
    assert.ok(path, `${slug} is listed as fixed-anchor but this test does not know its scene class`);
    const source = readFileSync(path, 'utf8');
    assert.match(
      source,
      /getStructureAnnotation/,
      `${slug} is listed as a scene that labels a selection, but ${path} does not implement it`
    );
    assert.doesNotMatch(
      source,
      /reanchor/,
      `${path} can move a label's anchor now, so ${slug} belongs in SCENES_WITH_MOVABLE_ANCHORS ` +
        'and 3c should be failing for it'
    );
  }
});

test('a scene that can move its anchor is held to 3c, not quietly let off it', () => {
  // The other direction, and the one that matters most: emptying
  // SCENES_WITH_MOVABLE_ANCHORS would turn 3c back into a note for every scene
  // without failing anything — which is L-46 happening a second time, by
  // deletion instead of by a `notes.push`. A scene whose class carries the
  // machinery must be listed.
  const movable = slugsIn('SCENES_WITH_MOVABLE_ANCHORS');
  for (const [slug, path] of Object.entries(SCENE_SOURCES)) {
    const source = readFileSync(path, 'utf8');
    if (!/reanchor/.test(source)) continue;
    assert.ok(
      movable.includes(slug),
      `${path} can move a label's anchor, so ${slug} must be in SCENES_WITH_MOVABLE_ANCHORS — ` +
        'otherwise verify:anatomy only notes a missing selection label and never fails on it (L-46)'
    );
  }
});

test('a scene is in exactly one of the two sets', () => {
  const movable = slugsIn('SCENES_WITH_MOVABLE_ANCHORS');
  const fixed = slugsIn('SCENES_WITH_FIXED_ANCHORS');
  assert.deepEqual(
    movable.filter((slug) => fixed.includes(slug)),
    [],
    'a scene cannot both be held to 3c and excused from it'
  );
});
