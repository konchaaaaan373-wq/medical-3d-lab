import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { mountAnatomyShellPresentation } from '../src/app/anatomyShellPresentation.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

const css = readFileSync(
  new URL('../src/styles/anatomy-shell-presentation.css', import.meta.url),
  'utf8'
);

function withDom(run) {
  const restoreDocument = installFakeDocument();
  try {
    return run();
  } finally {
    restoreDocument();
  }
}

function queryByClass(root, className) {
  return findByClass(root, className)[0] ?? null;
}

function sceneUi({ anatomy = true, withTitle = false } = {}) {
  const subtitle = new FakeElement('p');
  subtitle.classList.add('subtitle');
  subtitle.textContent = 'Always-visible production explanation';

  const status = new FakeElement('div');
  status.classList.add('title-trust-badges');

  const titleEn = new FakeElement('h1');
  titleEn.classList.add('title', 'lang-en');
  titleEn.textContent = 'Interactive brain anatomy';
  const titleJa = new FakeElement('p');
  titleJa.classList.add('title-ja', 'lang-ja');
  titleJa.textContent = '触れて学ぶ脳の解剖';

  const titleCard = new FakeElement('header');
  titleCard.classList.add('title-card');
  if (withTitle) titleCard.append(titleEn, titleJa);
  titleCard.append(status, subtitle);
  titleCard.querySelector = (selector) => {
    if (selector === '.subtitle') return queryByClass(titleCard, 'subtitle');
    if (selector === '.title-trust-badges') return queryByClass(titleCard, 'title-trust-badges');
    if (withTitle && selector === '.title') return titleEn;
    if (withTitle && selector === '.title-ja') return titleJa;
    return null;
  };

  const ui = new FakeElement('div');
  if (anatomy) ui.dataset.anatomy = 'yes';
  ui.append(titleCard);
  ui.querySelector = (selector) => selector === '.title-card' ? titleCard : null;

  return { ui, titleCard, status, subtitle, titleEn, titleJa };
}

/**
 * A viewport, as `matchMedia` reports one.
 *
 * `applyWidth()` reads the *global* `window`, not an injected one, which is
 * how this adapter behaves in a browser. Restoring whatever was there is the
 * whole of the cleanup.
 */
function withWidth(narrow, run) {
  const previous = globalThis.window;
  globalThis.window = {
    matchMedia: (query) => ({
      matches: narrow && query.includes('430'),
      addEventListener() {},
      removeEventListener() {},
    }),
  };
  try {
    return run();
  } finally {
    if (previous === undefined) delete globalThis.window;
    else globalThis.window = previous;
  }
}

test('anatomy shell presentation is a no-op outside the shared anatomy contract', () => {
  withDom(() => {
    const { ui, subtitle } = sceneUi({ anatomy: false });
    assert.equal(mountAnatomyShellPresentation({ ui }), null);
    assert.equal(ui.dataset.anatomyShell, undefined);
    assert.equal(subtitle.parentNode, undefined);
  });
});

test('anatomy shell keeps status visible and makes the long explanation optional', () => {
  withDom(() => {
    const { ui, titleCard, status, subtitle } = sceneUi();
    const mounted = mountAnatomyShellPresentation({ ui });
    const disclosures = findByClass(titleCard, 'anatomy-shell-about');

    assert.equal(ui.dataset.anatomyShell, 'calm');
    assert.equal(disclosures.length, 1);
    assert.equal(disclosures[0].tagName, 'DETAILS');
    assert.equal(findByClass(disclosures[0], 'anatomy-shell-about-toggle')[0].tagName, 'SUMMARY');
    assert.equal(findByClass(disclosures[0], 'subtitle')[0], subtitle);
    assert.equal(status.getAttribute('aria-label'), 'Model status / モデル状態');
    assert.equal(mountAnatomyShellPresentation({ ui }), null, 'mounting twice must not duplicate UI');

    // The shared lightweight fake intentionally implements only the DOM used by
    // existing components. Supply the two native methods this adapter uses for
    // teardown instead of weakening the production cleanup assertion.
    disclosures[0].contains = (node) => findByClass(disclosures[0], 'subtitle').includes(node);
    disclosures[0].remove = () => {
      titleCard.children = titleCard.children.filter((child) => child !== disclosures[0]);
    };
    mounted.destroy();
    assert.equal(ui.dataset.anatomyShell, undefined);
    assert.equal(findByClass(titleCard, 'anatomy-shell-about').length, 0);
    assert.equal(findByClass(titleCard, 'subtitle')[0], subtitle);
  });
});

test('anatomy shell CSS cannot affect a scene until the adapter opts in', () => {
  const selectors = css
    .split('{')
    .slice(0, -1)
    .map((chunk) => chunk.slice(chunk.lastIndexOf('}') + 1).trim())
    .filter((selector) => selector && !selector.startsWith('/*') && !selector.startsWith('@'));

  for (const selector of selectors) {
    for (const branch of selector.split(',')) {
      assert.match(branch, /#ui\[data-anatomy-shell='calm'\]/, branch.trim());
    }
  }
  assert.match(css, /console > \.stage-readout/);
  assert.match(css, /global-nav-current-scene/);
  assert.match(css, /\.anatomy-panel/);
});


/**
 * The model's name, on a phone.
 *
 * At 430px and under the title card stops being a card: its title lines and
 * its review state move inside the "情報・設定" disclosure so the model gets the
 * height back. Screenshotted at 390×844 on `#/brain-anatomy`, the result was a
 * screen with **no model name on it at all** — the only identity was a
 * one-character chip in the header — behind a control whose label gives no
 * reason to press it, while the one link to the model's medical basis was
 * inside that same closed disclosure.
 *
 * So the title lines go into the summary rather than into the body: the
 * control names the model, and what opens is that model's information. Moved,
 * never copied — two titles is how one of them comes to be wrong, which is the
 * rule the review state already follows.
 */
test('on a phone the disclosure is named by the model, and the name is not duplicated', () => {
  withDom(() => {
    withWidth(true, () => {
      const { ui, titleCard, titleEn, titleJa, status } = sceneUi({ withTitle: true });
      mountAnatomyShellPresentation({ ui });

      const identity = queryByClass(titleCard, 'anatomy-shell-about-identity');
      assert.ok(identity, 'the summary has somewhere to put the model name');
      assert.equal(identity.children.includes(titleEn), true, 'the English title moved into it');
      assert.equal(identity.children.includes(titleJa), true, 'and the Japanese one');

      // In the summary, not in the body — the point is that the *control* says
      // which model this is, before anything is opened.
      const copy = queryByClass(titleCard, 'anatomy-shell-about-copy');
      assert.equal(findByClass(copy, 'title').includes(titleEn), false, 'not also in the body');
      assert.equal(findByClass(copy, 'title-ja').includes(titleJa), false, 'nor the Japanese one');

      // The review state and the link beside it still go inside, where there
      // is room to read them.
      assert.equal(copy.children.includes(status), true, 'the review state is inside the disclosure');

      // And the label survives, so what opening it does is still stated.
      assert.ok(queryByClass(titleCard, 'anatomy-shell-about-label'), 'the label is still there');
    });
  });
});

test('above that width the title stays where it was and the summary is unnamed', () => {
  withDom(() => {
    withWidth(false, () => {
      const { ui, titleCard, titleEn, titleJa } = sceneUi({ withTitle: true });
      mountAnatomyShellPresentation({ ui });

      const identity = queryByClass(titleCard, 'anatomy-shell-about-identity');
      assert.ok(identity, 'the span exists at every width');
      assert.deepEqual(identity.children, [], 'and is empty, so CSS collapses it away');
      assert.equal(titleCard.children.includes(titleEn), true, 'the heading is still the heading');
      assert.equal(titleCard.children.includes(titleJa), true);
    });
  });
});
