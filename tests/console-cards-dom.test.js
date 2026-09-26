import test from 'node:test';
import assert from 'node:assert/strict';

import { createBeatRateControl, createConsoleCard, createConsoleCards } from '../src/components/ConsoleCards.js';
import { CONSOLE_LAYOUT } from '../src/data/cardiacOutput.js';
import { findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * The experiment console as two cards (owner, 2026-09-26): "change the
 * conditions" and "how it is shown", both closed at first, one open at a time.
 * Opening and closing is the browser's (<details>); what is ours is that a
 * card starts closed, that opening one closes the other, and that a closed
 * card still says what is in it.
 */

const withDocument = (body) => {
  const restore = installFakeDocument();
  try {
    return body();
  } finally {
    restore();
  }
};

const words = (node) =>
  node == null ? '' : node.children?.length ? node.children.map(words).join(' ') : String(node.textContent ?? '');

/** What the browser does when a summary is pressed. */
const press = (card) => {
  card.element.open = !card.element.open;
  card.element.dispatchEvent({ type: 'toggle' });
};

test('both cards start closed, and opening one closes the other', () =>
  withDocument(() => {
    const conditions = createConsoleCard({ id: 'conditions', copy: CONSOLE_LAYOUT.cards.conditions, body: [] });
    const shown = createConsoleCard({ id: 'view', copy: CONSOLE_LAYOUT.cards.view, body: [] });
    const { element } = createConsoleCards([conditions, shown]);
    assert.equal(element.children.length, 2);
    assert.ok(!conditions.open && !shown.open, 'closed at first');

    press(conditions);
    assert.ok(conditions.open && !shown.open);
    press(shown);
    assert.ok(shown.open, 'the other one opened');
    assert.ok(!conditions.open, 'and the first closed');
    press(shown);
    assert.ok(!conditions.open && !shown.open, 'and both can be closed again');
  }));

test('a closed card says what it holds, and can say what changed', () =>
  withDocument(() => {
    const card = createConsoleCard({ id: 'conditions', copy: CONSOLE_LAYOUT.cards.conditions, body: [] });
    const [summary] = findByClass(card.element, 'console-card-summary');
    assert.match(words(summary), /収縮力・心拍数・充満量・抵抗/);
    assert.match(words(findByClass(card.element, 'console-card-title')[0]), /条件を変える/);
    assert.equal(card.element.dataset.state, undefined, 'no state until something changes');
    card.setState('Changed: Contractility↓', '変更中：収縮力↓');
    assert.match(words(summary), /変更中：収縮力↓/);
    assert.equal(card.element.dataset.state, '', 'the stylesheet can tell a card with a state from one without');
    card.setState(null, null);
    assert.doesNotMatch(words(summary), /変更中/);
    assert.equal(card.element.dataset.state, undefined);
  }));

test('the beat-speed control presses one option and reports its rate', () =>
  withDocument(() => {
    const calls = [];
    const control = createBeatRateControl({ copy: CONSOLE_LAYOUT.beatRates, onChange: (...args) => calls.push(args) });
    const options = findByClass(control.element, 'beat-rate-option');
    assert.deepEqual(options.map((node) => node.getAttribute('aria-pressed')), ['true', 'false', 'false']);
    options[1].click();
    assert.deepEqual(calls, [[0.25, 'slow']]);
    assert.equal(control.value, 'slow');
    assert.deepEqual(options.map((node) => node.getAttribute('aria-pressed')), ['false', 'true', 'false']);
    // Slower or held, never faster than the model's own rate.
    assert.ok(CONSOLE_LAYOUT.beatRates.options.every((option) => option.rate >= 0 && option.rate <= 1));
  }));

test('"change the model" and "change the view" are in different cards', () => {
  // The view tools live in the view card, not behind "More": only the lesson,
  // the reel and the image export stay there.
  for (const id of ['compare', 'data', 'zoom', 'inspection']) {
    assert.ok(!CONSOLE_LAYOUT.overflow.includes(id), `${id} is a view tool and belongs in the view card`);
  }
  assert.ok(CONSOLE_LAYOUT.cards.conditions.titleJa && CONSOLE_LAYOUT.cards.view.titleJa);
});
