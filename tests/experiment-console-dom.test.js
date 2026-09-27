import test from 'node:test';
import assert from 'node:assert/strict';

import { createModelControls } from '../src/components/ModelControls.js';
import { createMetricsPanel } from '../src/components/MetricsPanel.js';
import { ExperimentSession } from '../src/scenes/cardiovascular/scenes/cardiacOutput/experimentSession.js';
import { PRESET_IDS } from '../src/models/cardiacOutput.js';
import { findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * The one-factor experiment console, as rendered — not as the arrays behind it.
 *
 * The redesign moved things rather than removing them: the four inputs went
 * behind one press, the camera and export tools went behind "More", and the
 * before value and the signed change came onto every headline figure. Each of
 * those is a way for something to go missing silently — a slider that is no
 * longer wired, a button the menu swallowed, a label that kept the name it was
 * first built with — and none of them is visible to a test that reads
 * `getModelControls()` or `getMetrics()`.
 */

const withDocument = async (body) => {
  const restore = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = { matchMedia: () => ({ matches: false, addEventListener() {} }) };
  try {
    return await body();
  } finally {
    globalThis.window = previousWindow;
    restore();
  }
};

const text = (node) =>
  node == null
    ? ''
    : typeof node.textContent === 'string' && !node.children?.length
      ? node.textContent
      : (node.children ?? []).map(text).join(' ');

async function sceneWithSession(session) {
  const { CardiacOutputScene } = await import(
    '../src/scenes/cardiovascular/scenes/cardiacOutput/CardiacOutputScene.js'
  );
  return {
    CardiacOutputScene,
    controls: () => CardiacOutputScene.prototype.getModelControls.call({ session }),
    metrics: () =>
      CardiacOutputScene.prototype.getMetrics.call({ session, comparing: false, state: session.view.metrics }),
  };
}

test('console: a scene that declares nothing advanced keeps every slider in view', async () => {
  await withDocument(async () => {
    const element = createModelControls({
      controls: [{ id: 'a', label: 'A', labelJa: 'A', min: 0, max: 1, step: 0.1, value: 0.5 }],
      onChange: () => {},
      onReset: () => {},
    }).element;
    assert.equal(findByClass(element, 'model-controls-advanced').length, 0);
    assert.equal(findByClass(element, 'slider').length, 1);
  });
});

test('read-out: every row reads start → now with a signed change from the first frame, and the first row renamed in place', async () => {
  await withDocument(async () => {
    const session = new ExperimentSession({ presetId: PRESET_IDS.REDUCED_CONTRACTILITY });
    const { metrics } = await sceneWithSession(session);
    const panel = createMetricsPanel();

    panel.update(metrics());
    const row = (label) => panel.element.children.find((node) => text(node).includes(label));
    // The column is there before anything moves, so it cannot push the
    // console down when it fills in.
    assert.equal(text(findByClass(row('心拍出量'), 'metric-delta')[0]), '±0');
    assert.match(text(findByClass(row('心拍出量'), 'metric-reference')[0]), /^\d+\.\d →$/);

    session.selectIntervention('dobutamine');
    panel.update(metrics());
    const co = row('心拍出量');
    // The direction in the arrow's shape and in words; no grade of size.
    assert.equal(text(findByClass(co, 'metric-change')[0]), '↑');
    assert.match(co.getAttribute('aria-label'), /上昇/);
    assert.doesNotMatch(co.getAttribute('aria-label'), /大きく/);
    const before = text(findByClass(co, 'metric-reference')[0]);
    const now = text(findByClass(co, 'metric-value')[0]);
    const delta = text(findByClass(co, 'metric-delta')[0]);
    assert.equal(
      delta,
      `+${(Number(now) - Number(before.replace(' →', ''))).toFixed(1)}`,
      'and the change is the difference of the two figures shown'
    );
    assert.equal(co.dataset.delta, 'up');

    // The first row names what the figures are read against and what was
    // done, and is updated in place.
    const first = panel.element.children[0];
    assert.match(text(first), /変えた入力（収縮力低下から）/);
    assert.match(text(first), /収縮力 ↑/);

    session.selectIntervention('none');
    panel.update(metrics());
    assert.doesNotMatch(text(panel.element.children[0]), /と比べて/, 'back at the start, the first row names the start alone');
    assert.equal(text(findByClass(row('心拍出量'), 'metric-delta')[0]), '±0');
  });
});

test('toolbar: the view tools are in the row (the view card), and only lesson, reel and image are behind "More"', async () => {
  await withDocument(async () => {
    const { createControlPanel } = await import('../src/components/ControlPanel.js');
    const { CardiacOutputScene } = await import(
      '../src/scenes/cardiovascular/scenes/cardiacOutput/CardiacOutputScene.js'
    );
    const noop = () => {};
    const build = (meta) =>
      createControlPanel({
        meta,
        onSeek: noop,
        onToggle: noop,
        onReset: noop,
        onResetView: noop,
        onCapture: noop,
        onCompareToggle: noop,
        onReel: noop,
        onLearn: noop,
        onDataToggle: noop,
        onZoom: noop,
        onInspectionToggle: noop,
      }).element;

    const controlsOf = (root) =>
      new Set(
        findByClass(root, 'btn')
          .map((button) => button.dataset.control)
          .filter(Boolean)
      );

    const panel = build(CardiacOutputScene.meta);
    const [menu] = findByClass(panel, 'console-more-menu');
    assert.ok(menu, 'the scene declares an overflow, so there is a menu');
    const inMenu = controlsOf(menu);
    for (const id of ['learn', 'reel', 'camera']) {
      assert.ok(inMenu.has(id), `${id} is behind More`);
    }
    // The ways of looking — the comparison, the plots, the camera, the
    // display options — are what the view card is for (owner, 2026-09-26):
    // one press to open the card, not two.
    for (const id of ['compare', 'data', 'zoomIn', 'zoomOut', 'frame', 'eye']) {
      assert.ok(!inMenu.has(id), `${id} is in the row, not behind More`);
    }
    const [row] = findByClass(panel, 'button-row');
    const inRow = new Set([...controlsOf(row)].filter((id) => !inMenu.has(id)));
    assert.ok(inRow.has('more'), 'and More itself is in view');

    // Every button still exists exactly once — moved, not dropped or doubled.
    const all = findByClass(panel, 'btn').map((button) => button.dataset.control);
    assert.equal(all.length, new Set(all).size, 'no button is built twice');

    // A scene that declares nothing gets the row it always had.
    const plain = build({ ...CardiacOutputScene.meta, console: undefined });
    assert.equal(findByClass(plain, 'console-more').length, 0);
  });
});


async function padConsole() {
  const session = new ExperimentSession();
  const { CardiacOutputScene } = await import(
    '../src/scenes/cardiovascular/scenes/cardiacOutput/CardiacOutputScene.js'
  );
  const scene = { session, _applyState() {} };
  const controls = () => CardiacOutputScene.prototype.getModelControls.call(scene);
  const calls = [];
  const console_ = createModelControls({
    controls: controls(),
    onChange: (id, value, detail) => {
      calls.push([id, value, detail?.op]);
      CardiacOutputScene.prototype.setModelControl.call(scene, id, value, detail);
      console_.sync(controls());
    },
    onReset: () => {
      session.reset();
      console_.sync(controls());
    },
    copy: CardiacOutputScene.meta.modelControls,
  });
  return { session, console_, calls };
}

test('console: two pads on the face of the console, each a named group with a range and two buttons per axis', async () => {
  await withDocument(async () => {
    const { console_ } = await padConsole();
    const pads = findByClass(console_.element, 'is-pad');
    assert.deepEqual(pads.map((pad) => pad.dataset.pad), ['heart', 'circulation'], 'the heart first');
    for (const pad of pads) {
      assert.equal(pad.getAttribute('role'), 'group');
      assert.match(pad.getAttribute('aria-label'), /・/, 'named for both of its inputs');
      assert.equal(findByClass(pad, 'pad-range').length, 2, 'one range per axis');
      assert.equal(findByClass(pad, 'pad-step').length, 4, 'two buttons per axis');
      // Each axis's name is on that axis, and its ends are named.
      assert.equal(findByClass(pad, 'pad-axis-label-x').length, 1);
      assert.equal(findByClass(pad, 'pad-axis-label-y').length, 1);
      assert.ok(findByClass(pad, 'pad-step-word').every((word) => text(word).trim().length > 0), 'every end has its word');
      assert.equal(findByClass(pad, 'pad-area')[0].getAttribute('aria-hidden'), 'true', 'the surface is for a pointer; the ranges carry it for everyone else');
    }
    const [advanced] = findByClass(console_.element, 'model-controls-advanced');
    assert.equal(findByClass(advanced, 'is-pad').length, 0, 'the pads are not behind a disclosure');
    // Undo and the whole reset side by side.
    const [actions] = findByClass(console_.element, 'model-control-actions');
    assert.ok(findByClass(actions, 'model-control-undo')[0]);
    assert.ok(findByClass(actions, 'model-control-reset')[0]);
    assert.equal(findByClass(actions, 'model-control-undo')[0].disabled, true, 'nothing to undo at the start');
  });
});

test('console: one axis alone moves only its input — by range or by button — and each press is its own step', async () => {
  await withDocument(async () => {
    const { session, console_, calls } = await padConsole();
    const start = { ...session.input };
    const [heart] = findByClass(console_.element, 'is-pad').filter((pad) => pad.dataset.pad === 'heart');
    const [xRange] = findByClass(heart, 'pad-range-x');
    xRange.value = '2';
    xRange.dispatchEvent({ type: 'input', target: xRange });
    assert.deepEqual({ ...session.input }, { ...start, contractilityEesMmHgPerMl: 2 }, 'contractility alone; rate and the other pad held');
    const up = findByClass(heart, 'pad-step').find((node) => node.dataset.axis === 'y' && node.dataset.direction === 'up');
    up.dispatchEvent({ type: 'click' });
    assert.equal(session.input.heartRatePerMin, start.heartRatePerMin + 3);
    assert.equal(session.input.contractilityEesMmHgPerMl, 2, 'the other axis is held');
    assert.notEqual(calls[0][2], calls[1][2], 'two operations');
    const [undo] = findByClass(console_.element, 'model-control-undo');
    undo.dispatchEvent({ type: 'click' });
    assert.equal(session.input.heartRatePerMin, start.heartRatePerMin);
    assert.equal(session.input.contractilityEesMmHgPerMl, 2, 'undo takes back the last press only');
  });
});

test('console: a drag keeps the grab offset, ignores a second finger, is one undo step, and a cancel drops what was not sent', async () => {
  await withDocument(async () => {
    const frames = [];
    const previous = { raf: globalThis.requestAnimationFrame, caf: globalThis.cancelAnimationFrame };
    globalThis.requestAnimationFrame = (callback) => frames.push(callback);
    globalThis.cancelAnimationFrame = (handle) => {
      frames[handle - 1] = null;
    };
    const runFrames = () => {
      while (frames.some(Boolean)) {
        const index = frames.findIndex(Boolean);
        const callback = frames[index];
        frames[index] = null;
        callback();
      }
    };
    try {
      const { session, console_, calls } = await padConsole();
      const start = { ...session.input };
      const [heart] = findByClass(console_.element, 'is-pad').filter((pad) => pad.dataset.pad === 'heart');
      const [area] = findByClass(heart, 'pad-area');
      // A 228 × 228 box: the point travels 200 px on each axis (14 px inset).
      area.getBoundingClientRect = () => ({ left: 0, top: 0, width: 228, height: 228, right: 228, bottom: 228 });
      const pointer = (type, id, x, y) => area.dispatchEvent({ type, pointerId: id, clientX: x, clientY: y, button: 0, preventDefault() {} });
      const at = (axis, control, value) => 14 + ((value - control.min) / (control.max - control.min)) * 200 * (axis === 'x' ? 1 : -1) + (axis === 'y' ? 200 : 0);
      const px = at('x', { min: 0.8, max: 4.0 }, start.contractilityEesMmHgPerMl);
      const py = at('y', { min: 50, max: 110 }, start.heartRatePerMin);

      // Grabbed 6 px off the point, and not moved: nothing changes.
      pointer('pointerdown', 1, px + 6, py - 6);
      pointer('pointermove', 1, px + 6, py - 6);
      runFrames();
      assert.equal(calls.length, 0, 'a grab never jumps the values');

      // A second finger neither takes the drag over nor moves anything.
      pointer('pointerdown', 2, 10, 10);
      pointer('pointermove', 2, 20, 20);
      runFrames();
      assert.equal(calls.length, 0);

      // Moved 30 then 60 px right: contractility by 60/200 of its range, the
      // rate held; the last position is sent on release, not lost to a frame.
      pointer('pointermove', 1, px + 36, py - 6);
      runFrames();
      pointer('pointermove', 1, px + 66, py - 6);
      pointer('pointerup', 1, px + 66, py - 6);
      assert.ok(Math.abs(session.input.contractilityEesMmHgPerMl - (start.contractilityEesMmHgPerMl + 0.96)) < 0.03, `${session.input.contractilityEesMmHgPerMl}`);
      assert.equal(session.input.heartRatePerMin, start.heartRatePerMin, 'a horizontal drag holds the rate');
      assert.equal(new Set(calls.map((call) => call[2])).size, 1, 'one drag, one operation');
      const afterDrag = { ...session.input };

      // A cancelled drag: what was not yet sent is dropped.
      pointer('pointerdown', 3, 100, 100);
      pointer('pointermove', 3, 60, 60);
      pointer('pointercancel', 3, 60, 60);
      runFrames();
      assert.deepEqual({ ...session.input }, afterDrag);

      // One undo takes back the whole drag.
      findByClass(console_.element, 'model-control-undo')[0].dispatchEvent({ type: 'click' });
      assert.deepEqual({ ...session.input }, start);
    } finally {
      globalThis.requestAnimationFrame = previous.raf;
      globalThis.cancelAnimationFrame = previous.caf;
    }
  });
});

test('console: the switcher draws one pad or the other and changes nothing else; it carries the other pad’s values', async () => {
  await withDocument(async () => {
    const { session, console_, calls } = await padConsole();
    const [set] = findByClass(console_.element, 'pad-set');
    const tabs = findByClass(set, 'pad-switch');
    assert.deepEqual(tabs.map((tab) => tab.dataset.pad), ['heart', 'circulation']);
    assert.equal(set.dataset.active, 'heart', 'the heart first');
    assert.equal(tabs[0].getAttribute('aria-selected'), 'true');

    // Change something, then switch: nothing but which pad is drawn moves.
    const [heart] = findByClass(set, 'is-pad').filter((pad) => pad.dataset.pad === 'heart');
    findByClass(heart, 'pad-step').find((node) => node.dataset.axis === 'x' && node.dataset.direction === 'down').dispatchEvent({ type: 'click' });
    const before = { input: { ...session.input }, canUndo: session.canUndo, calls: calls.length };
    tabs[1].dispatchEvent({ type: 'click' });
    assert.equal(set.dataset.active, 'circulation');
    assert.deepEqual({ ...session.input }, before.input, 'no input moves');
    assert.equal(session.canUndo, before.canUndo, 'no undo step is added or taken');
    assert.equal(calls.length, before.calls, 'nothing is sent to the model');

    // The heart's tab now says what the heart pad holds, and that it moved.
    assert.match(text(tabs[0]), /収縮 2\.58↓/, "the moved input carries its direction");
    assert.match(text(tabs[0]), /心拍 70(?!↑|↓)/, "the held one carries none");
    assert.equal(tabs[0].classList.contains('is-moved'), true);
    assert.equal(tabs[1].classList.contains('is-moved'), false);
  });
});
