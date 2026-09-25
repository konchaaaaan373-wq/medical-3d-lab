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

test('console: the four inputs are always named, one editor moves the chosen one, and choosing one changes nothing', async () => {
  await withDocument(async () => {
    const session = new ExperimentSession();
    const { CardiacOutputScene, controls } = await sceneWithSession(session);
    const changes = [];
    const console_ = createModelControls({
      controls: controls(),
      onChange: (id, value) => {
        changes.push([id, value]);
        session.setControl(id, value);
        console_.sync(controls());
      },
      onReset: () => {},
      copy: CardiacOutputScene.meta.modelControls,
    });

    // The four are on screen from the start, not behind a disclosure, and
    // there is exactly one slider — the editor's.
    const tabs = findByClass(console_.element, 'model-editor-tab');
    assert.deepEqual(tabs.map((tab) => tab.dataset.input), CONTROLS_ORDER);
    const [advanced] = findByClass(console_.element, 'model-controls-advanced');
    assert.equal(findByClass(advanced, 'model-editor-tab').length, 0, 'the inputs are not behind the disclosure');
    assert.equal(findByClass(advanced, 'model-choice-group').length, 2, 'the start state and the intervention are');
    const sliders = findByClass(console_.element, 'slider');
    assert.equal(sliders.length, 1, 'one slider, for the chosen input');
    const [slider] = sliders;

    // Filling is open first.
    assert.equal(tabs[0].getAttribute('aria-selected'), 'true');
    assert.equal(slider.getAttribute('aria-label').startsWith('Circulating filling'), true);

    // Choosing another input is a view change: no value moves.
    tabs[1].dispatchEvent({ type: 'click' });
    assert.deepEqual(changes, [], 'choosing an input changes no value');
    assert.equal(tabs[1].getAttribute('aria-selected'), 'true');
    assert.equal(slider.min, '0.7');
    assert.equal(slider.value, String(session.input.systemicResistanceMmHgSPerMl));

    // A drag goes to the model, and the slider is the same node afterwards —
    // nothing is rebuilt under the finger.
    slider.value = '1.6';
    slider.dispatchEvent({ type: 'input', target: slider });
    assert.deepEqual(changes, [['systemicResistanceMmHgSPerMl', 1.6]]);
    assert.equal(findByClass(console_.element, 'slider')[0], slider, 'the slider was not replaced');
    assert.equal(tabs[1].classList.contains('is-changed'), true, 'the tab is marked as moved');
    assert.equal(tabs[0].classList.contains('is-changed'), false, 'the others are not');

    // Switching away and back keeps the value and the start.
    tabs[0].dispatchEvent({ type: 'click' });
    tabs[1].dispatchEvent({ type: 'click' });
    assert.equal(slider.value, '1.6');
    const start = text(findByClass(console_.element, 'model-editor-start-value')[0]);
    assert.equal(start, '1.10', 'the start is still where the experiment started');
  });
});

test('console: the two buttons move one step, stop at the ends, and 「この項目を戻す」 moves only this input', async () => {
  await withDocument(async () => {
    const session = new ExperimentSession();
    const { CardiacOutputScene, controls } = await sceneWithSession(session);
    const console_ = createModelControls({
      controls: controls(),
      onChange: (id, value) => {
        session.setControl(id, value);
        console_.sync(controls());
      },
      onReset: () => {},
      copy: CardiacOutputScene.meta.modelControls,
    });
    const [down, up] = findByClass(console_.element, 'model-editor-step');
    const [resetOne] = findByClass(console_.element, 'model-editor-reset');
    const tabs = findByClass(console_.element, 'model-editor-tab');
    assert.equal(resetOne.disabled, true, 'nothing to put back at the start');
    // The two resets stand side by side, so their scopes are read against
    // each other: this input, and the whole experiment.
    const [values] = findByClass(console_.element, 'model-editor-values');
    const [resetAll] = findByClass(values, 'model-control-reset');
    assert.ok(resetAll, 'the whole-experiment reset is beside 「この項目を戻す」');
    assert.match(text(resetAll), /全体を戻す/);
    assert.equal(findByClass(console_.element, 'model-control-reset').length, 1, 'and it is not drawn twice');
    assert.match(up.getAttribute('aria-label'), /充満量を増やす/);

    up.dispatchEvent({ type: 'click' });
    assert.equal(session.input.fillingVolumeMl, 730, 'one press is one nudge');
    assert.equal(resetOne.disabled, false);

    // Move a second input, then put the first back: the second stays.
    tabs[3].dispatchEvent({ type: 'click' });
    up.dispatchEvent({ type: 'click' });
    assert.equal(session.input.heartRatePerMin, 73);
    tabs[0].dispatchEvent({ type: 'click' });
    resetOne.dispatchEvent({ type: 'click' });
    assert.equal(session.input.fillingVolumeMl, 710);
    assert.equal(session.input.heartRatePerMin, 73, 'the other input is left where it was');

    // At the top of the range the button stops, and never leaves the domain.
    for (let i = 0; i < 40; i += 1) if (!up.disabled) up.dispatchEvent({ type: 'click' });
    assert.equal(session.input.fillingVolumeMl, 980);
    assert.equal(up.disabled, true);
    assert.equal(down.disabled, false);
  });
});

const CONTROLS_ORDER = ['fillingVolumeMl', 'systemicResistanceMmHgSPerMl', 'contractilityEesMmHgPerMl', 'heartRatePerMin'];

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
    assert.match(text(first), /比較元：収縮力低下/);
    assert.match(text(first), /収縮力 ↑/);

    session.selectIntervention('none');
    panel.update(metrics());
    assert.match(text(panel.element.children[0]), /開始時のまま/);
    assert.equal(text(findByClass(row('心拍出量'), 'metric-delta')[0]), '±0');
  });
});

test('toolbar: the tools a scene names go behind "More"; the experiment stays in view', async () => {
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
    for (const id of ['zoomIn', 'zoomOut', 'frame', 'eye', 'reel', 'camera']) {
      assert.ok(inMenu.has(id), `${id} is behind More`);
    }
    const [row] = findByClass(panel, 'button-row');
    const inRow = new Set([...controlsOf(row)].filter((id) => !inMenu.has(id)));
    for (const id of ['compare', 'data', 'learn', 'more']) {
      assert.ok(inRow.has(id), `${id} stays in view`);
    }

    // Every button still exists exactly once — moved, not dropped or doubled.
    const all = findByClass(panel, 'btn').map((button) => button.dataset.control);
    assert.equal(all.length, new Set(all).size, 'no button is built twice');

    // A scene that declares nothing gets the row it always had.
    const plain = build({ ...CardiacOutputScene.meta, console: undefined });
    assert.equal(findByClass(plain, 'console-more').length, 0);
  });
});
