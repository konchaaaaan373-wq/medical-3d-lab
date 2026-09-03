import test from 'node:test';
import assert from 'node:assert/strict';
import BrainAnatomyScene from '../src/scenes/nervous/scenes/brainAnatomy/index.js';
import { createInspectionPanel } from '../src/components/InspectionPanel.js';
import { createLegend } from '../src/components/Legend.js';
import {
  BRAIN_ANATOMICAL_PALETTE,
  BRAIN_ANATOMY_META,
  BRAIN_PALETTE,
} from '../src/data/brainAnatomy.js';
import { findByClass, installFakeDocument } from './helpers/fake-dom.js';

test('shared inspection modes switch the real scene, active state, and legend together', () => {
  const restoreDocument = installFakeDocument();
  const scene = new BrainAnatomyScene();
  let panel;

  try {
    const legend = createLegend(BRAIN_ANATOMY_META);
    const modeChanges = [];
    panel = createInspectionPanel({
      views: scene.getInspectionViews(),
      activeView: scene.getInspectionViews()[0].id,
      authoredViews: true,
      activeBackground: 'studio',
      modes: scene.getInspectionModes(),
      activeMode: scene.getInspectionMode(),
      onMode: (id) => {
        scene.setInspectionMode(id);
        modeChanges.push(id);
        legend.setPalette(scene.getInspectionLegendPalette(id));
        return true;
      },
    });

    const buttons = findByClass(panel.element, 'inspection-mode');
    const dots = findByClass(legend.element, 'legend-dot');
    assert.equal(buttons.length, 2);
    assert.equal(findByClass(panel.element, 'inspection-mode-preview').length, 2);
    assert.equal(buttons[0].getAttribute('aria-pressed'), 'true');
    assert.equal(buttons[1].getAttribute('aria-pressed'), 'false');
    assert.ok(buttons[0].classList.contains('is-active'));
    assert.equal(dots[0].style.getPropertyValue('--dot'), BRAIN_PALETTE.frontal);

    buttons[1].click();

    assert.equal(scene.getAnatomyColorMode(), 'anatomical');
    assert.deepEqual(modeChanges, ['anatomical']);
    assert.equal(buttons[0].getAttribute('aria-pressed'), 'false');
    assert.equal(buttons[1].getAttribute('aria-pressed'), 'true');
    assert.ok(!buttons[0].classList.contains('is-active'));
    assert.ok(buttons[1].classList.contains('is-active'));
    assert.equal(dots[0].style.getPropertyValue('--dot'), BRAIN_ANATOMICAL_PALETTE.frontal);
    assert.notEqual(dots[0].style.getPropertyValue('--dot'), BRAIN_PALETTE.frontal);
  } finally {
    scene.dispose();
    restoreDocument();
  }
});

test('shared authored views keep button state and medial visibility state together', () => {
  const restoreDocument = installFakeDocument();
  const scene = new BrainAnatomyScene();
  let panel;

  try {
    const views = scene.getInspectionViews();
    panel = createInspectionPanel({
      views,
      activeView: views[0].id,
      authoredViews: true,
      activeBackground: 'studio',
      onView: (id) => scene.setInspectionView(id),
    });
    const buttons = findByClass(panel.element, 'inspection-view');

    buttons[3].click();
    assert.equal(scene.activeView, 'right-medial');
    assert.equal(scene.medialSide, 'right');
    assert.equal(buttons[3].getAttribute('aria-pressed'), 'true');

    buttons[0].click();
    assert.equal(scene.activeView, 'left-lateral');
    assert.equal(scene.medialSide, null, 'resetting the view restores both hemispheres');
    assert.equal(buttons[0].getAttribute('aria-pressed'), 'true');
    assert.equal(buttons[3].getAttribute('aria-pressed'), 'false');
  } finally {
    scene.dispose();
    restoreDocument();
  }
});
