import test from 'node:test';
import assert from 'node:assert/strict';

import { createRelatedScenesPanel } from '../src/components/RelatedScenesPanel.js';
import { HEART_RELATED } from '../src/data/heartAnatomy.js';
import { RELATED as AMYLOID_RELATED } from '../src/data/amyloidBeta.js';
import { relatedProblems } from '../src/data/relatedContract.js';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';
import { SCENES } from '../src/catalog/index.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * "This model has no physiology" is true, and on its own it is a dead end.
 *
 * The scope panel already says what a model does not represent. These hold the
 * other half — where the reader can go and see it — to the two rules that make
 * it safe to offer: every route has to be a scene this catalogue actually has,
 * and a scene the release is holding back has to be dropped rather than linked
 * to a "TO BE UPDATED" page.
 */

const withFakeDom = (run) => {
  const restore = installFakeDocument();
  try {
    return run();
  } finally {
    restore();
  }
};

const textOf = (node) => {
  const out = [];
  const walk = (current) => {
    if (typeof current?.text === 'string') out.push(current.text);
    if (typeof current?.textContent === 'string' && current.textContent) out.push(current.textContent);
    for (const child of current?.children ?? []) walk(child);
  };
  walk(node);
  return out.join(' ');
};

test('scope: the heart atlas says where the physiology it lacks is shown', () => {
  withFakeDom(() => {
    const panel = createRelatedScenesPanel(HEART_RELATED);
    const links = findByClass(panel.element, 'related-link');
    assert.ok(links.length >= 2, 'it offers somewhere to go');
    const routes = links.map((link) => link.getAttribute('href'));
    assert.ok(routes.includes('#/heart-failure'));
    assert.ok(routes.includes('#/myocardial-ischemia'));
  });
});

test('scope: every route it offers is a scene this catalogue has', () => {
  // A link to a slug the catalogue does not know is a 404 the reader finds for
  // us. The catalogue owns which scenes exist, so it is asked.
  const slugs = new Set(SCENES.map((scene) => scene.slug));
  for (const entry of HEART_RELATED.scenes) {
    assert.ok(slugs.has(entry.slug), `${entry.slug} is a real scene`);
    for (const key of ['label', 'labelJa', 'why', 'whyJa']) {
      assert.ok(entry[key]?.length > 4, `${entry.slug} carries ${key}`);
    }
  }
});

test('scope: a scene the release is holding back is dropped, not linked', () => {
  withFakeDom(() => {
    const panel = createRelatedScenesPanel({
      ...HEART_RELATED,
      scenes: HEART_RELATED.scenes.filter((entry) => entry.slug === 'heart-failure'),
    });
    const links = findByClass(panel.element, 'related-link');
    assert.equal(links.length, 1);
    assert.equal(links[0].getAttribute('href'), '#/heart-failure');
  });
});

test('scope: with nothing open the section is not there at all', () => {
  // Not an empty heading with nothing under it.
  withFakeDom(() => {
    // No panel at all, rather than a heading with nothing under it.
    assert.equal(createRelatedScenesPanel({ ...HEART_RELATED, scenes: [] }), null);
    assert.equal(createRelatedScenesPanel(null), null);
  });
});

test('scope: the links carry the sentence that says they are other models', () => {
  // Two scenes reached from one panel read as two states of one thing unless
  // something says otherwise, and this model is a fixed specimen: it has no
  // "later".
  withFakeDom(() => {
    const panel = createRelatedScenesPanel(HEART_RELATED);
    const note = findByClass(panel.element, 'related-note');
    assert.equal(note.length, 1);
    const said = textOf(note[0]);
    assert.match(said, /different|別/);
    assert.match(said, /not this heart at a later date|この心臓のその後|標本/);
  });
  // And it is not only in the note: each entry says it too, because a reader
  // scanning the list may never reach the paragraph.
  for (const entry of HEART_RELATED.scenes) {
    assert.match(entry.why, /different model/i);
    assert.match(entry.whyJa, /別のモデル/);
  }
});

test('related: every scene that offers a route declares it in exactly one place', async () => {
  // Two declarations for one scene is how the shell comes to offer a route the
  // scope panel does not, or the other way round. The app reads the scene's own
  // metadata first and the catalogue entry only as a fallback, so a scene that
  // set both would have a silent winner.
  //
  // The fallback exists for one reason, and it is the reason — not a list of
  // scene names. **A route is catalogue information**, and a scene whose data
  // file is a pinned model source cannot gain one there without moving the
  // file's digest: that asks for a model-card revision for a change that
  // revised no model, and on a published scene it makes the publication
  // decision stale and closes it. Those scenes declare on the catalogue entry.
  // Everything else declares on its own meta.
  const { default: revisions } = await import('../docs/model-cards/revisions.json', { with: { type: 'json' } });
  const pinned = new Set(revisions.flatMap((entry) => entry.modelSources ?? []));

  for (const scene of SCENE_MANIFEST) {
    if (!scene.related) continue;
    const record = revisions.find((entry) => entry.sceneId === scene.id);
    assert.ok(
      record && (record.modelSources ?? []).some((source) => pinned.has(source)),
      `${scene.id}: declares a route on the catalogue but has no pinned model source — use meta.related`
    );
    const module = await scene.load();
    const meta = module.default?.meta ?? module.Scene?.meta ?? null;
    assert.ok(!meta?.related, `${scene.id}: declared in both places; the catalogue one would lose silently`);
  }
});

test('related: the brain route says it is a change of scale, not a zoom', () => {
  // The one link in this product that crosses scales, and the one misreading
  // that would be worst: that pushing in on a gyrus would reveal those
  // particles. Said in the entry as well as the note.
  const brain = SCENE_MANIFEST.find((scene) => scene.id === 'brain-anatomy');
  assert.ok(brain.related, 'the atlas offers the way on');
  const entry = brain.related.scenes.find((item) => item.slug === 'amyloid-beta');
  assert.ok(entry);
  assert.match(entry.why, /not a zoom/i);
  assert.match(entry.whyJa, /拡大したものではありません/);
  assert.match(brain.related.note, /not a zoom/i);
  assert.match(brain.related.noteJa, /拡大ではなく/);
  assert.match(brain.related.noteJa, /縮尺/);
});

test('related: the amyloid scene offers the way back', () => {
  // Both directions, so a reader who arrived at the molecules can go and find
  // out where the structures are.
  const amyloid = SCENE_MANIFEST.find((scene) => scene.id === 'amyloid-beta');
  assert.equal(amyloid.related, undefined, 'declared on the scene, not the catalogue');
});

/**
 * Crossing to another scale.
 *
 * The prose note already says brain anatomy and amyloid-β are separate models
 * at separate scales. What the note cannot do is let the interface tell that
 * case apart from a link between two models of one organ at one size, and the
 * difference is not cosmetic: a reader who thinks the molecular diagram is what
 * they would see by pushing in on a gyrus has been told something false.
 *
 * Two fields carry it (`src/data/relatedContract.js`), and the next two cases —
 * kidney → nephron, lung → alveolus — are the other kind, `magnified-detail`.
 */

test('scale: every declared transition is one the contract knows', async () => {
  const problems = [];
  for (const entry of SCENE_MANIFEST) {
    const module = await entry.load();
    const meta = module.default?.meta ?? module.Scene?.meta ?? null;
    const related = meta?.related ?? entry.related ?? null;
    if (related) problems.push(...relatedProblems(related, entry.slug));
  }
  assert.deepEqual(problems, []);
});

test('scale: the brain crossing is marked a schematic in both directions', () => {
  const brain = SCENE_MANIFEST.find((entry) => entry.slug === 'brain-anatomy');
  const toAmyloid = brain.related.scenes.find((scene) => scene.slug === 'amyloid-beta');
  assert.equal(toAmyloid.transitionType, 'scale-change');
  assert.equal(toAmyloid.scaleRelationship, 'schematic');

  const back = AMYLOID_RELATED.scenes.find((scene) => scene.slug === 'brain-anatomy');
  assert.equal(back.transitionType, 'scale-change', 'the way back is the same crossing');
  assert.equal(back.scaleRelationship, 'schematic');
});

test('scale: a schematic crossing says so on screen, before the link is followed', () => {
  withFakeDom(() => {
    const panel = createRelatedScenesPanel(AMYLOID_RELATED);
    const [marker] = findByClass(panel.element, 'related-scale');
    assert.ok(marker, 'the crossing is marked');
    assert.match(textOf(marker), /模式図（拡大ではありません）/);
    const [item] = findByClass(panel.element, 'related-item');
    assert.equal(item.getAttribute('data-transition'), 'scale-change');
  });
});

test('scale: a same-scale route carries no scale marker', () => {
  withFakeDom(() => {
    // The heart atlas points at two models of the same heart at the same size.
    // Marking those "another scale" would make the word meaningless where it
    // matters.
    const panel = createRelatedScenesPanel(HEART_RELATED);
    assert.equal(findByClass(panel.element, 'related-scale').length, 0);
  });
});

test('scale: a scale-change that does not say which kind is refused', () => {
  const problems = relatedProblems(
    { scenes: [{ slug: 'nephron', transitionType: 'scale-change' }] },
    'kidney'
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0], /must declare scaleRelationship/);
});
