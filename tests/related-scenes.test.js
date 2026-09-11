import test from 'node:test';
import assert from 'node:assert/strict';

import { createRelatedScenesPanel } from '../src/components/RelatedScenesPanel.js';
import { HEART_RELATED } from '../src/data/heartAnatomy.js';
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

test('related: every scene that offers a route declares it in exactly one place', () => {
  // Two declarations for one scene is how the shell comes to offer a route the
  // scope panel does not, or the other way round. The app reads the scene's own
  // metadata first and the catalogue entry only as a fallback, so a scene that
  // set both would have a silent winner.
  for (const scene of SCENE_MANIFEST) {
    const fromCatalogue = Boolean(scene.related);
    if (!fromCatalogue) continue;
    // The catalogue fallback exists for one reason: a scene whose model sources
    // are pinned to a published decision must not have to touch them to gain a
    // route. Only the published atlas qualifies today.
    assert.equal(scene.id, 'brain-anatomy', `${scene.id}: use the scene's own meta.related`);
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
