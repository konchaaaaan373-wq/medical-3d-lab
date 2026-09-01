import test from 'node:test';
import assert from 'node:assert/strict';
import BrainAnatomyScene from '../src/scenes/nervous/scenes/brainAnatomy/index.js';
import { createAnatomyInfoPanel } from '../src/components/AnatomyInfoPanel.js';
import { createLegend } from '../src/components/Legend.js';
import {
  BRAIN_ANATOMICAL_PALETTE,
  BRAIN_ANATOMY_META,
  BRAIN_PALETTE,
} from '../src/data/brainAnatomy.js';
import { findByClass, installFakeDocument } from './helpers/fake-dom.js';

test('colour buttons switch the real scene, active state, and legend together', () => {
  const restoreDocument = installFakeDocument();
  const scene = new BrainAnatomyScene();
  let panel;

  try {
    const legend = createLegend(BRAIN_ANATOMY_META);
    const modeChanges = [];
    panel = createAnatomyInfoPanel(scene, {
      onColorMode: (id) => {
        modeChanges.push(id);
        legend.setPalette(scene.getAnatomyLegendPalette(id));
      },
    });

    const buttons = findByClass(panel.element, 'anatomy-mode');
    const dots = findByClass(legend.element, 'legend-dot');
    assert.equal(buttons.length, 2);
    assert.equal(findByClass(panel.element, 'anatomy-mode-check').length, 2);
    assert.equal(buttons[0].getAttribute('aria-pressed'), 'true');
    assert.equal(buttons[1].getAttribute('aria-pressed'), 'false');
    assert.ok(buttons[0].classList.contains('is-active'));
    assert.equal(dots[0].style.getPropertyValue('--dot'), BRAIN_PALETTE.frontal);

    buttons[1].click();

    assert.equal(scene.getAnatomyColorMode(), 'anatomical');
    assert.deepEqual(modeChanges, ['detail', 'anatomical']);
    assert.equal(buttons[0].getAttribute('aria-pressed'), 'false');
    assert.equal(buttons[1].getAttribute('aria-pressed'), 'true');
    assert.ok(!buttons[0].classList.contains('is-active'));
    assert.ok(buttons[1].classList.contains('is-active'));
    assert.equal(dots[0].style.getPropertyValue('--dot'), BRAIN_ANATOMICAL_PALETTE.frontal);
    assert.notEqual(dots[0].style.getPropertyValue('--dot'), BRAIN_PALETTE.frontal);
  } finally {
    panel?.dispose();
    scene.dispose();
    restoreDocument();
  }
});
