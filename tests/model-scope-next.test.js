import test from 'node:test';
import assert from 'node:assert/strict';

import { createModelScopePanel } from '../src/components/ModelScopePanel.js';
import { HEART_MODEL_SCOPE, HEART_RELATED } from '../src/data/heartAnatomy.js';
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
    const panel = createModelScopePanel(HEART_MODEL_SCOPE, { related: HEART_RELATED });
    const links = findByClass(panel.element, 'scope-next-link');
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
    const panel = createModelScopePanel(HEART_MODEL_SCOPE, {
      related: { ...HEART_RELATED, scenes: HEART_RELATED.scenes.filter((entry) => entry.slug === 'heart-failure') },
    });
    const links = findByClass(panel.element, 'scope-next-link');
    assert.equal(links.length, 1);
    assert.equal(links[0].getAttribute('href'), '#/heart-failure');
  });
});

test('scope: with nothing open the section is not there at all', () => {
  // Not an empty heading with nothing under it.
  withFakeDom(() => {
    const panel = createModelScopePanel(HEART_MODEL_SCOPE, { related: { ...HEART_RELATED, scenes: [] } });
    assert.equal(findByClass(panel.element, 'scope-next').length, 0);
    assert.equal(findByClass(panel.element, 'scope-next-note').length, 0);
    assert.doesNotMatch(textOf(panel.element), /この先はどこで見られるか/);
  });
});

test('scope: the links carry the sentence that says they are other models', () => {
  // Two scenes reached from one panel read as two states of one thing unless
  // something says otherwise, and this model is a fixed specimen: it has no
  // "later".
  withFakeDom(() => {
    const panel = createModelScopePanel(HEART_MODEL_SCOPE, { related: HEART_RELATED });
    const note = findByClass(panel.element, 'scope-next-note');
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
