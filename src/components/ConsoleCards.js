import { el } from '../utils/dom.js';

/**
 * The console as cards the reader opens — "change the conditions" and "how it
 * is shown" in the experiment layout (`meta.console.cards`).
 *
 * Each card is a `<details>`: a native disclosure, so it opens by tap, by
 * Enter or Space on its summary, and says whether it is open to a screen
 * reader without any of that being written here. The shell already listens
 * for `toggle` in the console and refits the camera to the band that is left
 * (App.js, "A disclosure in the console changed the band"), so opening a card
 * never leaves the model under it.
 *
 * One card open at a time. Two open at once is the full panel this replaced,
 * and on a phone it is most of the screen.
 *
 * Closed, a card still says what it holds — and, for the conditions, what has
 * been changed — so "closed" never reads as "gone".
 */

const dual = (en, ja) => [
  el('span', { class: 'lang-en', text: en ?? '' }),
  el('span', { class: 'lang-ja', text: ja ?? '' }),
];

/**
 * @param {{id: string, copy: {title: string, titleJa: string, summary?: string, summaryJa?: string}, body: (Node|null|undefined)[]}} options
 */
export function createConsoleCard({ id, copy, body }) {
  // Two parts: what the card holds (always true), and what state it is in
  // (only when there is one). Which of them shows where is the stylesheet's:
  // a layout whose read-out already names the changed inputs keeps the first.
  const stateLine = el('span', { class: 'console-card-summary-state' });
  const summaryLine = el('span', { class: 'console-card-summary' }, [
    el('span', { class: 'console-card-summary-default' }, dual(copy.summary, copy.summaryJa)),
    stateLine,
  ]);
  const element = el('details', { class: 'console-card', dataset: { card: id } }, [
    el('summary', { class: 'console-card-head' }, [
      el('span', { class: 'console-card-text' }, [
        el('span', { class: 'console-card-title' }, dual(copy.title, copy.titleJa)),
        summaryLine,
      ]),
      el('span', { class: 'console-card-chevron', 'aria-hidden': 'true' }),
    ]),
    el('div', { class: 'console-card-body', id: `console-card-${id}` }, body.filter(Boolean)),
  ]);
  return {
    element,
    /** The card's current state for its closed line, or nothing (`null`). */
    setState(en, ja) {
      if (en == null && ja == null) {
        stateLine.replaceChildren();
        delete element.dataset.state;
        return;
      }
      stateLine.replaceChildren(...dual(en, ja));
      element.dataset.state = '';
    },
    get open() {
      return element.open;
    },
    set open(value) {
      element.open = Boolean(value);
    },
  };
}

/**
 * @param {ReturnType<typeof createConsoleCard>[]} cards
 */
export function createConsoleCards(cards) {
  const element = el('div', { class: 'console-cards' }, cards.map((card) => card.element));
  for (const card of cards) {
    card.element.addEventListener('toggle', () => {
      if (!card.element.open) return;
      for (const other of cards) if (other !== card) other.open = false;
    });
  }
  return { element, cards };
}

/**
 * How fast the beat is shown: a small set of buttons, one pressed.
 *
 * @param {{copy: {label: string, labelJa: string, note?: string, noteJa?: string, options: {id: string, rate: number, label: string, labelJa: string}[]}, onChange: (rate: number, id: string) => void, initial?: string}} options
 */
export function createBeatRateControl({ copy, onChange, initial = copy.options[0]?.id }) {
  const buttons = copy.options.map((option) =>
    el('button', {
      type: 'button',
      class: 'beat-rate-option',
      dataset: { rate: option.id },
      'aria-pressed': String(option.id === initial),
      on: {
        click: () => {
          select(option.id);
          onChange(option.rate, option.id);
        },
      },
    }, dual(option.label, option.labelJa))
  );
  const labelId = 'beat-rate-label';
  const element = el('div', { class: 'beat-rate' }, [
    el('span', { class: 'beat-rate-label', id: labelId }, dual(copy.label, copy.labelJa)),
    el('div', { class: 'beat-rate-options', role: 'group', 'aria-labelledby': labelId }, buttons),
    copy.note ? el('p', { class: 'beat-rate-note' }, dual(copy.note, copy.noteJa)) : null,
  ]);
  function select(id) {
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.rate === id));
  }
  return {
    element,
    select,
    /** The id of the pressed option. */
    get value() {
      return buttons.find((button) => button.getAttribute('aria-pressed') === 'true')?.dataset.rate ?? null;
    },
  };
}
