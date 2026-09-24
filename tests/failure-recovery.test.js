import test from 'node:test';
import assert from 'node:assert/strict';

import { createSceneFailureFallback } from '../src/app/SceneFailureFallback.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * Two failures, two recoveries, and they must not be confused for each other.
 *
 * The renderer failing and the model failing are different events with
 * different answers, and 01-RECOVERY-CONTRACT asks for one retry per failure
 * rather than two overlapping ones:
 *
 *  - **WebGL could not start.** `createApp` throws, `src/main.js` catches it and
 *    replaces the UI with `SceneFailureFallback` — a page with no canvas, no
 *    anatomy panel and its own `.scene-fallback-retry`.
 *  - **The model could not load.** The app is fine, the scene reports `error`,
 *    and the anatomy panel offers `.anatomy-panel-retry` in its summary.
 *
 * The second is covered by `tests/anatomy-recipe-report.test.js` and, end to
 * end in a browser, by `npm run verify:anatomy`. This file holds the first one
 * and the boundary between them.
 */

function withFakeDom(run) {
  const restoreDocument = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = {
    location: { reload: () => { globalThis.window.__reloads = (globalThis.window.__reloads ?? 0) + 1; } },
    addEventListener: () => {},
    removeEventListener: () => {},
    matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
  };
  try {
    return run();
  } finally {
    restoreDocument();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}

test('the WebGL fallback offers its own way back, and only one', () => {
  withFakeDom(() => {
    const ui = new FakeElement('div');
    createSceneFailureFallback({ ui, sceneId: 'brain-anatomy' });

    const retries = findByClass(ui, 'scene-fallback-retry');
    assert.equal(retries.length, 1, 'one retry on the renderer-failure page');
    assert.equal(retries[0].tagName, 'BUTTON');

    retries[0].click();
    assert.equal(globalThis.window.__reloads, 1, 'and pressing it reloads');
  });
});

test('the published model fallback offers its evidence without internal release status', () => {
  withFakeDom(() => {
    const ui = new FakeElement('div');
    createSceneFailureFallback({ ui, sceneId: 'brain-anatomy' });
    assert.deepEqual(findByClass(ui, 'scene-fallback-status'), []);
    const links = findByClass(ui, 'scene-fallback-link');
    assert.ok(links.some((link) => link.getAttribute('href') === '#/trust?model=brain-anatomy'));
  });
});

test('the renderer-failure page carries no anatomy panel, so the two retries cannot both be on screen', () => {
  // The failure fallback replaces the scene entirely: there is no canvas and no
  // panel, so the model-load retry has nothing to render into. That is what
  // keeps "one failure, one way back" true without either surface knowing about
  // the other.
  withFakeDom(() => {
    const ui = new FakeElement('div');
    createSceneFailureFallback({ ui, sceneId: 'brain-anatomy' });

    assert.equal(findByClass(ui, 'anatomy-panel').length, 0);
    assert.equal(findByClass(ui, 'anatomy-panel-retry').length, 0);
    assert.equal(findByClass(ui, 'anatomy-panel-status').length, 0);
  });
});

test('the renderer-failure page hands the reader no developer instructions', () => {
  // Whatever threw, the reader is not the person who runs npm.
  withFakeDom(() => {
    const ui = new FakeElement('div');
    createSceneFailureFallback({ ui, sceneId: 'brain-anatomy' });

    const text = [];
    const walk = (node) => {
      if (node.text) text.push(node.text);
      if (typeof node.textContent === 'string' && node.textContent) text.push(node.textContent);
      for (const child of node.children ?? []) walk(child);
    };
    walk(ui);
    const all = text.join(' ');
    assert.doesNotMatch(all, /npm run/);
    assert.doesNotMatch(all, /TypeError|Error:/);
  });
});
