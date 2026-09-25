import { el } from '../utils/dom.js';

/**
 * Controls for a scene's own model inputs.
 *
 * Deliberately separate from the progression slider. That one moves along a
 * modelled trajectory; these change the conditions the model is solved under,
 * and every number in the read-out is re-derived from the result. Keeping them
 * apart is the point: it is what makes "raising preload raises stroke volume"
 * something the viewer does to the model rather than something a caption says.
 *
 * A control is a range slider by default. A scene with a deliberately small
 * intervention surface may instead declare `kind: 'action'` for a stepped
 * press target, or `kind: 'choice'` for mutually exclusive states. Every kind
 * still goes through the same `setModelControl` path; this changes only how the
 * input is touched, never how the model is solved.
 *
 * @param {{
 *   controls: {id:string,label:string,labelJa:string,min?:number,max?:number,step?:number,value:number|string,format?:(v:number)=>string,kind?:'range'|'action'|'choice',advanced?:boolean,hidden?:boolean,caption?:string,captionJa?:string,actionLabel?:string,actionLabelJa?:string,effect?:string,effectJa?:string,options?:{value:string,label:string,labelJa:string,status?:boolean,short?:string,shortJa?:string,tag?:string,tagJa?:string,effect?:string,effectJa?:string}[]}[],
 *   onChange: (id: string, value: number|string) => void,
 *   onReset: () => void,
 *   copy?: {title?:string,titleJa?:string,subtitle?:string,subtitleJa?:string,primary?:boolean,reset?:boolean,resetLabel?:string,resetLabelJa?:string,hideChoiceEffects?:boolean,advanced?:{label?:string,labelJa?:string,note?:string,noteJa?:string}},
 * }} options
 */
/**
 * `format` is documented as optional, and until a scene actually omitted it the
 * component called it unconditionally — so a control without one took the whole
 * scene down at build time with `e.format is not a function`. No unit test
 * could see it, because none of them render. The default is a plain number
 * with the control's own step deciding the precision, which is what a caller
 * omitting `format` is asking for.
 *
 * @param {{ format?: (v: number) => string, step?: number }} control
 */
function formatterFor(control) {
  if (typeof control.format === 'function') return control.format;
  const step = Number(control.step);
  const digits = Number.isFinite(step) && step > 0 && step < 1 ? String(step).split('.')[1].length : 0;
  const unit = control.unit ? `${control.unit}` : '';
  return (value) => `${Number(value).toFixed(digits)}${unit}`;
}

export function createModelControls({ controls, onChange, onReset, copy = {} }) {
  const rows = new Map();
  const tactile = controls.some((control) => control.kind === 'action' || control.kind === 'choice');

  // Inputs a scene places on a pad (`pad: { id, axis }`) are drawn two to a
  // pad, where the first of the pair is listed. Each is still its own entry.
  const pads = new Map();
  for (const control of controls) {
    if (!control.pad || control.hidden) continue;
    const entry = pads.get(control.pad.id) ?? {};
    entry[control.pad.axis] = control;
    pads.set(control.pad.id, entry);
  }
  const padViews = new Map();
  for (const [id, axes] of pads) {
    if (!axes.x || !axes.y) continue;
    const view = createXYPad({ id, words: axes.x.pad, copy: copy.pads ?? {}, x: axes.x, y: axes.y, onChange });
    // Drawn where the first of its two inputs is listed.
    view.first = controls.find((control) => control.pad?.id === id).id;
    padViews.set(id, view);
    rows.set(axes.x.id, { setValue: (value, definition) => view.setValue('x', value, definition) });
    rows.set(axes.y.id, { setValue: (value, definition) => view.setValue('y', value, definition) });
  }

  let historyActions = null;
  const inputs = controls.map((control) => {
    // A control a scene lists but does not draw — kept in the list because the
    // list is also what a session capture replays, in order.
    if (control.hidden) return null;
    // The inputs a scene hands to the editor are drawn once, together, where
    // the first of them is listed.
    if (control.pad && padViews.has(control.pad.id)) {
      const pad = padViews.get(control.pad.id);
      return pad.first === control.id ? pad.element : null;
    }
    if (control.kind === 'history') {
      // Undo: one of the reader's operations back, through the same path.
      const button = el('button', {
        class: 'model-control-undo',
        type: 'button',
        on: { click: () => onChange(control.id, 'undo') },
        title: control.labelJa,
      }, [
        el('span', { class: 'lang-en', text: control.label }),
        el('span', { class: 'lang-ja model-control-undo-long', text: control.labelJa }),
        // A narrow screen's word for the same button; the long one is its title.
        el('span', { class: 'lang-ja model-control-undo-short', text: control.shortJa ?? control.labelJa }),
      ]);
      button.disabled = !control.canUndo;
      historyActions = el('div', { class: 'model-control-actions', dataset: { control: control.id } }, [button]);
      rows.set(control.id, { setValue: (value, definition) => { button.disabled = !definition?.canUndo; } });
      return historyActions;
    }
    if (control.kind === 'choice') {
      const buttons = new Map();
      let current = String(control.value);
      const setValue = (value) => {
        current = String(value);
        for (const [optionValue, button] of buttons) {
          const selected = optionValue === current;
          button.classList.toggle('is-selected', selected);
          if (button.classList.contains('model-choice-status')) button.hidden = !selected;
          else button.setAttribute('aria-pressed', String(selected));
        }
      };
      const group = el(
        'div',
        {
          class: 'model-choice-group',
          role: 'group',
          'aria-label': `${control.label} / ${control.labelJa}`,
        },
        (control.options ?? []).map((option) => {
          // A status option reports a state the reader reached another way
          // (the intervention row's "adjusted by hand"). It is not a button,
          // because pressing it could mean nothing, and it is only on screen
          // while it is true.
          if (option.status) {
            const chip = el('span', {
              class: 'model-choice-button model-choice-status',
              dataset: { value: String(option.value) },
              role: 'status',
            }, [
              el('span', { class: 'model-choice-label lang-en', text: option.short ?? option.label }),
              el('span', { class: 'model-choice-label lang-ja', text: option.shortJa ?? option.labelJa }),
            ]);
            chip.hidden = true;
            buttons.set(String(option.value), chip);
            return chip;
          }
          const button = el('button', {
            class: 'model-choice-button',
            type: 'button',
            dataset: { value: String(option.value) },
            'aria-label': `${option.label} / ${option.labelJa}`,
            'aria-pressed': 'false',
            // The short name is what a compact row has room for; the full name
            // and what the option does stay one hover away and in the
            // accessible name, so shortening the label drops no caveat.
            title: option.short || option.shortJa
              ? `${option.labelJa}${option.effectJa ? ` — ${option.effectJa}` : ''}`
              : undefined,
            on: {
              click: () => {
                if (String(option.value) === current) return;
                setValue(option.value);
                onChange(control.id, option.value);
              },
            },
          }, [
            el('span', { class: 'model-choice-label lang-en', text: option.short ?? option.label }),
            el('span', { class: 'model-choice-label lang-ja', text: option.shortJa ?? option.labelJa }),
            // A short qualifier that has to be seen before pressing — where the
            // option applies — as opposed to what it does, which is `effect`.
            option.tag || option.tagJa
              ? el('span', { class: 'model-choice-tag' }, [
                  el('span', { class: 'lang-en', text: option.tag ?? '' }),
                  el('span', { class: 'lang-ja', text: option.tagJa ?? '' }),
                ])
              : null,
            (option.effect || option.effectJa) && !copy.hideChoiceEffects
              ? el('span', { class: 'model-choice-effect' }, [
                  el('span', { class: 'lang-en', text: option.effect ?? '' }),
                  el('span', { class: 'lang-ja', text: option.effectJa ?? '' }),
                ])
              : null,
          ]);
          buttons.set(String(option.value), button);
          return button;
        })
      );
      setValue(current);
      rows.set(control.id, { setValue });
      // A step caption says which kind of choice this row is. Two rows of
      // identical-looking cards — the condition and what is done to it — read
      // as one list of five, and with one selected in each the reader could not
      // tell which of the two lit cards was "where I am" and which "what I did".
      const caption = control.caption || control.captionJa
        ? el('span', { class: 'model-choice-caption' }, [
            el('span', { class: 'lang-en', text: control.caption ?? '' }),
            el('span', { class: 'lang-ja', text: control.captionJa ?? '' }),
          ])
        : null;
      return el('div', { class: `model-control is-choice${caption ? ' has-caption' : ''}`, dataset: { control: control.id } }, [
        caption,
        group,
      ]);
    }

    if (control.kind === 'action') {
      const readout = el('span', { class: 'model-action-value' });
      const segments = Array.from({ length: Math.max(1, Math.round((control.max - control.min) / control.step)) }, () =>
        el('span', { class: 'model-action-segment' })
      );
      const button = el('button', {
        class: 'model-action-button',
        type: 'button',
        'aria-label': control.actionLabel ?? control.label,
      }, [
        el('span', { class: 'model-action-plus', text: '+' }),
        el('span', { class: 'model-action-copy' }, [
          el('span', { class: 'model-action-label lang-en', text: control.actionLabel ?? control.label }),
          el('span', { class: 'model-action-label lang-ja', text: control.actionLabelJa ?? control.labelJa }),
          el('span', { class: 'model-action-effect lang-en', text: control.effect ?? '' }),
          el('span', { class: 'model-action-effect lang-ja', text: control.effectJa ?? '' }),
        ]),
        readout,
      ]);

      let current = control.value;
      const setValue = (value, definition = control) => {
        current = Number(value);
        readout.textContent = formatterFor(definition)(current);
        const completed = Math.round((current - definition.min) / definition.step);
        segments.forEach((segment, index) => segment.classList.toggle('is-on', index < completed));
        const atLimit = current >= definition.max;
        button.disabled = atLimit;
        button.classList.toggle('is-complete', atLimit);
      };
      button.addEventListener('click', () => {
        if (current >= control.max) return;
        const value = Math.min(control.max, current + control.step);
        setValue(value);
        onChange(control.id, value);
      });
      setValue(control.value);
      rows.set(control.id, { setValue });

      return el('div', { class: 'model-control is-action' }, [
        button,
        el('span', { class: 'model-action-meter', 'aria-hidden': 'true' }, segments),
      ]);
    }

    const format = formatterFor(control);
    const readout = el('span', { class: 'model-control-value', text: format(control.value) });
    const input = el('input', {
      class: 'slider slider-sm',
      type: 'range',
      min: String(control.min),
      max: String(control.max),
      step: String(control.step),
      value: String(control.value),
      'aria-label': control.label,
      on: {
        input: (event) => {
          const value = Number(event.target.value);
          readout.textContent = format(value);
          onChange(control.id, value);
        },
      },
    });
    rows.set(control.id, {
      setValue(value, definition = control) {
        input.value = String(value);
        readout.textContent = formatterFor(definition)(value);
      },
    });
    return el('label', { class: 'model-control' }, [
      el('span', { class: 'model-control-label' }, [
        el('span', { class: 'lang-en', text: control.label }),
        el('span', { class: 'lang-ja', text: control.labelJa }),
      ]),
      el('span', { class: 'model-control-row' }, [input, readout]),
    ]);
  });

  // Controls a scene marks `advanced` are the same controls behind one more
  // press. They move the model through the same `onChange` as everything else;
  // what changes is only that the first thing a reader sees is the few choices
  // the scene is about, not every input the model has.
  const primaryInputs = inputs.filter((node, index) => node && !controls[index].advanced);
  const advancedInputs = inputs.filter((node, index) => node && controls[index].advanced);
  const advanced = advancedInputs.length
    ? el('details', { class: 'model-controls-advanced' }, [
        el('summary', { class: 'model-controls-advanced-toggle' }, [
          el('span', { class: 'lang-en', text: copy.advanced?.label ?? 'Adjust the inputs yourself' }),
          el('span', { class: 'lang-ja', text: copy.advanced?.labelJa ?? '詳細パラメータ' }),
        ]),
        el('div', { class: 'model-controls-advanced-body' }, [
          copy.advanced?.note || copy.advanced?.noteJa
            ? el('p', { class: 'model-controls-advanced-note' }, [
                el('span', { class: 'lang-en', text: copy.advanced?.note ?? '' }),
                el('span', { class: 'lang-ja', text: copy.advanced?.noteJa ?? '' }),
              ])
            : null,
          el('div', { class: 'model-control-list' }, advancedInputs),
        ]),
      ])
    : null;

  const reset = copy.reset === false
    ? null
    : el('button', {
        class: 'model-control-reset',
        type: 'button',
        title: 'Return the model controls to their opening state',
        on: { click: () => onReset() },
      }, [
        el('span', { class: 'lang-en', text: copy.resetLabel ?? 'Reset' }),
        el('span', { class: 'lang-ja', text: copy.resetLabelJa ?? '戻す' }),
      ]);

  // With an undo, the reset for everything stands beside it, where the
  // difference between the two — one operation, the whole experiment — is
  // readable.
  const adopted = Boolean(historyActions && reset);
  if (adopted) historyActions.append(reset);
  // …and the way to another start state or an intervention on the same line:
  // one line of actions under the pads, not three.
  const advancedInActions = Boolean(historyActions && advanced);
  if (advancedInActions) historyActions.append(advanced);

  const title = copy.title ?? 'Loading conditions';
  const titleJa = copy.titleJa ?? '負荷条件';
  const element = el('div', {
    class: `panel model-controls${tactile ? ' is-tactile' : ''}${copy.primary ? ' is-primary' : ''}`,
  }, [
    el('div', { class: 'model-controls-head' }, [
      el('span', { class: 'model-controls-title' }, [
        el('span', { class: 'lang-en', text: title }),
        el('span', { class: 'lang-ja', text: titleJa }),
      ]),
      adopted ? null : reset,
    ]),
    copy.subtitle || copy.subtitleJa
      ? el('span', { class: 'model-controls-subtitle' }, [
          el('span', { class: 'lang-en', text: copy.subtitle ?? '' }),
          el('span', { class: 'lang-ja', text: copy.subtitleJa ?? '' }),
        ])
      : null,
    el('div', { class: 'model-control-list' }, primaryInputs),
    advancedInActions ? null : advanced,
  ]);

  return {
    element,
    /** Pushes model-side values back into the sliders (used by "reset"). */
    sync(next) {
      for (const control of next) {
        const row = rows.get(control.id);
        if (!row) continue;
        row.setValue(control.value, control);
      }
    },
  };
}

function decimals(step) {
  const text = String(step);
  return text.includes('.') ? text.split('.')[1].length : 0;
}

let operationCount = 0;
/** A fresh token for one of the reader's operations (one drag, one press). */
const nextOperation = () => `op-${(operationCount += 1)}`;

function snap(value, control) {
  const step = Number(control.step) || 0;
  const clamped = Math.min(control.max, Math.max(control.min, value));
  if (!step) return clamped;
  const snapped = control.min + Math.round((clamped - control.min) / step) * step;
  return Number(Math.min(control.max, snapped).toFixed(decimals(step)));
}

/**
 * Two independent inputs on one surface — and each of them on its own axis.
 *
 * ## What the point means
 *
 * The point *is* the two values that are applied: its position is computed
 * from them, and nothing about it springs back, glides on or snaps. Where the
 * reader grabs it — on the point or anywhere in the surface — the distance
 * between the finger and the point is kept for the whole drag, so a grab
 * never jumps the values, and a tap that does not move changes nothing.
 *
 * A drag sends its latest position at most once a frame, and the last one is
 * sent on release: nothing is lost and nothing piles up. It is one operation
 * (`op`), so the scene can undo it as one. A cancelled drag (the system took
 * the pointer, the page was hidden) ends where the last applied value is, and
 * drops what had not been sent yet.
 *
 * ## One axis alone
 *
 * Under the surface, a range for x with a button at each end; beside it, the
 * same for y. They move **only their own input** — the reader never has to
 * drag the point perfectly straight to hold the other one. They are ordinary
 * range inputs: named, with the value in words, reachable by keyboard. The
 * surface itself is for a pointer and is hidden from assistive technology;
 * the group is named for both inputs.
 *
 * @param {{ id: string, words: {label?:string,labelJa?:string}, copy: object, x: object, y: object, onChange: Function }} options
 */
function createXYPad({ id, words, copy, x, y, onChange }) {
  const axes = { x: { ...x }, y: { ...y } };
  const withUnit = (axis, value) => `${formatterFor({ ...axes[axis], unit: '' })(value)}${axes[axis].unit ? ` ${axes[axis].unit}` : ''}`;
  const fraction = (axis, value) => {
    const { min, max } = axes[axis];
    return Math.min(1, Math.max(0, (value - min) / (max - min)));
  };

  // --- the surface -------------------------------------------------------
  const thumb = el('span', { class: 'pad-thumb' });
  const startMark = el('span', { class: 'pad-start', title: `${copy.startJa ?? '開始時'}` });
  const readX = el('span', { class: 'pad-read pad-read-x' });
  const readY = el('span', { class: 'pad-read pad-read-y' });
  const endWords = (axis) => [
    el('span', { class: `pad-end pad-end-${axis}-low` }, [
      el('span', { class: 'lang-en', text: axes[axis].low ?? '' }),
      el('span', { class: 'lang-ja', text: axes[axis].lowJa ?? '' }),
    ]),
    el('span', { class: `pad-end pad-end-${axis}-high` }, [
      el('span', { class: 'lang-en', text: axes[axis].high ?? '' }),
      el('span', { class: 'lang-ja', text: axes[axis].highJa ?? '' }),
    ]),
  ];
  const area = el('div', { class: 'pad-area', 'aria-hidden': 'true' }, [
    ...endWords('x'),
    ...endWords('y'),
    readY,
    readX,
    startMark,
    thumb,
  ]);

  /** @type {{ pointerId: number, op: string, dx: number, dy: number, pending: object|null, frame: number, sent: object }|null} */
  let drag = null;

  const place = () => {
    area.style.setProperty('--px', String(fraction('x', axes.x.value)));
    area.style.setProperty('--py', String(fraction('y', axes.y.value)));
    area.style.setProperty('--sx', String(fraction('x', axes.x.start ?? axes.x.value)));
    area.style.setProperty('--sy', String(fraction('y', axes.y.start ?? axes.y.value)));
    // Name and value only: the unit and the definition are in the range's
    // name and value text and in the surface's title, where there is room.
    readX.textContent = `${axes.x.shortJa ?? axes.x.labelJa} ${formatterFor({ ...axes.x, unit: '' })(axes.x.value)}`;
    readY.textContent = `${axes.y.shortJa ?? axes.y.labelJa} ${formatterFor({ ...axes.y, unit: '' })(axes.y.value)}`;
    area.title = `${axes.y.labelJa}: ${withUnit('y', axes.y.value)}\n${axes.x.labelJa}: ${withUnit('x', axes.x.value)}`;
    area.classList.toggle('is-moved', axes.x.value !== axes.x.start || axes.y.value !== axes.y.start);
  };

  // Pixel geometry of the point's travel: inset by the point's radius.
  const INSET = 14;
  const geometry = () => {
    const rect = area.getBoundingClientRect();
    return { rect, w: Math.max(1, rect.width - 2 * INSET), h: Math.max(1, rect.height - 2 * INSET) };
  };
  const pointAt = ({ rect, w, h }) => ({
    px: rect.left + INSET + fraction('x', axes.x.value) * w,
    py: rect.top + INSET + (1 - fraction('y', axes.y.value)) * h,
  });

  const flush = () => {
    if (!drag) return;
    drag.frame = 0;
    const next = drag.pending;
    drag.pending = null;
    if (!next || (next.x === drag.sent.x && next.y === drag.sent.y)) return;
    drag.sent = next;
    onChange(id, { [axes.x.id]: next.x, [axes.y.id]: next.y }, { op: drag.op });
  };

  const end = ({ commit }) => {
    if (!drag) return;
    const current = drag;
    if (current.frame) cancelAnimationFrame(current.frame);
    if (commit) flush();
    drag = null;
    area.classList.remove('is-dragging');
    try {
      if (area.hasPointerCapture?.(current.pointerId)) area.releasePointerCapture(current.pointerId);
    } catch {
      // The pointer is already gone; nothing to release.
    }
  };

  area.addEventListener('pointerdown', (event) => {
    // One pointer owns the surface; a second touch neither takes it over nor
    // reaches the camera behind it.
    if (drag) {
      event.preventDefault();
      return;
    }
    if (event.button !== undefined && event.button > 0) return;
    event.preventDefault();
    const geo = geometry();
    const point = pointAt(geo);
    drag = {
      pointerId: event.pointerId,
      op: nextOperation(),
      // Kept for the whole drag: where the finger is relative to the point.
      dx: point.px - event.clientX,
      dy: point.py - event.clientY,
      pending: null,
      frame: 0,
      sent: { x: axes.x.value, y: axes.y.value },
    };
    area.classList.add('is-dragging');
    try {
      area.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic events in tests have no capture; the drag still works.
    }
  });
  area.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    const { rect, w, h } = geometry();
    const fx = (event.clientX + drag.dx - rect.left - INSET) / w;
    const fy = 1 - (event.clientY + drag.dy - rect.top - INSET) / h;
    drag.pending = {
      x: snap(axes.x.min + Math.min(1, Math.max(0, fx)) * (axes.x.max - axes.x.min), axes.x),
      y: snap(axes.y.min + Math.min(1, Math.max(0, fy)) * (axes.y.max - axes.y.min), axes.y),
    };
    if (!drag.frame) drag.frame = requestAnimationFrame(flush);
  });
  area.addEventListener('pointerup', (event) => {
    if (drag && event.pointerId === drag.pointerId) end({ commit: true });
  });
  // The system took the pointer: keep what was applied, drop what was not.
  area.addEventListener('pointercancel', (event) => {
    if (drag && event.pointerId === drag.pointerId) end({ commit: false });
  });
  area.addEventListener('lostpointercapture', (event) => {
    if (drag && event.pointerId === drag.pointerId) end({ commit: false });
  });
  globalThis.document?.addEventListener?.('visibilitychange', () => {
    if (globalThis.document.visibilityState === 'hidden') end({ commit: false });
  });

  // --- one axis alone ------------------------------------------------------
  const axisControl = (axis) => {
    const control = axes[axis];
    let op = nextOperation();
    const fresh = () => {
      op = nextOperation();
    };
    const range = el('input', {
      class: `slider slider-sm pad-range pad-range-${axis}`,
      type: 'range',
      min: String(control.min),
      max: String(control.max),
      step: String(control.step),
      value: String(control.value),
      'aria-label': `${control.labelJa} / ${control.label}`,
      on: {
        pointerdown: fresh,
        keydown: fresh,
        input: (event) => onChange(control.id, Number(event.target.value), { op }),
      },
    });
    const step = (direction) => {
      const nudge = Number(control.nudge ?? control.step);
      const value = snap(axes[axis].value + direction * nudge, axes[axis]);
      if (value !== axes[axis].value) onChange(control.id, value, { op: nextOperation() });
    };
    const button = (direction) =>
      el('button', {
        class: 'pad-step',
        type: 'button',
        dataset: { axis, direction: direction > 0 ? 'up' : 'down' },
        'aria-label': `${control.shortJa ?? control.labelJa}を${direction > 0 ? control.increaseJa ?? '増やす' : control.decreaseJa ?? '減らす'}`,
        title: `${direction > 0 ? control.increaseJa ?? '増やす' : control.decreaseJa ?? '減らす'}`,
        on: { click: () => step(direction) },
      }, [el('span', { 'aria-hidden': 'true', text: direction > 0 ? '+' : '−' })]);
    const down = button(-1);
    const up = button(1);
    return { range, down, up };
  };
  const ax = axisControl('x');
  const ay = axisControl('y');

  const sync = () => {
    for (const [axis, parts] of [['x', ax], ['y', ay]]) {
      const control = axes[axis];
      // Not written back while it is the thing being dragged: a value assigned
      // to a range under the finger is the one way to make it jump.
      if (globalThis.document?.activeElement !== parts.range || Number(parts.range.value) !== control.value) {
        parts.range.value = String(control.value);
      }
      parts.range.setAttribute('aria-valuetext', withUnit(axis, control.value));
      parts.down.disabled = control.value <= control.min;
      parts.up.disabled = control.value >= control.max;
    }
    place();
  };
  sync();

  const element = el('div', {
    class: 'model-control is-pad',
    role: 'group',
    'aria-label': `${words?.labelJa ?? ''}: ${axes.x.shortJa ?? axes.x.labelJa}・${axes.y.shortJa ?? axes.y.labelJa}`,
    dataset: { control: `pad-${id}`, pad: id },
  }, [
    el('span', { class: 'pad-name' }, [
      el('span', { class: 'lang-en', text: words?.label ?? '' }),
      el('span', { class: 'lang-ja', text: words?.labelJa ?? '' }),
    ]),
    el('div', { class: 'pad-body' }, [
      el('div', { class: 'pad-y' }, [ay.up, el('span', { class: 'pad-y-track' }, [ay.range]), ay.down]),
      area,
    ]),
    el('div', { class: 'pad-x' }, [ax.down, ax.range, ax.up]),
  ]);

  return {
    element,
    /** The model's accepted value and start for one axis. */
    setValue(axis, value, definition) {
      const next = Number(value);
      // Something else changed this input while it was being dragged (undo,
      // reset, a refused condition): the drag ends where the model is, and
      // nothing it had not sent is sent later.
      if (drag && next !== drag.sent[axis]) end({ commit: false });
      axes[axis].value = next;
      if (definition?.start != null) axes[axis].start = Number(definition.start);
      sync();
    },
  };
}
