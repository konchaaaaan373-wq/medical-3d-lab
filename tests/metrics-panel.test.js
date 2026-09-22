import test from 'node:test';
import assert from 'node:assert/strict';

import { ancestry, descendants, installMiniDom, selfTest } from './fixtures/miniDom.js';

/**
 * The read-out panel's update contract.
 *
 * ### What broke, and why it is a contract rather than a preference
 *
 * `createMetricsPanel().update()` created a row the first time it saw an id and
 * then only ever wrote values into it. Everything else a metric carries — which
 * section it belongs in, whether it is a headline figure, whether it survives a
 * narrow screen, what its label says — was set once, at creation, from whichever
 * update happened to be first.
 *
 * That is correct for a scene whose rows never change role, and every scene's
 * rows did until the higher-function read-out arrived. There, the row for the
 * task being traced is in the open "traced" section with emphasis; the same
 * task, once a reader traces a different one, is a comparison row in a section
 * that starts folded. Switching tasks therefore left the **old** task's value
 * sitting in the main section, emphasised, and put the **new** one inside a
 * collapsed section where nobody would look — with the 3D showing the new task.
 * The panel and the picture disagreed, and the panel was the one that looked
 * authoritative.
 *
 * So these tests drive the real `createMetricsPanel` — not a copy of it — and
 * assert where each row actually is in the tree. The browser side of the same
 * question is in `scripts/check-disease-interaction.mjs`, which does it with a
 * real DOM and real CSS; if the two ever disagree, `tests/fixtures/miniDom.js`
 * is what is wrong.
 */

const teardown = installMiniDom();
test.after(() => teardown());

const { createMetricsPanel } = await import('../src/components/MetricsPanel.js');

/** A metric as a scene hands one over. */
const metric = (id, over = {}) => ({
  id,
  label: id,
  labelJa: `${id}-ja`,
  value: `${id}-value`,
  valueJa: `${id}-value-ja`,
  unit: '',
  ...over,
});

const traced = (id) => metric(id, {
  group: 'traced',
  groupLabel: 'The task being traced',
  groupLabelJa: '辿っている課題',
  groupOpen: true,
  essential: true,
  emphasis: true,
});

const compared = (id) => metric(id, {
  group: 'compare',
  groupLabel: 'The other tasks',
  groupLabelJa: '他の課題',
  groupOpen: false,
});

/** Which section a row sits in, by the section's `data-group`. */
const sectionOf = (panel, id) => {
  const row = descendants(panel.element)
    .find((node) => node.className.split(/\s+/).includes('metric')
      && node.querySelector('.lang-en')?.textContent !== undefined
      && node.querySelector('.lang-en')?.textContent === id);
  if (!row) return null;
  for (let at = row.parentNode; at; at = at.parentNode) {
    const group = at.getAttribute?.('data-group');
    if (group) return group;
  }
  return 'top-level';
};

/** The row node for an id, found through the label it renders. */
const rowOf = (panel, id) => descendants(panel.element).find((node) => node.className
  .split(/\s+/).includes('metric') && node.querySelector('.lang-en')?.textContent === id);

test('miniDom: the fixture behaves like a DOM for what the components do', () => {
  selfTest(assert);
});

// --- AR3-T01, T02: a row follows the metric that describes it ---------------

test('AR3-T01: swapping which task is traced moves both rows', () => {
  const panel = createMetricsPanel();
  panel.update([traced('a'), compared('b')]);
  assert.equal(sectionOf(panel, 'a'), 'traced');
  assert.equal(sectionOf(panel, 'b'), 'compare');

  // The reader traces b instead. Same ids, opposite roles.
  panel.update([traced('b'), compared('a')]);
  assert.equal(sectionOf(panel, 'b'), 'traced', 'the newly traced task is in the traced section');
  assert.equal(sectionOf(panel, 'a'), 'compare', 'and the one it replaced is a comparison row');
});

test('AR3-T02: the newly traced task is not left inside the folded comparison section', () => {
  const panel = createMetricsPanel();
  panel.update([traced('a'), compared('b')]);
  const folded = descendants(panel.element).find((node) => node.getAttribute?.('data-group') === 'compare');
  const body = folded.querySelector('.metric-group-body');
  assert.equal(body.hidden, true, 'the comparison section starts folded');

  panel.update([traced('b'), compared('a')]);
  // b must not be inside the folded body; a must not be in the traced one.
  assert.ok(!ancestry(rowOf(panel, 'b')).includes('metric-group-body')
    || sectionOf(panel, 'b') === 'traced', 'b is not hidden inside the fold');
  assert.equal(sectionOf(panel, 'b'), 'traced');
  assert.equal(sectionOf(panel, 'a'), 'compare');
  assert.equal(body.hidden, true, 'and folding the reader did not ask to undo stays folded');
});

// --- AR3-T03: round trip ----------------------------------------------------

test('AR3-T03: a → b → c → a leaves exactly one row per id, in the right place', () => {
  const panel = createMetricsPanel();
  const order = ['a', 'b', 'c', 'a'];
  for (const current of order) {
    panel.update([traced(current), ...['a', 'b', 'c'].filter((id) => id !== current).map(compared)]);
    assert.equal(sectionOf(panel, current), 'traced', `${current} is traced`);
    for (const other of ['a', 'b', 'c'].filter((id) => id !== current)) {
      assert.equal(sectionOf(panel, other), 'compare', `${other} is a comparison row`);
    }
    // One row per id, however many times the roles have swapped.
    for (const id of ['a', 'b', 'c']) {
      const matches = descendants(panel.element).filter((node) => node.className
        .split(/\s+/).includes('metric') && node.querySelector('.lang-en')?.textContent === id);
      assert.equal(matches.length, 1, `${id} has one row, not ${matches.length}`);
    }
  }
});

// --- AR3-T04: the classes a metric owns -------------------------------------

test('AR3-T04: emphasis and essential follow the metric, not the first update', () => {
  const panel = createMetricsPanel();
  panel.update([traced('a'), compared('b')]);
  assert.equal(rowOf(panel, 'a').classList.contains('is-key'), true);
  assert.equal(rowOf(panel, 'a').classList.contains('is-essential'), true);
  assert.equal(rowOf(panel, 'b').classList.contains('is-key'), false);
  assert.equal(rowOf(panel, 'b').classList.contains('is-essential'), false);

  panel.update([traced('b'), compared('a')]);
  assert.equal(rowOf(panel, 'b').classList.contains('is-key'), true, 'b is the headline now');
  assert.equal(rowOf(panel, 'b').classList.contains('is-essential'), true);
  assert.equal(rowOf(panel, 'a').classList.contains('is-key'), false, 'a is not');
  assert.equal(rowOf(panel, 'a').classList.contains('is-essential'), false);
});

test('AR3-T04b: a label that changes is written, not kept from the first update', () => {
  const panel = createMetricsPanel();
  panel.update([metric('one', { label: 'Before', labelJa: '前' })]);
  panel.update([metric('one', { label: 'After', labelJa: '後' })]);
  const row = descendants(panel.element).find((node) => node.className.split(/\s+/).includes('metric'));
  assert.equal(row.querySelector('.lang-en').textContent, 'After');
  assert.equal(row.querySelector('.lang-ja').textContent, '後');
});

// --- AR3-T05: nothing a reader opened is closed behind their back -----------

test('AR3-T05: updating a value leaves the sections and details the reader opened', () => {
  const panel = createMetricsPanel();
  const withDetails = (value) => metric('lim', {
    value,
    valueJa: value,
    group: 'limits',
    groupLabel: 'Limits',
    groupLabelJa: '限界',
    groupOpen: false,
    details: ['one', 'two'],
    detailsJa: ['いち', 'に'],
  });
  panel.update([withDetails('first')]);

  const section = descendants(panel.element).find((node) => node.getAttribute?.('data-group') === 'limits');
  const body = section.querySelector('.metric-group-body');
  const groupToggle = section.querySelector('.metric-group-toggle');
  assert.equal(body.hidden, true);
  groupToggle.click();
  assert.equal(body.hidden, false, 'the reader opened the section');

  const detailsToggle = panel.element.querySelector('.metric-details-toggle');
  const list = panel.element.querySelector('.metric-details');
  assert.equal(list.hidden, true);
  detailsToggle.click();
  assert.equal(list.hidden, false, 'and the detail list');

  // Same row, new value. Nothing the reader opened may close.
  panel.update([withDetails('second')]);
  assert.equal(body.hidden, false, 'the section the reader opened stays open');
  assert.equal(panel.element.querySelector('.metric-details').hidden, false, 'and so does the list');
  assert.equal(rowOf(panel, 'lim').querySelector('.metric-value').textContent, 'second');
});

// --- AR3-T06: a row that goes away and comes back ---------------------------

test('AR3-T06: a conditional row leaves nothing behind and returns in the right place', () => {
  const panel = createMetricsPanel();
  const stop = metric('stop', {
    group: 'traced',
    groupLabel: 'Traced',
    groupLabelJa: '辿っている課題',
    groupOpen: true,
    value: 'Broca is gone',
    valueJa: 'Broca 野が残っていません',
  });
  panel.update([traced('a'), stop]);
  assert.equal(sectionOf(panel, 'stop'), 'traced');
  const row = rowOf(panel, 'stop');

  // The lesion is reset and the scene stops sending the row.
  panel.update([traced('a')]);
  assert.equal(row.hidden, true, 'the row is hidden');
  assert.equal(row.textContent.includes('Broca'), false, 'and carries none of its old claim');

  // It comes back, in its own section rather than at the end of the panel.
  panel.update([traced('a'), stop]);
  assert.equal(row.hidden, false);
  assert.equal(sectionOf(panel, 'stop'), 'traced');
  assert.equal(row.querySelector('.metric-value').textContent, 'Broca is gone');
});

test('AR3-T06b: a section whose rows all went away is not a heading over nothing', () => {
  const panel = createMetricsPanel();
  panel.update([traced('a'), compared('b')]);
  const section = descendants(panel.element).find((node) => node.getAttribute?.('data-group') === 'compare');
  assert.equal(section.hidden, false);

  panel.update([traced('a')]);
  assert.equal(section.hidden, true, 'the empty section is hidden');

  panel.update([traced('a'), compared('b')]);
  assert.equal(section.hidden, false, 'and comes back when it has a row again');
});

// --- the order rows are drawn in --------------------------------------------

test('AR3: rows are drawn in the order the scene sends them, within each section', () => {
  const panel = createMetricsPanel();
  panel.update([compared('x'), compared('y'), compared('z')]);
  const labels = () => descendants(panel.element)
    .filter((node) => node.className.split(/\s+/).includes('metric') && !node.hidden)
    .map((node) => node.querySelector('.lang-en').textContent);
  assert.deepEqual(labels(), ['x', 'y', 'z']);

  // The scene reorders them. The panel follows rather than keeping the order
  // whichever update happened to be first.
  panel.update([compared('z'), compared('x'), compared('y')]);
  assert.deepEqual(labels(), ['z', 'x', 'y']);
});

test('AR3: a scene that sends no groups keeps the flat list it always had', () => {
  const panel = createMetricsPanel();
  panel.update([metric('one'), metric('two')]);
  assert.equal(sectionOf(panel, 'one'), 'top-level');
  assert.equal(sectionOf(panel, 'two'), 'top-level');
  assert.equal(descendants(panel.element).filter((node) => node.getAttribute?.('data-group')).length, 0);
});
