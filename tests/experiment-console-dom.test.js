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

test('console: one row of scenarios leads, captioned; the four inputs are one press away and still move the model', async () => {
  await withDocument(async () => {
    const session = new ExperimentSession();
    const { CardiacOutputScene, controls } = await sceneWithSession(session);
    const changes = [];
    const console_ = createModelControls({
      controls: controls(),
      onChange: (id, value) => changes.push([id, value]),
      onReset: () => {},
      copy: CardiacOutputScene.meta.modelControls,
    });

    const [advanced] = findByClass(console_.element, 'model-controls-advanced');
    assert.ok(advanced, 'the four inputs have a disclosure');
    assert.equal(advanced.tagName.toLowerCase(), 'details');
    assert.equal(findByClass(advanced, 'slider').length, 4, 'all four sliders are inside it');
    assert.equal(
      findByClass(console_.element, 'slider').length,
      4,
      'and there are no others — nothing was duplicated on the way in'
    );
    // One row a reader meets first. The preset and intervention rows still
    // exist — a session capture replays them — but they are not drawn: two
    // operation groups before the first touch was the confusion this fixes.
    const choices = findByClass(console_.element, 'model-choice-group');
    assert.equal(choices.length, 1, 'one row of scenarios');
    const buttons = findByClass(choices[0], 'model-choice-button').filter((node) => node.tagName.toLowerCase() === 'button');
    assert.deepEqual(
      buttons.map((button) => button.dataset.value),
      ['reference', 'reduced-contractility', 'more-filling', 'higher-afterload', 'dobutamine']
    );
    assert.equal(findByClass(advanced, 'model-choice-group').length, 0, 'and it is not behind the disclosure');

    // Its caption says what touching it does — the orientation is the label
    // of the control, not a paragraph above it.
    const captions = findByClass(console_.element, 'model-choice-caption').map(text);
    assert.equal(captions.length, 1);
    assert.match(captions[0], /心臓と数値が変わります/);

    // Short names on the buttons; the full name — which carries the caveat —
    // stays in the accessible name and the title.
    const dobutamine = buttons.find((button) => button.dataset.value === 'dobutamine');
    assert.match(text(dobutamine), /ドブタミン/);
    assert.match(dobutamine.getAttribute('aria-label'), /心拍数は固定/);
    assert.match(dobutamine.getAttribute('title'), /心拍数は固定/);
    assert.equal(findByClass(console_.element, 'model-choice-effect').length, 0, 'no paragraph per card');

    // A slider behind the disclosure is still wired to the model.
    const [resistance] = findByClass(advanced, 'slider').filter(
      (input) => input.getAttribute('aria-label')?.startsWith('Systemic resistance')
    );
    resistance.value = '1.6';
    resistance.dispatchEvent({ type: 'input', target: resistance });
    assert.deepEqual(changes, [['systemicResistanceMmHgSPerMl', 1.6]]);
  });
});

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

test('read-out: before → after with a signed change, and the first row renamed in place', async () => {
  await withDocument(async () => {
    const session = new ExperimentSession({ presetId: PRESET_IDS.REDUCED_CONTRACTILITY });
    const { metrics } = await sceneWithSession(session);
    const panel = createMetricsPanel();

    panel.update(metrics());
    const row = (label) => panel.element.children.find((node) => text(node).includes(label));
    assert.equal(text(findByClass(row('心拍出量'), 'metric-delta')[0]), '', 'nothing changed, nothing shown');
    assert.equal(text(findByClass(row('心拍出量'), 'metric-reference')[0]), '');

    session.selectIntervention('dobutamine');
    panel.update(metrics());
    const co = row('心拍出量');
    // A large change says so twice — in the arrow's shape and in words.
    assert.equal(text(findByClass(co, 'metric-change')[0]), '↑↑');
    assert.equal(co.dataset.strong, 'true');
    assert.match(co.getAttribute('aria-label'), /大きく上昇/);
    const before = text(findByClass(co, 'metric-reference')[0]);
    const now = text(findByClass(co, 'metric-value')[0]);
    const delta = text(findByClass(co, 'metric-delta')[0]);
    assert.match(before, /^\d+\.\d →$/, 'the value it started at');
    assert.equal(
      delta,
      `+${(Number(now) - Number(before.replace(' →', ''))).toFixed(1)}`,
      'and the change is the difference of the two figures shown'
    );
    assert.equal(co.dataset.delta, 'up');

    // The row that says what was done is named after what was done. The panel
    // used to build a row's label once, so it kept its first name forever.
    const first = panel.element.children[0];
    assert.match(text(first), /収縮力低下 → ドブタミン/);
    assert.match(text(first), /収縮力 ↑/);

    session.selectIntervention('none');
    panel.update(metrics());
    assert.doesNotMatch(text(panel.element.children[0]), /→/, 'and renamed back to the starting condition alone');
    assert.equal(text(findByClass(row('心拍出量'), 'metric-delta')[0]), '');
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

test('console: "Custom" appears only while true, and is not a button', async () => {
  await withDocument(async () => {
    const session = new ExperimentSession();
    const { CardiacOutputScene, controls } = await sceneWithSession(session);
    const console_ = createModelControls({
      controls: controls(),
      onChange: () => {},
      onReset: () => {},
      copy: CardiacOutputScene.meta.modelControls,
    });
    const [status] = findByClass(console_.element, 'model-choice-status');
    assert.ok(status, 'the scenario row carries the status');
    assert.notEqual(status.tagName.toLowerCase(), 'button', 'nothing to press');
    assert.equal(status.hidden, true, 'hidden while the condition is a scenario');
    const reference = findByClass(console_.element, 'model-choice-button').find((node) => node.dataset.value === 'reference');
    assert.equal(reference.getAttribute('aria-pressed'), 'true');

    session.setControl('fillingVolumeMl', 800);
    console_.sync(controls());
    assert.equal(status.hidden, false, 'shown once a slider has moved the condition off every scenario');
    assert.equal(reference.getAttribute('aria-pressed'), 'false', 'and no scenario claims to be selected');

    session.reset();
    console_.sync(controls());
    assert.equal(status.hidden, true, 'and gone again after a reset');
    assert.equal(reference.getAttribute('aria-pressed'), 'true');
  });
});
