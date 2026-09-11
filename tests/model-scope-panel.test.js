import test from 'node:test';
import assert from 'node:assert/strict';

import { createModelScopePanel } from '../src/components/ModelScopePanel.js';
import { SCENE_MANIFEST } from '../src/catalog/scenes.js';
import { findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * The scope panel is where a scene says what it does not represent, and that is
 * the half a reader needs most on a scene whose whole risk is being read for
 * more than it claims.
 *
 * It was declared, asserted in a scene test, and **not on the screen**: three
 * scenes spell the list `limits` rather than `excludes`, the panel read only
 * `excludes`, and so myocardial ischaemia drew the heading 「表現していないこと」
 * with nothing under it — losing "there is no infarction here — no necrosis, no
 * scar, no infarct expansion", the one sentence that scene most needs.
 *
 * A test that reads the data cannot catch that. These build the panel and read
 * the rendered nodes, and they run over every scene in the manifest rather than
 * the one that happened to break.
 */

/** Every string the panel put on the screen, `**emphasis**` included. */
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

const withFakeDom = (run) => {
  const restore = installFakeDocument();
  try {
    return run();
  } finally {
    restore();
  }
};

/** Every scene that declares a scope, with the scope it declares. */
async function scopedScenes() {
  const out = [];
  for (const entry of SCENE_MANIFEST) {
    const module = await entry.load();
    const meta = module.default?.meta ?? module.Scene?.meta ?? null;
    if (meta?.modelScope) out.push({ slug: entry.slug, scope: meta.modelScope });
  }
  return out;
}

test('model scope: no scene draws a section heading with nothing under it', async () => {
  const scenes = await scopedScenes();
  assert.ok(scenes.length >= 5, 'the manifest still has scenes with a declared scope');

  const empty = [];
  for (const { slug, scope } of scenes) {
    withFakeDom(() => {
      const panel = createModelScopePanel(scope);
      // The headings the panel only renders when it has something to put under
      // them are fine. This is about the ones it renders unconditionally.
      const [excludes] = findByClass(panel.element, 'scope-excludes');
      if (!excludes || !excludes.children.length) empty.push(slug);
    });
  }
  assert.deepEqual(empty, [], 'these scenes show "what it does not represent" with no items');
});

test('model scope: `limits` is read as well as `excludes`', () => {
  // Two spellings for one list is the bug above waiting to happen again. Until
  // they are one word, the panel has to answer to both.
  withFakeDom(() => {
    const viaLimits = createModelScopePanel({
      question: 'q', questionJa: 'q',
      answers: [{ text: 'a', textJa: 'a' }],
      limits: [{ text: 'no infarction', textJa: '梗塞はありません' }],
      sources: [],
    });
    const [list] = findByClass(viaLimits.element, 'scope-excludes');
    assert.ok(list, 'a scope declaring `limits` still renders the list');
    assert.equal(list.children.length, 1);
  });
});

test('model scope: ischaemia says on screen what the colour is, and what it is not', async () => {
  // The colour is the loudest thing in that scene. What it represents — an
  // educational emphasis of the ischaemic region — belongs beside the model's
  // own limits, not only inside the patient guide, because the professional
  // view is where somebody checks what a picture is claiming.
  const scenes = await scopedScenes();
  const ischemia = scenes.find((entry) => entry.slug === 'myocardial-ischemia');
  assert.ok(ischemia, 'the ischaemia scene declares a scope');

  const text = withFakeDom(() => textOf(createModelScopePanel(ischemia.scope).element));

  assert.match(text, /教育目的で強調/, 'it says the colour is an educational emphasis');
  assert.match(text, /壊死・梗塞・瘢痕を表してはおらず/, 'and that it is not necrosis, infarct or scar');
  assert.match(text, /梗塞はありません/, 'the no-infarction limit reaches the screen');
});
