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

  const editorControls = controls.filter((control) => control.editor && !control.hidden);
  const editor = editorControls.length ? createInputEditor(editorControls, onChange, copy.editor ?? {}) : null;
  if (editor) for (const control of editorControls) rows.set(control.id, { setValue: (value, definition) => editor.setValue(control.id, value, definition) });

  const inputs = controls.map((control) => {
    // A control a scene lists but does not draw — kept in the list because the
    // list is also what a session capture replays, in order.
    if (control.hidden) return null;
    // The inputs a scene hands to the editor are drawn once, together, where
    // the first of them is listed.
    if (control.editor) return control === editorControls[0] ? editor.element : null;
    if (control.kind === 'experiment') {
      const experiment = createExperiment(control, onChange, onReset);
      rows.set(control.id, { setValue: (value, definition) => experiment.setValue(definition ?? control) });
      return experiment.element;
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
  // A scene may gather some of its advanced controls under a second, nested
  // disclosure (`group`), so what is behind "adjust in detail" opens in the
  // order it is needed rather than all at once.
  const advancedLoose = inputs.filter((node, index) => node && controls[index].advanced && !controls[index].group);
  const groupIds = [...new Set(controls.filter((control) => control.advanced && control.group).map((control) => control.group))];
  const advancedGroups = groupIds.map((group) => {
    const words = copy.groups?.[group] ?? {};
    return el('details', { class: 'model-controls-group', dataset: { group } }, [
      el('summary', { class: 'model-controls-group-toggle' }, [
        el('span', { class: 'lang-en', text: words.label ?? group }),
        el('span', { class: 'lang-ja', text: words.labelJa ?? group }),
      ]),
      el('div', { class: 'model-control-list' },
        inputs.filter((node, index) => node && controls[index].advanced && controls[index].group === group)),
      words.note || words.noteJa
        ? el('p', { class: 'model-controls-advanced-note' }, [
            el('span', { class: 'lang-en', text: words.note ?? '' }),
            el('span', { class: 'lang-ja', text: words.noteJa ?? '' }),
          ])
        : null,
    ]);
  });
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
          el('div', { class: 'model-control-list' }, advancedLoose),
          ...advancedGroups,
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

  // With an editor, the reset for everything stands beside the editor's own
  // "reset this one", where the difference between the two is readable.
  const adopted = Boolean(editor && reset);
  if (adopted) editor.adopt(reset);

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
    advanced,
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

/**
 * Several numeric inputs, one open at a time.
 *
 * The inputs are always named on screen (the row of tabs), and the one chosen
 * is moved in a single editor whose place and size do not change: choosing a
 * tab swaps which input the editor edits — it changes no value — and a first
 * move, a value growing a digit or the reset becoming available changes only
 * text inside boxes that are already there. Four stacked sliders in a
 * scrolling list put three of the four out of sight and moved the one under
 * the reader's finger when a row above it appeared (owner's phone recordings,
 * 2026-09-25).
 *
 * One `<input type=range>` serves all of them, and it is never replaced, so a
 * drag keeps its pointer capture and focus while the scene re-renders around
 * it. The two buttons move one `nudge` at a time — a drag for watching a
 * change unfold, a press for a step that lands where it was meant to.
 *
 * @param {{id:string,label:string,labelJa:string,short?:string,shortJa?:string,min:number,max:number,step:number,value:number,start?:number,nudge?:number,decrease?:string,decreaseJa?:string,increase?:string,increaseJa?:string,format?:(v:number)=>string}[]} items
 * @param {(id: string, value: number) => void} onChange
 * @param {{label?:string,labelJa?:string,current?:string,currentJa?:string,start?:string,startJa?:string,resetOne?:string,resetOneJa?:string}} words
 */
function createInputEditor(items, onChange, words) {
  const state = new Map(items.map((item) => [item.id, { ...item }]));
  let active = items[0].id;
  const bilingual = (en, ja, className = '') => [
    el('span', { class: `lang-en ${className}`.trim(), text: en ?? '' }),
    el('span', { class: `lang-ja ${className}`.trim(), text: ja ?? '' }),
  ];
  const setText = (pair, en, ja) => {
    pair[0].textContent = en ?? '';
    pair[1].textContent = ja ?? '';
  };

  const tabs = new Map();
  const tabList = el('div', {
    class: 'model-editor-tabs',
    role: 'tablist',
    'aria-label': `${words.label ?? 'Input to change'} / ${words.labelJa ?? '変える入力'}`,
    on: {
      keydown: (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        const ids = [...tabs.keys()];
        const next = ids[(ids.indexOf(active) + (event.key === 'ArrowRight' ? 1 : ids.length - 1)) % ids.length];
        select(next);
        tabs.get(next).focus();
        event.preventDefault();
      },
    },
  }, items.map((item) => {
    const tab = el('button', {
      class: 'model-editor-tab',
      type: 'button',
      role: 'tab',
      id: `model-editor-tab-${item.id}`,
      dataset: { input: item.id },
      'aria-controls': 'model-editor-panel',
      on: { click: () => select(item.id) },
    }, [
      ...bilingual(item.short ?? item.label, item.shortJa ?? item.labelJa, 'model-editor-tab-name'),
      // Whether this input is off its starting value. Always in the box, only
      // its visibility changes, so marking a tab moves nothing.
      el('span', { class: 'model-editor-tab-mark', 'aria-hidden': 'true', text: '●' }),
    ]);
    tabs.set(item.id, tab);
    return tab;
  }));

  const name = bilingual('', '');
  // The input's full name — its definition and unit — on one line of its own.
  const nameBox = el('span', { class: 'model-editor-name' }, name);
  const currentValue = el('span', { class: 'model-editor-current-value' });
  const startValue = el('span', { class: 'model-editor-start-value' });
  const decreaseWords = bilingual('', '');
  const increaseWords = bilingual('', '');
  const startMark = el('span', { class: 'model-editor-start-mark', 'aria-hidden': 'true' });

  const step = (direction) => {
    const item = state.get(active);
    const nudge = Number(item.nudge ?? item.step);
    const raw = item.value + direction * nudge;
    const snapped = item.min + Math.round((raw - item.min) / item.step) * item.step;
    const digits = decimals(item.step);
    const value = Number(Math.min(item.max, Math.max(item.min, snapped)).toFixed(digits));
    if (value === item.value) return;
    commit(value);
  };
  const decrease = el('button', { class: 'model-editor-step', type: 'button', dataset: { direction: 'down' }, on: { click: () => step(-1) } }, [
    el('span', { class: 'model-editor-step-sign', 'aria-hidden': 'true', text: '−' }),
    el('span', { class: 'model-editor-step-words' }, decreaseWords),
  ]);
  const increase = el('button', { class: 'model-editor-step', type: 'button', dataset: { direction: 'up' }, on: { click: () => step(1) } }, [
    el('span', { class: 'model-editor-step-sign', 'aria-hidden': 'true', text: '+' }),
    el('span', { class: 'model-editor-step-words' }, increaseWords),
  ]);
  const slider = el('input', {
    class: 'slider slider-sm model-editor-slider',
    type: 'range',
    on: { input: (event) => commit(Number(event.target.value), { fromSlider: true }) },
  });
  const resetOne = el('button', {
    class: 'model-editor-reset',
    type: 'button',
    on: { click: () => commit(state.get(active).start) },
  }, bilingual(words.resetOne ?? 'Reset this', words.resetOneJa ?? 'この項目を戻す'));

  let valuesLine;
  const panel = el('div', {
    class: 'model-editor-panel',
    role: 'tabpanel',
    id: 'model-editor-panel',
  }, [
    el('div', { class: 'model-editor-head' }, [nameBox]),
    el('div', { class: 'model-editor-row' }, [
      decrease,
      el('span', { class: 'model-editor-track' }, [slider, startMark]),
      increase,
    ]),
    valuesLine = el('div', { class: 'model-editor-values' }, [
      el('span', { class: 'model-editor-current' }, [
        ...bilingual(words.current ?? 'Now', words.currentJa ?? '現在', 'model-editor-caption'),
        currentValue,
      ]),
      el('span', { class: 'model-editor-start' }, [
        ...bilingual(words.start ?? 'Start', words.startJa ?? '開始時', 'model-editor-caption'),
        startValue,
      ]),
      resetOne,
    ]),
  ]);

  function commit(value, { fromSlider = false } = {}) {
    const item = state.get(active);
    item.value = value;
    render({ keepSlider: fromSlider });
    onChange(item.id, value);
  }

  function select(id) {
    if (!state.has(id) || id === active) return;
    active = id;
    render();
  }

  function render({ keepSlider = false } = {}) {
    const item = state.get(active);
    const format = item.format ?? ((value) => String(value));
    for (const [id, tab] of tabs) {
      const selected = id === active;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const entry = state.get(id);
      tab.classList.toggle('is-changed', entry.start != null && entry.value !== entry.start);
    }
    panel.setAttribute('aria-labelledby', `model-editor-tab-${active}`);
    panel.dataset.input = active;
    setText(name, item.label, item.labelJa);
    nameBox.title = `${item.labelJa} / ${item.label}`;
    setText(decreaseWords, item.decrease ?? 'Less', item.decreaseJa ?? '減らす');
    setText(increaseWords, item.increase ?? 'More', item.increaseJa ?? '増やす');
    decrease.setAttribute('aria-label', `${item.shortJa ?? item.labelJa}を${item.decreaseJa ?? '減らす'}`);
    increase.setAttribute('aria-label', `${item.shortJa ?? item.labelJa}を${item.increaseJa ?? '増やす'}`);
    decrease.disabled = item.value <= item.min;
    increase.disabled = item.value >= item.max;
    // The range's own attributes change only when a different input is
    // chosen, and its value is not written back while it is the thing being
    // dragged: a value assigned to a range under the finger is the one way to
    // make it jump.
    if (slider.dataset.input !== item.id) {
      slider.dataset.input = item.id;
      slider.min = String(item.min);
      slider.max = String(item.max);
      slider.step = String(item.step);
      slider.setAttribute('aria-label', `${item.label} / ${item.labelJa}`);
      keepSlider = false;
    }
    if (!keepSlider) slider.value = String(item.value);
    slider.setAttribute('aria-valuetext', format(item.value));
    currentValue.textContent = format(item.value);
    const hasStart = item.start != null;
    startValue.textContent = hasStart ? format(item.start) : '';
    startMark.hidden = !hasStart;
    if (hasStart) {
      const fraction = (item.start - item.min) / (item.max - item.min);
      startMark.style.setProperty('--start', String(Math.min(1, Math.max(0, fraction))));
    }
    resetOne.disabled = !hasStart || item.value === item.start;
  }

  render();

  return {
    element: el('div', { class: 'model-control is-editor', dataset: { control: 'editor' } }, [tabList, panel]),
    /** The model's accepted value and starting point for one input. */
    setValue(id, value, definition) {
      const item = state.get(id);
      if (!item) return;
      item.value = Number(value);
      if (definition?.start != null) item.start = Number(definition.start);
      render({ keepSlider: id === active && globalThis.document?.activeElement === slider && Number(slider.value) === item.value });
    },
    get active() {
      return active;
    },
    /** Places a button (the console's whole-reset) at the end of the values line. */
    adopt(node) {
      valuesLine.append(node);
    },
  };
}

function decimals(step) {
  const text = String(step);
  return text.includes('.') ? text.split('.')[1].length : 0;
}

/**
 * One experiment a reader can run without designing it: a question, one
 * press, a way back, and the other experiments one press away.
 *
 * The press and the way back go through the same `onChange` / `onReset` as
 * every other control — the experiment moves one input to one value, and
 * nothing here knows what that input means. Choosing another experiment is
 * `onChange('experiment', id)`, which the scene treats as starting it.
 *
 * Nothing in it changes size when pressed: the press and the undo swap which
 * of the two is available, and the question is one line.
 *
 * @param {{ id: string, value: string, experiment: {id:string,control:string,to:number,question:string,questionJa:string,action:string,actionJa:string}, applied: boolean, moved: boolean, options: object[], copy: object }} control
 */
function createExperiment(control, onChange, onReset) {
  const words = control.copy ?? {};
  const question = [el('span', { class: 'lang-en' }), el('span', { class: 'lang-ja' })];
  const actionWords = [el('span', { class: 'lang-en' }), el('span', { class: 'lang-ja' })];
  let current = control;
  const act = el('button', {
    class: 'model-experiment-act',
    type: 'button',
    on: { click: () => onChange(current.experiment.control, current.experiment.to) },
  }, actionWords);
  const undo = el('button', {
    class: 'model-experiment-undo',
    type: 'button',
    on: { click: () => onReset() },
  }, [
    el('span', { class: 'lang-en', text: words.undo ?? 'Undo' }),
    el('span', { class: 'lang-ja', text: words.undoJa ?? '元に戻す' }),
  ]);
  const others = new Map();
  const otherList = el('div', { class: 'model-experiment-others-list' }, (control.options ?? []).map((option) => {
    const button = el('button', {
      class: 'model-experiment-other',
      type: 'button',
      dataset: { value: option.id },
      on: {
        click: () => {
          chooser.open = false;
          onChange(control.id, option.id);
        },
      },
    }, [
      el('span', { class: 'lang-en', text: option.question }),
      el('span', { class: 'lang-ja', text: option.questionJa }),
    ]);
    others.set(option.id, button);
    return button;
  }));
  const chooser = el('details', { class: 'model-experiment-others' }, [
    el('summary', { class: 'model-experiment-others-toggle' }, [
      el('span', { class: 'lang-en', text: words.others ?? 'Try another' }),
      el('span', { class: 'lang-ja', text: words.othersJa ?? 'ほかの条件を試す' }),
    ]),
    el('div', { class: 'model-experiment-others-body' }, [
      otherList,
      words.othersNote || words.othersNoteJa
        ? el('p', { class: 'model-experiment-others-note' }, [
            el('span', { class: 'lang-en', text: words.othersNote ?? '' }),
            el('span', { class: 'lang-ja', text: words.othersNoteJa ?? '' }),
          ])
        : null,
    ]),
  ]);
  const heading = el('p', { class: 'model-experiment-question' }, question);

  function setValue(next) {
    current = next;
    question[0].textContent = next.experiment.question;
    question[1].textContent = next.experiment.questionJa;
    actionWords[0].textContent = next.experiment.action;
    actionWords[1].textContent = next.experiment.actionJa;
    act.setAttribute('aria-pressed', String(Boolean(next.applied)));
    act.disabled = Boolean(next.applied);
    undo.disabled = !next.moved;
    for (const [id, button] of others) button.hidden = id === next.experiment.id;
  }
  setValue(control);

  return {
    element: el('div', { class: 'model-control is-experiment', dataset: { control: control.id } }, [
      heading,
      el('div', { class: 'model-experiment-actions' }, [act, undo]),
      chooser,
    ]),
    setValue,
  };
}
