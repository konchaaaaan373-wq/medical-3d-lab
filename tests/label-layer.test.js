import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import { createLabelLayer } from '../src/components/LabelLayer.js';
import { findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * Guards for the bug this repairs: a reader tapped a cortical structure and
 * the panel named it, but the model went on showing only the authored
 * landmark that happened to be in view — the selection had no label of its
 * own on screen. Two rules close that:
 *
 *  1. A selection is exempt from the per-frame label cap, so it is never the
 *     one dropped to make room for landmarks (see `render()` in
 *     `LabelLayer.js`).
 *  2. A landmark is drawn visibly muted, and one naming the same structure a
 *     selection has pinned steps aside instead of duplicating it — so a
 *     landmark with nothing selected does not read as a pick, and does not
 *     stand in for the selection once there is one.
 *
 * These are exercised through the real `createLabelLayer`, with a fake
 * `document` and a real `THREE.Camera` for the projection math — not a
 * source-text match — because the failure this closes was exactly "the
 * plumbing looked right and the label still was not there".
 */

function withFakeDom(run) {
  const restore = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = { innerWidth: 1280 };
  try {
    return run();
  } finally {
    restore();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}

/** A camera that puts the world origin comfortably on screen. */
function testCamera() {
  const camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.updateMatrixWorld(true);
  return camera;
}

function testViewer() {
  return { container: { clientWidth: 800, clientHeight: 600 }, camera: testCamera() };
}

/** A minimal annotation, always visible and always drawn, at the origin. */
const landmark = (id, structureId) => ({
  id,
  text: `EN ${id}`,
  sub: `JA ${id}`,
  structureId,
  position: new THREE.Vector3(0, 0, 0),
  range: [0, 1],
  isVisible: () => true,
  isDrawn: () => true,
});

const visibleLabels = (layer) =>
  findByClass(layer.element, 'label3d').filter((node) => node.style.visibility === 'visible');

test('label layer: a selection does not cost a landmark its slot under the cap', () =>
  withFakeDom(() => {
    // Exactly the cap (6, non-compact) worth of authored landmarks, all drawn
    // and visible, so every one of them already fills a slot.
    const landmarks = Array.from({ length: 6 }, (_, i) => landmark(`lm${i}`, 100 + i));
    const layer = createLabelLayer({ viewer: testViewer(), annotations: landmarks });
    layer.update(0.5);
    layer.render();
    assert.equal(visibleLabels(layer).length, 6, 'six landmarks fill the six-label cap');

    // A selection naming a *different* structure is added on top.
    layer.setStructureLabel('selection', landmark('sel', 999));
    layer.update(0.5);
    layer.render();
    assert.equal(
      visibleLabels(layer).length,
      7,
      'the selection must be shown in addition to the six landmarks, not by evicting one of them'
    );
  }));

test('label layer: an authored landmark is muted, and merges into a matching selection', () =>
  withFakeDom(() => {
    const layer = createLabelLayer({ viewer: testViewer(), annotations: [landmark('lm-a', 42)] });
    layer.update(0.5);
    layer.render();

    const beforeSelection = findByClass(layer.element, 'label3d');
    assert.equal(beforeSelection.length, 1);
    assert.ok(
      beforeSelection[0].classList.contains('label3d-landmark'),
      'a landmark with nothing selected must read as scenery, not as a pick'
    );
    assert.equal(beforeSelection[0].style.visibility, 'visible');

    // A selection pins the *same* structure the landmark names.
    layer.setStructureLabel('selection', landmark('sel-42', 42));
    layer.update(0.5);
    layer.render();

    const nodes = findByClass(layer.element, 'label3d');
    const landmarkNode = nodes.find((node) => node.classList.contains('label3d-landmark'));
    const selectionNode = nodes.find((node) => !node.classList.contains('label3d-landmark'));
    assert.equal(
      landmarkNode.style.visibility,
      'hidden',
      'a landmark naming the same structure as the selection must merge into it, not duplicate it'
    );
    assert.equal(selectionNode.style.visibility, 'visible');
  }));

test('label layer: a selection naming a different structure leaves the landmark alone', () =>
  withFakeDom(() => {
    const layer = createLabelLayer({ viewer: testViewer(), annotations: [landmark('lm-a', 42)] });
    layer.setStructureLabel('selection', landmark('sel-7', 7));
    layer.update(0.5);
    layer.render();

    const nodes = findByClass(layer.element, 'label3d');
    assert.equal(nodes.length, 2);
    assert.ok(nodes.every((node) => node.style.visibility === 'visible'));
  }));
