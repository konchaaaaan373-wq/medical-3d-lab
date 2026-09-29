import { el } from '../utils/dom.js';

/**
 * A short introduction over the model on a first visit: what can be changed,
 * and where to look when it is — at the heart, at the blood, at the figures —
 * with one thing to try first (owner's review, 2026-09-27).
 *
 * It is a card over the dimmed page, not a page before it: the model is
 * already beating behind it, and the one thing it asks is answered by the
 * model itself. Three ways out, all of which close it: try the suggested change,
 * skip, or Escape. Whether it has been seen is remembered for this reader in
 * this browser only (`storageKey`), because that is a convenience — a reader
 * whose storage is off sees it again, and nothing depends on it. The shell
 * brings it back from a button (`open`).
 *
 * The words are the scene's (`copy`); the swatches are the colours the scene
 * draws those things in, so "the dark red body" on the card is the dark red
 * body on the model.
 *
 * @param {{
 *   copy: {
 *     title: {en: string, ja: string}, lead: {en: string, ja: string},
 *     changeHeading: {en: string, ja: string}, change: {en: string, ja: string}[],
 *     lookHeading: {en: string, ja: string}, look: {swatch?: string, en: string, ja: string}[],
 *     tryIt: {en: string, ja: string}, skip: {en: string, ja: string}, again: {en: string, ja: string},
 *   },
 *   storageKey: string,
 *   onTry: () => void,
 *   onOpen?: () => void,
 *   onClose?: (how: 'try'|'skip') => void,
 * }} options
 */
export function createSceneIntro({ copy, storageKey, onTry, onOpen = () => {}, onClose = () => {} }) {
  const pair = (text) => [
    el('span', { class: 'lang-en', text: text?.en ?? '' }),
    el('span', { class: 'lang-ja', text: text?.ja ?? '' }),
  ];
  const titleId = `scene-intro-title-${Math.random().toString(36).slice(2, 8)}`;

  const tryButton = el('button', {
    type: 'button',
    class: 'scene-intro-try',
    dataset: { control: 'intro-try' },
    on: { click: () => close('try') },
  }, pair(copy.tryIt));
  const skipButton = el('button', {
    type: 'button',
    class: 'scene-intro-skip',
    dataset: { control: 'intro-skip' },
    on: { click: () => close('skip') },
  }, pair(copy.skip));

  const element = el('section', {
    class: 'scene-intro',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': titleId,
    hidden: true,
    on: {
      // A press on the dimmed layer keeps focus in the card: otherwise it
      // falls to the page behind, where Escape and Tab no longer reach it.
      mousedown: (event) => {
        if (!event.target.closest?.('.scene-intro-card')) event.preventDefault?.();
      },
      keydown: (event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          close('skip');
        }
        // Two buttons; Tab goes between them and stays on the card while it
        // is open, since the page behind it is dimmed and not the question.
        if (event.key === 'Tab') {
          event.preventDefault();
          (document.activeElement === tryButton ? skipButton : tryButton).focus();
        }
      },
    },
  }, [
    el('div', { class: 'scene-intro-card' }, [
      el('h2', { class: 'scene-intro-title', id: titleId }, pair(copy.title)),
      el('p', { class: 'scene-intro-lead' }, pair(copy.lead)),
      el('div', { class: 'scene-intro-columns' }, [
        el('div', { class: 'scene-intro-block' }, [
          el('h3', { class: 'scene-intro-heading' }, pair(copy.changeHeading)),
          el('ul', { class: 'scene-intro-change' }, copy.change.map((item) => el('li', {}, pair(item)))),
        ]),
        el('div', { class: 'scene-intro-block' }, [
          el('h3', { class: 'scene-intro-heading' }, pair(copy.lookHeading)),
          el('ul', { class: 'scene-intro-look' }, copy.look.map((item) =>
            el('li', {}, [
              el('span', { class: 'scene-intro-swatch', 'aria-hidden': 'true', style: item.swatch ? `--swatch: ${item.swatch}` : null }),
              el('span', {}, pair(item)),
            ])
          )),
        ]),
      ]),
      el('div', { class: 'scene-intro-actions' }, [tryButton, skipButton]),
      el('p', { class: 'scene-intro-again' }, pair(copy.again)),
    ]),
  ]);

  const remember = () => {
    try {
      globalThis.localStorage?.setItem(storageKey, '1');
    } catch {
      // Storage off: the introduction simply shows again next time.
    }
  };
  const seen = () => {
    try {
      return globalThis.localStorage?.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  };

  function open() {
    element.hidden = false;
    element.dataset.state = 'open';
    onOpen();
    // Where a keyboard reader starts: the one thing it suggests.
    tryButton.focus?.({ preventScroll: true });
  }

  function close(how) {
    if (element.hidden) return;
    element.hidden = true;
    element.dataset.state = 'closed';
    remember();
    onClose(how);
    if (how === 'try') onTry();
  }

  return {
    element,
    open,
    close,
    /** Open it if this reader has not seen it. */
    openIfNew() {
      if (!seen()) open();
    },
    get isOpen() {
      return !element.hidden;
    },
  };
}
