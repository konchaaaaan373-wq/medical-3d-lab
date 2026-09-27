import { el } from '../utils/dom.js';
import { inLanguage, onLanguageChange } from '../utils/language.js';

/**
 * The four inputs of a one-factor experiment, as one surface: all four always
 * in view, one of them adjusted on its own, or two of them together.
 *
 * ## Why one at a time comes first
 *
 * The question the model answers is causal — change this, and what follows —
 * and a cause is easiest to follow when only one thing moved. So the surface
 * opens with one input chosen and a plain editor for it: its name, its value,
 * where it started, and a step each way in words ("弱める／強める"). The XY
 * pads stay, as the way to try two at once (owner's review, 2026-09-27); the
 * reader switches to them, and back, without any input changing.
 *
 * ## The strip
 *
 * The four inputs are always named with their current values and whether each
 * has moved from the start (↑/↓). Pressing one chooses it for the editor.
 * Nothing about choosing an input, or switching between one and two at a
 * time, changes a value: those are views of the same state.
 *
 * ## Every path is the same path
 *
 * The editor's range, its two step buttons and the pads all send the same
 * `onChange(id, value, { op })` the rest of the console does; one drag or one
 * press is one operation, so one undo takes it back. Tap, keyboard (the range
 * and the buttons) and pointer all reach every value the pads reach.
 *
 * @param {{
 *   controls: object[],                      // the pad inputs, in the order to name them
 *   padSet: HTMLElement,                     // the pads, built by the caller
 *   selectPad: (id: string) => void,         // show one pad of the set
 *   onChange: (id: string, value: number|Record<string, number>, detail?: {op?: string}) => void,
 *   copy: { single?: string, singleJa?: string, pair?: string, pairJa?: string,
 *           start?: string, startJa?: string, label?: string, labelJa?: string },
 *   nextOperation: () => string,
 *   snap: (value: number, control: object) => number,
 *   formatterFor: (control: object) => (value: number) => string,
 * }} options
 */
export function createExperimentInputs({ controls, padSet, selectPad, onChange, copy = {}, nextOperation, snap, formatterFor }) {
  const byId = new Map(controls.map((control) => [control.id, { ...control }]));
  let selected = controls.find((control) => control.id === copy.initial)?.id ?? controls[0]?.id;
  let mode = 'single';

  const pairOf = (en, ja) => [
    el('span', { class: 'lang-en', text: en ?? '' }),
    el('span', { class: 'lang-ja', text: ja ?? '' }),
  ];
  const dual = (en, ja, className) => el('span', { class: className }, pairOf(en, ja));

  // --- the strip -----------------------------------------------------------
  const chips = new Map();
  const chipButtons = controls.map((control) => {
    const value = el('span', { class: 'exp-chip-value' });
    const button = el('button', {
      type: 'button',
      class: 'exp-chip',
      dataset: { input: control.id },
      'aria-pressed': 'false',
      on: { click: () => choose(control.id) },
    }, [dual(control.short, control.shortJa, 'exp-chip-name'), value]);
    chips.set(control.id, { button, value });
    return button;
  });
  const modeButton = el('button', {
    type: 'button',
    class: 'exp-mode',
    'aria-pressed': 'false',
    on: { click: () => setMode(mode === 'pair' ? 'single' : 'pair') },
  }, [dual(copy.pair ?? 'Two at once', copy.pairJa ?? '2つ同時', 'exp-mode-label')]);
  // In "two at once" the pads' own switcher — both pairs by name, with all
  // four values — takes the chips' place in the same row, so the four values
  // stay in view without a second row of them.
  const switcher = padSet.querySelector?.('.pad-switcher') ?? null;
  const strip = el('div', {
    class: 'exp-strip',
    role: 'group',
    'aria-label': `${copy.labelJa ?? '4つの入力'} / ${copy.label ?? 'Four inputs'}`,
  }, [...chipButtons, switcher, modeButton]);

  // --- one input on its own ---------------------------------------------------
  const nameLine = el('span', { class: 'exp-single-name' });
  const valueLine = el('span', { class: 'exp-single-value' });
  const startLine = el('span', { class: 'exp-single-start' });
  let rangeOp = null;
  const range = el('input', {
    class: 'exp-range',
    type: 'range',
    on: {
      pointerdown: () => {
        rangeOp = nextOperation();
      },
      keydown: () => {
        rangeOp = nextOperation();
      },
      input: (event) => {
        const control = byId.get(selected);
        const value = snap(Number(event.target.value), control);
        rangeOp ??= nextOperation();
        commit(control.id, value, rangeOp);
      },
      change: () => {
        rangeOp = null;
      },
    },
  });
  const stepButton = (direction) => {
    const label = el('span', { class: 'exp-step-label' });
    const button = el('button', {
      type: 'button',
      class: 'exp-step',
      dataset: { direction },
      on: {
        click: () => {
          const control = byId.get(selected);
          const nudge = Number(control.nudge) || Number(control.step) || 1;
          const value = snap(control.value + (direction === 'up' ? nudge : -nudge), control);
          if (value !== control.value) commit(control.id, value, nextOperation());
        },
      },
    }, [
      direction === 'down' ? el('span', { class: 'exp-step-mark', 'aria-hidden': 'true', text: '‹' }) : null,
      label,
      direction === 'up' ? el('span', { class: 'exp-step-mark', 'aria-hidden': 'true', text: '›' }) : null,
    ]);
    return { button, label };
  };
  const down = stepButton('down');
  const up = stepButton('up');
  const single = el('div', { class: 'exp-single' }, [
    el('div', { class: 'exp-single-head' }, [nameLine, valueLine, startLine]),
    el('div', { class: 'exp-single-row' }, [down.button, range, up.button]),
  ]);

  const pair = el('div', { class: 'exp-pair' }, [padSet]);

  const element = el('div', { class: 'exp-inputs', dataset: { mode } }, [strip, single, pair]);

  function commit(id, value, op) {
    const control = byId.get(id);
    control.value = value;
    paint();
    onChange(id, value, { op });
  }

  function choose(id) {
    selected = id;
    setMode('single');
  }

  function setMode(next) {
    mode = next;
    element.dataset.mode = mode;
    modeButton.setAttribute('aria-pressed', String(mode === 'pair'));
    if (mode === 'pair') {
      // The pad that holds the input the reader was on.
      const padId = byId.get(selected)?.pad?.id;
      if (padId) selectPad(padId);
    }
    paint();
  }

  function paint() {
    for (const [id, parts] of chips) {
      const control = byId.get(id);
      const moved = Number.isFinite(control.start) && control.value !== control.start;
      const mark = !moved ? '' : control.value > control.start ? '↑' : '↓';
      parts.value.textContent = `${formatterFor(control)(control.value)}${mark}`;
      parts.button.classList.toggle('is-moved', moved);
      parts.button.setAttribute('aria-pressed', String(mode === 'single' && id === selected));
    }
    const control = byId.get(selected);
    if (!control) return;
    const format = formatterFor(control);
    nameLine.replaceChildren(...pairOf(control.short ?? control.label, control.shortJa ?? control.labelJa));
    valueLine.textContent = `${format(control.value)}${control.unit ? ` ${control.unit}` : ''}`;
    startLine.replaceChildren(
      ...pairOf(`${copy.start ?? 'start'} ${format(control.start)}`, `${copy.startJa ?? '開始時'} ${format(control.start)}`)
    );
    range.min = String(control.min);
    range.max = String(control.max);
    range.step = String(control.step);
    if (document.activeElement !== range) range.value = String(control.value);
    range.setAttribute('aria-valuetext', `${format(control.value)}${control.unit ? ` ${control.unit}` : ''}`);
    down.label.replaceChildren(...pairOf(control.decrease, control.decreaseJa));
    up.label.replaceChildren(...pairOf(control.increase, control.increaseJa));
    paintNames();
    down.button.disabled = control.value <= control.min;
    up.button.disabled = control.value >= control.max;
  }

  /**
   * The accessible names, in the language on screen. An `aria-label` is one
   * string, so it cannot carry both spans the way the visible text does; a
   * Japanese sentence read to an English page is read with English phonemes.
   */
  function paintNames() {
    const control = byId.get(selected);
    if (!control) return;
    range.setAttribute('aria-label', inLanguage(control.label, control.labelJa));
    down.button.setAttribute('aria-label', inLanguage(
      `${control.short ?? control.label}: ${control.decrease ?? 'decrease'}`,
      `${control.shortJa ?? control.labelJa}を${control.decreaseJa ?? '減らす'}`
    ));
    up.button.setAttribute('aria-label', inLanguage(
      `${control.short ?? control.label}: ${control.increase ?? 'increase'}`,
      `${control.shortJa ?? control.labelJa}を${control.increaseJa ?? '増やす'}`
    ));
  }

  paint();
  // Repaint on a language switch for as long as this surface is on the page.
  // A scene change drops it, so it stops itself then rather than leaving a
  // painter for a surface nobody can see.
  let shown = false;
  const stopNames = onLanguageChange(() => {
    if (element.isConnected) shown = true;
    else if (shown) {
      stopNames?.();
      return;
    }
    paintNames();
  });

  return {
    element,
    /** Model-side values back into the strip and the editor. */
    setValue(id, value, definition) {
      const control = byId.get(id);
      if (!control) return;
      if (definition) Object.assign(control, definition);
      control.value = Number(value);
      paint();
    },
    get mode() {
      return mode;
    },
    get selected() {
      return selected;
    },
    choose,
    setMode,
  };
}
