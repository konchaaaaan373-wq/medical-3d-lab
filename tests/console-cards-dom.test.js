import test from 'node:test';
import assert from 'node:assert/strict';

import { createConsoleCard, createConsoleCards } from '../src/components/ConsoleCards.js';
import { CONSOLE_LAYOUT } from '../src/data/cardiacOutput.js';
import { findByClass, installFakeDocument } from './helpers/fake-dom.js';

/**
 * The experiment console as two cards: operating the model, and the
 * explanation animation — both closed at first. By default one card is open
 * at a time; the experiment layout opens them independently (owner,
 * 2026-09-27).
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

test('both cards start closed, and by default opening one closes the other', () =>
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

test('the experiment layout\'s two cards open and close independently', () =>
  withDocument(() => {
    const conditions = createConsoleCard({ id: 'conditions', copy: CONSOLE_LAYOUT.cards.conditions, body: [] });
    const shown = createConsoleCard({ id: 'view', copy: CONSOLE_LAYOUT.cards.view, body: [] });
    createConsoleCards([conditions, shown], { exclusive: false });
    assert.ok(!conditions.open && !shown.open, 'closed at first');
    press(conditions);
    press(shown);
    assert.ok(conditions.open && shown.open, 'both open at once');
    press(conditions);
    assert.ok(!conditions.open && shown.open, 'closing one leaves the other');
  }));

test('a closed card says what it holds, and can say what changed', () =>
  withDocument(() => {
    const card = createConsoleCard({ id: 'conditions', copy: CONSOLE_LAYOUT.cards.conditions, body: [] });
    const [summary] = findByClass(card.element, 'console-card-summary');
    assert.match(words(summary), /充満量・血管抵抗・収縮力・心拍数/);
    assert.match(words(findByClass(card.element, 'console-card-title')[0]), /操作する/);
    assert.equal(card.element.dataset.state, undefined, 'no state until something changes');
    card.setState('Changed: Contractility↓', '変更中：収縮力↓');
    assert.match(words(summary), /変更中：収縮力↓/);
    assert.equal(card.element.dataset.state, '', 'the stylesheet can tell a card with a state from one without');
    card.setState(null, null);
    assert.doesNotMatch(words(summary), /変更中/);
    assert.equal(card.element.dataset.state, undefined);
  }));

test('the animation card holds the explanation and nothing else; the view tools are behind More', () => {
  // The beat-speed buttons were a display setting shown under "animation",
  // and read as the explanation the owner asked for (2026-09-27). They are
  // gone, and the plots, the camera and the display options are behind
  // "More", in neither card.
  assert.equal(CONSOLE_LAYOUT.beatRates, undefined, 'no beat-speed setting');
  for (const id of ['data', 'zoom', 'inspection']) {
    assert.ok(CONSOLE_LAYOUT.overflow.includes(id), `${id} is behind More`);
  }
  assert.ok(!CONSOLE_LAYOUT.overflow.includes('compare'), 'the comparison belongs to operating, not to More');
  assert.match(CONSOLE_LAYOUT.cards.view.titleJa, /アニメーション/);
});
