import test from 'node:test';
import assert from 'node:assert/strict';

import { createMetricsPanel } from '../src/components/MetricsPanel.js';
import { ExperimentSession } from '../src/scenes/cardiovascular/scenes/cardiacOutput/experimentSession.js';
import { PRESET_IDS } from '../src/models/cardiacOutput.js';
import { FakeElement, findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * The read-out as a reader sees it, not as an array.
 *
 * `getMetrics()` returned the "showing the previous condition" notice first
 * and stopped returning it on recovery, and tests read that array and called
 * it done. The panel did something else: it appended a row the first time it
 * saw the id and never removed one, so the notice arrived at the **bottom**
 * of eleven numbers and stayed there after the condition solved again. An
 * external reviewer found it by reading the component rather than the scene
 * (R152-03).
 *
 * So this drives the real component with the real session, and asks where the
 * notice is and whether it goes away.
 */

/**
 * The fake document has to stay installed for the whole test, not just while
 * the panel is constructed: `update` creates rows too. The first version of
 * this restored it immediately and every test failed with `document is not
 * defined` — which is the right failure, in the wrong place.
 */
const withDocument = async (body) => {
  const restore = installFakeDocument();
  const previousWindow = globalThis.window;
  globalThis.window = {};
  try {
    return await body();
  } finally {
    globalThis.window = previousWindow;
    restore();
  }
};

/** The scene's own row builder, called without building a 3D scene. */
async function readoutFor(session, { comparing = false } = {}) {
  const { CardiacOutputScene } = await import(
    '../src/scenes/cardiovascular/scenes/cardiacOutput/CardiacOutputScene.js'
  );
  return CardiacOutputScene.prototype.getMetrics.call({
    session,
    comparing,
    state: session.view.metrics,
  });
}

/** Label text of each row, top to bottom — what a reader's eye runs down. */
const labels = (panel) =>
  panel.element.children.map((node) => {
    const [label] = findByClass(node, 'metric-label');
    return (label?.children ?? []).map((span) => span.textContent).join(' / ');
  });

test('read-out: the notice is the first row on screen, and it leaves when the model solves', async () => {
  await withDocument(async () => {
  const panel = createMetricsPanel();
  const session = new ExperimentSession();

  // Normal.
  panel.update(await readoutFor(session));
  const before = labels(panel);
  assert.ok(before.length > 5, 'a full read-out');
  assert.doesNotMatch(before[0], /1 つ前の条件/, 'no notice while the model is solving');
  assert.match(before[0], /基準/, 'the panel leads with what the figures are read against');

  // Refused.
  session.setInput({ ...session.input, heartRatePerMin: 400 });
  assert.equal(session.applied, false);
  panel.update(await readoutFor(session));
  const during = labels(panel);
  assert.match(during[0], /1 つ前の条件/, 'the notice is the first row a reader sees, not the last');
  assert.equal(during.length, before.length + 1, 'and it is an addition, not a replacement');

  // Recovered.
  session.setInput({ ...session.baseline.input });
  assert.equal(session.applied, true);
  panel.update(await readoutFor(session));
  const after = labels(panel);
  for (const text of after) assert.doesNotMatch(text, /1 つ前の条件/, 'the notice is gone from the DOM');
  assert.deepEqual(after, before, 'and the panel is back to exactly the rows it started with');
  });
});

test('read-out: the notice survives comparison, a reset and a highlight', async () => {
  await withDocument(async () => {
  const panel = createMetricsPanel();
  const session = new ExperimentSession();
  session.setControl('systemicResistanceMmHgSPerMl', 1.5);
  session.setInput({ ...session.input, fillingVolumeMl: 4000 });
  assert.equal(session.applied, false, 'refused');

  // Comparing adds rows; the notice must still lead.
  panel.update(await readoutFor(session, { comparing: true }));
  assert.match(labels(panel)[0], /1 つ前の条件/);

  // A lesson's highlight hides rows it did not name. The notice must not be
  // one a lesson can hide, because it is about whether the rest is current.
  panel.highlight(['co', 'map']);
  const noticeNode = panel.element.children[0];
  assert.match(
    findByClass(noticeNode, 'metric-label')[0].children.map((span) => span.textContent).join(' '),
    /1 つ前の条件/
  );
  assert.ok(noticeNode.classList.contains('is-watched') === false, 'it is not a watched row');
  panel.highlight([]);

  // Reset solves the baseline again, so the notice goes.
  session.reset();
  assert.equal(session.applied, true);
  panel.update(await readoutFor(session, { comparing: true }));
  for (const text of labels(panel)) assert.doesNotMatch(text, /1 つ前の条件/);
  });
});

test('read-out: the panel drops rows a scene stops sending, whatever the scene', async () => {
  // The general rule, driven without the cardiac scene: a panel that only ever
  // grows is the bug, and it is the component's bug rather than one scene's.
  await withDocument(async () => {
  const panel = createMetricsPanel();
  const row = (id, value) => ({ id, label: id, labelJa: id, value, unit: '' });

  panel.update([row('a', 1), row('b', 2), row('c', 3)]);
  assert.deepEqual(labels(panel), ['a / a', 'b / b', 'c / c']);

  // A row arriving at the front goes to the front.
  panel.update([row('z', 0), row('a', 1), row('b', 2), row('c', 3)]);
  assert.deepEqual(labels(panel), ['z / z', 'a / a', 'b / b', 'c / c']);

  // A row that stops being sent leaves.
  panel.update([row('a', 1), row('c', 3)]);
  assert.deepEqual(labels(panel), ['a / a', 'c / c']);

  // Order is the array's, not the order ids were first seen.
  panel.update([row('c', 3), row('a', 1)]);
  assert.deepEqual(labels(panel), ['c / c', 'a / a']);

  void PRESET_IDS;
  void FakeElement;
  });
});


test('read-out: a phone gets four rows and a way to the rest', async () => {
  await withDocument(async () => {
    const panel = createMetricsPanel();
    const session = new ExperimentSession();
    panel.update(await readoutFor(session));

    // The scene declares which rows survive a small screen. Four: what was
    // changed, what came out, the pressure it came out against, and the
    // pressure it cost. The stylesheet decides at what width that applies;
    // what is asserted here is the declaration and the affordance.
    const compact = panel.element.children
      .filter((node) => node.dataset?.compact === 'key')
      .map((node) => findByClass(node, 'metric-label')[0].children[1].textContent);
    assert.deepEqual(compact, ['基準', '心拍出量 CO', '平均動脈圧 MAP', '左室充満圧（LVEDP）']);

    // Output without the pressure it cost is the wrong half of this scene's
    // teaching, so the two travel together.
    assert.ok(compact.includes('心拍出量 CO') && compact.includes('左室充満圧（LVEDP）'));

    assert.ok(panel.element.classList.contains('has-compact'), 'the panel knows it has a compact set');

    const [button] = findByClass(panel.element, 'metrics-more');
    assert.ok(button, 'and offers the rest');
    assert.equal(button.getAttribute('aria-expanded'), 'false');
    assert.equal(button.children[1].textContent, 'すべての数値');
    assert.equal(panel.element.children[panel.element.children.length - 1], button, 'it comes last');

    button.click();
    assert.ok(panel.element.classList.contains('is-expanded'));
    assert.equal(button.getAttribute('aria-expanded'), 'true');
    assert.equal(button.children[1].textContent, '主要な数値だけ');

    // Still there after an update, and still last.
    panel.update(await readoutFor(session));
    assert.equal(panel.element.children[panel.element.children.length - 1], button);
    assert.ok(panel.element.classList.contains('is-expanded'), 'expanding is not undone by a new solve');
  });
});

test('read-out: a scene that declares no compact rows is untouched', async () => {
  await withDocument(async () => {
    const panel = createMetricsPanel();
    const row = (id) => ({ id, label: id, labelJa: id, value: 1, unit: '' });
    panel.update([row('a'), row('b')]);
    assert.equal(panel.element.classList.contains('has-compact'), false);
    assert.equal(findByClass(panel.element, 'metrics-more').length, 0, 'no affordance nobody asked for');
    assert.equal(panel.element.children.length, 2);
  });
});
