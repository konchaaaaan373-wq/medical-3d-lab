import { el } from '../utils/dom.js';
import { inLanguage, onLanguageChange } from '../utils/language.js';

/**
 * The introductory lesson's page: everything around the figure, and nothing
 * that is not about the one question.
 *
 *   top     — the title card and the question
 *   figure  — the scene's figure, in the room the other two leave
 *   bottom  — the note on what the experiment is, then either the line that
 *             says what to do and the reader's buttons, or the explanation's
 *             words and its player; and the way to the full model
 *
 * ## The figure keeps one size
 *
 * The figure is scaled to the room between the question and the bottom panel,
 * so a bottom panel that grew with a longer sentence used to shrink the heart
 * and the dial with it (owner's review, 2026-10-01). Here the bottom panel is
 * as tall as it will ever be from the start: the buttons and the player share
 * one place, and so do every caption of the explanation and every line of the
 * guide — the ones not on screen stand in that place invisibly
 * (`lesson-sizer`), holding it at the height of the tallest. So the panel's
 * height changes only with the window and the language, never with what the
 * lesson says or which mode it is in, and the figure above it never moves.
 *
 * This owns the DOM and nothing else. What to show comes in as one state
 * object (`render`), built by `LessonShell` from the lesson; what a press does
 * goes out through the callbacks. It never computes a figure.
 *
 * @param {{
 *   titleCard: HTMLElement,
 *   copy: { question: object, actions: object, note: object, captions: object[], guides: object[] },
 *   figure: Element,
 *   detailHref: string,
 *   on: Record<string, () => void>,
 * }} options
 */
export function createLessonPanel({ titleCard, copy, figure, detailHref, on }) {
  const pair = (text) => [
    el('span', { class: 'lang-en', text: text?.en ?? '' }),
    el('span', { class: 'lang-ja', text: text?.ja ?? '' }),
  ];
  // An attribute holds one language where the DOM text holds both, so every
  // `aria-label` and `title` here is painted from its pair, and painted again
  // when the interface language flips.
  const attributes = new Map();
  const paintAttributes = (node) => {
    const { text, title } = attributes.get(node);
    const said = inLanguage(text?.en ?? '', text?.ja ?? '');
    node.setAttribute('aria-label', said);
    if (title) node.title = said;
  };
  const labelled = (node, text, { title = false } = {}) => {
    attributes.set(node, { text, title });
    paintAttributes(node);
    return node;
  };
  onLanguageChange(() => attributes.forEach((_, node) => paintAttributes(node)));

  const button = (key, className, text, handler, extra = {}) =>
    el('button', { type: 'button', class: `lesson-button ${className}`, dataset: { lesson: key }, on: { click: handler }, ...extra }, pair(text));

  /**
   * One place for several things of which one is shown: every item stands in
   * the same grid cell, and the ones not shown are invisible and inert — so
   * the cell is as tall as the tallest of them, whichever is on screen.
   */
  const sizer = (content) => el('div', { class: 'lesson-sizer', 'aria-hidden': 'true', inert: '' }, content);

  // --- top ------------------------------------------------------------------
  const question = el('h2', { class: 'lesson-question', id: 'lesson-question' }, pair(copy.question));
  const top = el('div', { class: 'lesson-top' }, [titleCard, question]);

  // --- the figure ---------------------------------------------------------------
  const figureSlot = el('div', { class: 'lesson-figure' }, [figure]);

  // --- bottom: what the experiment is, in every mode ------------------------------
  const note = el('p', { class: 'lesson-note', dataset: { lesson: 'note' } }, pair(copy.note));

  // --- bottom: the reader's buttons, under the line that says what to do --------
  const guide = el('p', { class: 'lesson-guide', 'aria-live': 'polite' });
  const guideStack = el('div', { class: 'lesson-stack lesson-guide-stack' }, [
    guide,
    ...copy.guides.map((line) => sizer([el('p', { class: 'lesson-guide' }, pair(line))])),
  ]);
  const constrict = button('constrict', 'is-toggle is-intervention', copy.actions.constrict, on.toggleConstrict, { 'aria-pressed': 'false' });
  const other = button('other', 'is-toggle is-other', copy.actions.showOther, on.toggleOther, { 'aria-pressed': 'false' });
  const playFromManual = button('play', 'is-quiet', copy.actions.play, on.play);
  const manual = labelled(
    el('div', { class: 'lesson-manual', role: 'group' }, [
      guideStack,
      el('div', { class: 'lesson-manual-buttons' }, [constrict, other, playFromManual]),
    ]),
    copy.actions.controls
  );

  // --- bottom: the explanation ----------------------------------------------------
  const captionBlock = (step) => [
    el('h3', { class: 'lesson-caption-heading' }, pair(step.heading)),
    el('p', { class: 'lesson-caption-text' }, pair(step.text)),
    step.note ? el('p', { class: 'lesson-caption-note' }, pair(step.note)) : null,
  ];
  const stepCount = el('span', { class: 'lesson-step-count' });
  const heading = el('h3', { class: 'lesson-caption-heading', id: 'lesson-caption-heading' });
  const text = el('p', { class: 'lesson-caption-text' });
  const captionNote = el('p', { class: 'lesson-caption-note' });
  const live = el('div', { class: 'lesson-caption-live', 'aria-live': 'polite', 'aria-labelledby': 'lesson-caption-heading' }, [
    heading,
    text,
    captionNote,
  ]);
  const caption = el('section', { class: 'lesson-caption' }, [
    el('div', { class: 'lesson-stack' }, [live, ...copy.captions.map((step) => sizer(captionBlock(step)))]),
  ]);
  const playerButton = (key, glyph, label, handler) =>
    labelled(
      el('button', { type: 'button', class: 'lesson-button is-icon', dataset: { lesson: key }, on: { click: handler } }, [
        el('span', { class: 'lesson-glyph', 'aria-hidden': 'true', text: glyph }),
        el('span', { class: 'lesson-icon-label' }, pair(label)),
      ]),
      label,
      { title: true }
    );
  const toggle = playerButton('toggle', '❚❚', copy.actions.player.pause, on.togglePlay);
  const player = labelled(el('div', { class: 'lesson-player', role: 'group' }), copy.actions.player.group);
  // Which scene, in the player's row rather than over the words: on a phone
  // the words need the width.
  player.append(
    stepCount,
    playerButton('restart', '↺', copy.actions.player.restart, on.restart),
    playerButton('previous', '⏮', copy.actions.player.previous, on.previous),
    toggle,
    playerButton('next', '⏭', copy.actions.player.next, on.next),
    button('try-from-player', 'is-secondary', copy.actions.tryIt, on.tryIt)
  );
  const explaining = el('div', { class: 'lesson-explaining' }, [caption, player]);

  // The buttons and the player share one place too: switching between them
  // must not change the panel's height either.
  const modes = el('div', { class: 'lesson-stack lesson-modes' }, [manual, explaining]);

  const detail = el('a', { class: 'lesson-detail', href: detailHref, dataset: { lesson: 'detail' } }, pair(copy.actions.detail));
  const bottom = el('div', { class: 'lesson-bottom' }, [note, modes, el('div', { class: 'lesson-detail-row' }, [detail])]);

  /** Show one of the things sharing a place; the other is invisible and cannot be reached. */
  const showOnly = (shown, hidden) => {
    shown.removeAttribute('inert');
    shown.classList.remove('is-away');
    hidden.setAttribute('inert', '');
    hidden.classList.add('is-away');
  };

  let rendered = null;

  /**
   * Draw the page for one state. Cheap to call; only what changed is touched.
   *
   * @param {{ mode: 'manual'|'explaining', guide: object|null, manual: object,
   *   caption: object|null, player: object }} state see `LessonShell.stateForPanel`
   */
  function render(state) {
    const key = JSON.stringify(state);
    if (key === rendered) return;
    rendered = key;
    top.dataset.mode = state.mode;
    bottom.dataset.mode = state.mode;

    if (state.mode === 'explaining') showOnly(explaining, manual);
    else showOnly(manual, explaining);

    guide.replaceChildren(...pair(state.guide));

    const { targetId, showOther, canShowOther } = state.manual;
    const constricted = targetId === 'B';
    constrict.replaceChildren(...pair(constricted ? copy.actions.release : copy.actions.constrict));
    constrict.setAttribute('aria-pressed', String(constricted));
    // "Compare" is there only once B is: before that it is not a choice the
    // lesson offers. Its place is kept, so nothing else moves when it comes.
    const offered = canShowOther || showOther;
    other.classList.toggle('is-unoffered', !offered);
    other.disabled = !offered;
    other.setAttribute('aria-hidden', String(!offered));
    other.replaceChildren(...pair(showOther ? copy.actions.hideOther : copy.actions.showOther));
    other.setAttribute('aria-pressed', String(showOther));

    if (state.mode === 'explaining' && state.caption) {
      const step = state.caption;
      stepCount.textContent = `${step.index + 1} / ${step.total}`;
      heading.replaceChildren(...pair(step.heading));
      text.replaceChildren(...pair(step.text));
      captionNote.replaceChildren(...pair(step.note));
      captionNote.hidden = !step.note;
      const label = state.player.playing ? copy.actions.player.pause : state.player.atEnd ? copy.actions.replay : copy.actions.player.resume;
      toggle.querySelector('.lesson-glyph').textContent = state.player.playing ? '❚❚' : '▶';
      toggle.querySelector('.lesson-icon-label').replaceChildren(...pair(label));
      labelled(toggle, label, { title: true });
    }
  }

  return {
    top,
    figure: figureSlot,
    bottom,
    render,
    focusFirst(mode) {
      const target = mode === 'explaining' ? toggle : constrict;
      target?.focus?.({ preventScroll: true });
    },
  };
}
