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
 * One card open at a time by default (`createConsoleCards`); a layout whose
 * cards are two different things may let them open independently.
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
 * The cards as one block.
 *
 * `exclusive` (the default) keeps one card open at a time. The experiment
 * layout passes `false`: its two cards are two different things — operating
 * the model and watching the explanation — and a reader may want both open
 * (owner's review, 2026-09-27).
 *
 * @param {ReturnType<typeof createConsoleCard>[]} cards
 * @param {{ exclusive?: boolean }} [options]
 */
export function createConsoleCards(cards, { exclusive = true } = {}) {
  const element = el('div', { class: 'console-cards' }, cards.map((card) => card.element));
  if (exclusive) {
    for (const card of cards) {
      card.element.addEventListener('toggle', () => {
        if (!card.element.open) return;
        for (const other of cards) if (other !== card) other.open = false;
      });
    }
  }
  return { element, cards };
}
