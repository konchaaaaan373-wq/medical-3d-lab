import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { createLockedSurface } from '../src/app/LockedSurface.js';
import { resolveRoute } from '../src/app/router.js';
import { BETA_ORGANS, RELEASED_SCENES } from '../src/catalog/release.js';
import { openModelDestination } from '../src/catalog/publicManifest.js';
import { organById } from '../src/catalog/taxonomy.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * What a page says about the release, when it is not the release.
 *
 * The locked surface is the page a shared link to an unpublished model lands
 * on, so it is the one surface whose whole job is to talk about what *is*
 * published. It did that in hand-written prose — "the beta is the 3D anatomy of
 * the brain and the heart" — while the release opened the brain alone. Nothing
 * failed; the sentence was simply false, on the page most likely to be reached
 * by somebody who had been sent a link.
 *
 * These tests hold the shape that makes that impossible rather than the
 * sentence that happened to be wrong: the page names published models only
 * through the manifest, and offers exactly one of them.
 */

const mount = (hash) => {
  const ui = new FakeElement('div');
  const restore = installFakeDocument();
  globalThis.document.documentElement = new FakeElement('html');
  try {
    return createLockedSurface({ ui, route: resolveRoute(hash) });
  } finally {
    restore();
  }
};

/**
 * Every text node under an element, in order.
 *
 * `textContent`, not `text`: reading a property the harness does not set
 * returns undefined, every line is dropped, and an assertion that something is
 * *absent* from the result passes for the wrong reason. The first version of
 * this file did exactly that.
 */
const textOf = (node, out = []) => {
  if (node.textContent) out.push(node.textContent);
  for (const child of node.children ?? []) textOf(child, out);
  return out;
};

/** Guards that something was actually read, so an "absent" assertion means it. */
const nonEmpty = (lines, what) => {
  assert.ok(lines.length > 0, `${what}: nothing was read, so nothing can be absent from it`);
  return lines.join(' ');
};

test('the locked page names no published model in its own prose', () => {
  const { element } = mount('#/copd');
  const [actions] = findByClass(element, 'locked-actions');
  assert.ok(actions, 'the page has an actions row');

  const inTheLink = new Set(textOf(actions));
  const prose = nonEmpty(textOf(element).filter((line) => !inTheLink.has(line)), 'the page prose');

  // Every organ the beta could open, named or not — because the sentence that
  // was wrong named one that was not open yet. If a published model is to be
  // named at all, it is named by the manifest, inside the link the manifest
  // generated.
  for (const organId of BETA_ORGANS) {
    const organ = organById(organId);
    for (const name of [organ.label, organ.labelJa]) {
      assert.equal(
        prose.includes(name),
        false,
        `"${name}" is named outside the manifest-generated link: ${prose}`
      );
    }
  }
});

test('the locked page offers exactly one model, and it is one that is open', () => {
  const { element } = mount('#/copd');
  const [actions] = findByClass(element, 'locked-actions');
  const hrefs = findByClass(actions, 'locked-link').map((link) => link.getAttribute('href'));

  // A primary and a way home. Not three controls reaching two destinations.
  assert.equal(hrefs.length, 2, `two controls, got ${hrefs.length}`);
  assert.equal(hrefs[0], openModelDestination().route, 'the primary is the destination the manifest names');
  assert.equal(hrefs[1], '#/', 'and the second is home');

  const openRoutes = new Set(['#/organs', ...RELEASED_SCENES.map((scene) => `#/${scene.slug}`)]);
  assert.equal(openRoutes.has(hrefs[0]), true, `${hrefs[0]} is a route the release opens`);
});

test('one open model is linked directly, because a catalogue of one is a page to pass through', () => {
  const single = { count: 1, models: [{ organId: 'brain', titleEn: 'x', titleJa: 'x', route: '#/brain-anatomy' }] };
  assert.deepEqual(
    openModelDestination(single),
    { route: '#/brain-anatomy', en: 'Open the 3D brain model', ja: '脳の3Dモデルを見る' }
  );

  // And two is a real choice, so it becomes the Explorer with no edit here.
  const two = { count: 2, models: [single.models[0], { organId: 'heart', titleEn: 'y', titleJa: 'y', route: '#/heart-anatomy' }] };
  assert.equal(openModelDestination(two).route, '#/organs');
  assert.equal(openModelDestination({ count: 0, models: [] }).route, '#/organs');
});

test('the badge and the copy are written for the reader, not for the release process', () => {
  const source = readFileSync(new URL('../src/app/LockedSurface.js', import.meta.url), 'utf8');

  // "TO BE UPDATED — 準備中" was a placeholder that shipped. "開発中" is the
  // whole of what a visitor needs from a badge.
  assert.doesNotMatch(source, /TO BE UPDATED/);
  assert.doesNotMatch(source, /準備中/);

  const { element } = mount('#/copd');
  const prose = nonEmpty(textOf(element), 'the page prose');
  assert.match(prose, /このモデルは現在開発中です。医学的内容と素材ライセンスの確認後に公開します。/);

  // The two sentences that went: a definition of "publication decision", and
  // "everything on screen is a claim". True, and addressed to us.
  assert.doesNotMatch(prose, /公開判断/);
  assert.doesNotMatch(prose, /主張だから/);
});

test('the page that answers a shared link is not the page with the smallest type', () => {
  // Comments out first: a rule preceded by `/* ... *\/` has the comment glued
  // to the front of its selector chunk, so an exact-name match silently misses
  // exactly the rules somebody bothered to explain.
  const sheet = readFileSync(new URL('../src/styles/locked.css', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');

  /**
   * The `font-size` a class ends up with, in source order.
   *
   * Every rule whose selector list mentions the class, not the first one that
   * looks right: `.locked-copy` is declared twice here, once in a group with
   * `.locked-summary` and once on its own, and a regex anchored on
   * `\n.locked-copy {` matches the group's second line and reads the wrong
   * body. Later wins, which is the cascade at equal specificity.
   */
  const sizeOf = (className) => {
    const sizes = [];
    for (const [, selectors, body] of sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const names = selectors.split(',').map((one) => one.trim());
      if (!names.some((name) => name === className || name.startsWith(`${className}.`) || name.startsWith(`${className}:`))) continue;
      // The last in the rule too, not the first: two `font-size` lines in one
      // body is the same cascade question one level down, and reading the
      // first of them reports a size the browser never uses.
      const inRule = [...body.matchAll(/font-size:\s*([0-9.]+)px/g)].at(-1)?.[1];
      if (inRule) sizes.push(Number(inRule));
    }
    assert.ok(sizes.length > 0, `${className}: no px font-size anywhere in the sheet`);
    return sizes.at(-1);
  };

  // Prose and control labels only. The badge and the system eyebrow are 9.5px
  // uppercase with letter-spacing, which is a label convention the whole
  // product shares — raising those is a typographic decision about the app,
  // not about this page, and F-113 holds it with the counts.
  for (const className of ['.locked-copy', '.locked-link', '.locked-summary']) {
    const size = sizeOf(className);
    assert.ok(size >= 12, `${className} is ${size}px, below the 12px floor`);
  }
});
