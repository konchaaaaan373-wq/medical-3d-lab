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
 *  1. A selection is exempt from *eviction* under the per-frame label cap,
 *     so it is never the one dropped to make room for landmarks — but it
 *     still *counts* against that cap once drawn, so the lowest-priority
 *     landmark steps aside for it rather than the cap growing by one (see
 *     `render()` in `LabelLayer.js`).
 *  2. A landmark is drawn visibly muted, and one naming the same structure a
 *     selection has pinned steps aside instead of duplicating it — so a
 *     landmark with nothing selected does not read as a pick, and does not
 *     stand in for the selection once there is one.
 *
 * Two further rules, found in review of the above and closed here too:
 *
 *  3. `setStructureLabel` compares the anchor, not only the id — a re-tap on
 *     the structure that is already selected keeps the same `structure:<id>`
 *     but can carry a new point, and comparing the id alone discarded it.
 *  4. A label whose captured anchor has rotated out of view is offered a
 *     fresh one through `annotation.reanchor()`, tried only once the current
 *     point has already failed `isVisible` — never on a point that still
 *     holds.
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

/** The `EN <id>` text a `label3d` node was built from — `textContent` on the
 * fake DOM's root div is not the aggregate of its children, so this reads the
 * one leaf span that actually holds it. */
const labelText = (node) => node.querySelector('.label-en').textContent;

test('label layer: a selection is immune from eviction but still counts toward the cap', () =>
  withFakeDom(() => {
    // Exactly the cap (6, non-compact) worth of authored landmarks, all drawn
    // and visible, so every one of them already fills a slot.
    const landmarks = Array.from({ length: 6 }, (_, i) => landmark(`lm${i}`, 100 + i));
    const layer = createLabelLayer({ viewer: testViewer(), annotations: landmarks });
    layer.update(0.5);
    layer.render();
    assert.equal(visibleLabels(layer).length, 6, 'six landmarks fill the six-label cap');

    // A selection naming a *different* structure is added on top. It must
    // never be the one dropped — but excluding it from the count entirely
    // let all six landmarks keep their slot too, showing seven labels where
    // the documented cap is six.
    layer.setStructureLabel('selection', landmark('sel', 999));
    layer.update(0.5);
    layer.render();
    const visible = visibleLabels(layer);
    assert.equal(
      visible.length,
      6,
      'the selection counts toward the cap, so the total stays at six, not seven'
    );
    assert.ok(
      visible.some((node) => labelText(node) === 'EN sel'),
      'the selection itself must be one of the six — it is exempt from eviction, not from the count'
    );
    assert.ok(
      !visible.some((node) => labelText(node) === 'EN lm5'),
      'the lowest-priority landmark is the one that steps aside for it'
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

test('label layer: setStructureLabel accepts a changed anchor for an unchanged id', () =>
  withFakeDom(() => {
    // `getStructureAnnotation` builds the id from the structure, `structure:
    // <id>` — a re-tap on the structure that is already selected keeps that
    // id even though the point the tap hit moved (`_lastPick` in
    // `BrainAnatomyScene.js`). Comparing only the id treated the second tap
    // as a no-op and left the label on the first point.
    const layer = createLabelLayer({ viewer: testViewer(), annotations: [] });
    const first = landmark('structure:1', 1);
    first.position.set(0, 0, 0);
    layer.setStructureLabel('selection', first);
    layer.update(0.5);
    layer.render();
    const transformBefore = findByClass(layer.element, 'label3d')[0].style.transform;

    const second = landmark('structure:1', 1);
    second.position.set(1.2, 0.9, 0);
    layer.setStructureLabel('selection', second);
    layer.update(0.5);
    layer.render();
    const nodeAfter = findByClass(layer.element, 'label3d')[0];

    assert.notEqual(
      nodeAfter.style.transform,
      transformBefore,
      'a re-tap with a new point must move the label, not be discarded as a no-op on the unchanged id'
    );
  }));

test('label layer: an occluded anchor is offered to the scene once, and replaced', () =>
  withFakeDom(() => {
    // Stands in for a selection made without a tap (parts tree, keyboard): the
    // captured point has rotated out of view, but the scene has another
    // candidate on the same structure it can offer through `reanchor()`.
    let visible = false;
    let reanchorCalls = 0;
    const annotation = {
      id: 'structure:900',
      text: 'EN occ',
      sub: 'JA occ',
      structureId: 900,
      position: new THREE.Vector3(0, 0, 0),
      range: [0, 1],
      isDrawn: () => true,
      isVisible: () => visible,
      reanchor: () => {
        reanchorCalls += 1;
        visible = true;
        return true;
      },
    };
    const layer = createLabelLayer({ viewer: testViewer(), annotations: [] });
    layer.setStructureLabel('selection', annotation);
    layer.update(0.5);
    layer.render();

    assert.equal(reanchorCalls, 1, 'an occluded anchor is offered a fresh candidate');
    assert.equal(
      findByClass(layer.element, 'label3d')[0].style.visibility,
      'visible',
      'the label recovers on the same frame once the scene supplies a visible candidate'
    );

    // Rendered again now that the point holds: a captured point that is
    // already visible must not pay for a candidate search every frame.
    layer.render();
    assert.equal(reanchorCalls, 1, 'reanchor is not retried once the anchor is visible');
  }));

test('label layer: a hover on the selected structure merges into the selection', () =>
  withFakeDom(() => {
    // Selecting a structure and then resting the pointer on it fires both
    // `onAnatomySelection` and `onAnatomyHover` with the same structure, and
    // the scene answers both with the same anchor. Two chips on one point,
    // reading the same name, is the landmark duplicate again under another
    // kind — the audit of the first version found only the landmark merged.
    const layer = createLabelLayer({ viewer: testViewer(), annotations: [] });
    layer.setStructureLabel('selection', landmark('sel-42', 42));
    layer.setStructureLabel('hover', landmark('hov-42', 42));
    layer.update(0.5);
    layer.render();
    assert.equal(visibleLabels(layer).length, 1, 'one structure, one label');

    // A hover on a different structure is a second fact, and stays.
    layer.setStructureLabel('hover', landmark('hov-7', 7));
    layer.update(0.5);
    layer.render();
    assert.equal(visibleLabels(layer).length, 2);
  }));
