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
 *   controls: {id:string,label:string,labelJa:string,min?:number,max?:number,step?:number,value:number|string,format?:(v:number)=>string,kind?:'range'|'action'|'choice',actionLabel?:string,actionLabelJa?:string,effect?:string,effectJa?:string,options?:{value:string,label:string,labelJa:string,effect?:string,effectJa?:string}[]}[],
 *   onChange: (id: string, value: number|string) => void,
 *   onReset: () => void,
 *   copy?: {title?:string,titleJa?:string,subtitle?:string,subtitleJa?:string,primary?:boolean,reset?:boolean},
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

  const inputs = controls.map((control) => {
    if (control.kind === 'choice') {
      const buttons = new Map();
      let current = String(control.value);
      const setValue = (value) => {
        current = String(value);
        for (const [optionValue, button] of buttons) {
          const selected = optionValue === current;
          button.classList.toggle('is-selected', selected);
          button.setAttribute('aria-pressed', String(selected));
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
          const button = el('button', {
            class: 'model-choice-button',
            type: 'button',
            'aria-label': `${option.label} / ${option.labelJa}`,
            'aria-pressed': 'false',
            on: {
              click: () => {
                if (String(option.value) === current) return;
                setValue(option.value);
                onChange(control.id, option.value);
              },
            },
          }, [
            el('span', { class: 'model-choice-label lang-en', text: option.label }),
            el('span', { class: 'model-choice-label lang-ja', text: option.labelJa }),
            option.effect || option.effectJa
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
      return el('div', { class: 'model-control is-choice' }, [group]);
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

  const reset = copy.reset === false
    ? null
    : el('button', {
        class: 'model-control-reset',
        type: 'button',
        title: 'Return the model controls to their opening state',
        on: { click: () => onReset() },
      }, [
        el('span', { class: 'lang-en', text: 'Reset' }),
        el('span', { class: 'lang-ja', text: '戻す' }),
      ]);

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
      reset,
    ]),
    copy.subtitle || copy.subtitleJa
      ? el('span', { class: 'model-controls-subtitle' }, [
          el('span', { class: 'lang-en', text: copy.subtitle ?? '' }),
          el('span', { class: 'lang-ja', text: copy.subtitleJa ?? '' }),
        ])
      : null,
    el('div', { class: 'model-control-list' }, inputs),
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
