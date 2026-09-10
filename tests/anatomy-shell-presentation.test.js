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

function sceneUi({ anatomy = true } = {}) {
  const subtitle = new FakeElement('p');
  subtitle.classList.add('subtitle');
  subtitle.textContent = 'Always-visible production explanation';

  const status = new FakeElement('div');
  status.classList.add('title-trust-badges');

  const titleCard = new FakeElement('header');
  titleCard.classList.add('title-card');
  titleCard.append(status, subtitle);
  titleCard.querySelector = (selector) => {
    if (selector === '.subtitle') return queryByClass(titleCard, 'subtitle');
    if (selector === '.title-trust-badges') return queryByClass(titleCard, 'title-trust-badges');
    return null;
  };

  const ui = new FakeElement('div');
  if (anatomy) ui.dataset.anatomy = 'yes';
  ui.append(titleCard);
  ui.querySelector = (selector) => selector === '.title-card' ? titleCard : null;

  return { ui, titleCard, status, subtitle };
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
