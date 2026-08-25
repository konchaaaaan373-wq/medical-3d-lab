import { el } from '../utils/dom.js';

/**
 * Sliders for a scene's own model inputs.
 *
 * Deliberately separate from the progression slider. That one moves along a
 * modelled trajectory; these change the conditions the model is solved under,
 * and every number in the read-out is re-derived from the result. Keeping them
 * apart is the point: it is what makes "raising preload raises stroke volume"
 * something the viewer does to the model rather than something a caption says.
 *
 * @param {{
 *   controls: {id:string,label:string,labelJa:string,min:number,max:number,step:number,value:number,format:(v:number)=>string}[],
 *   onChange: (id: string, value: number) => void,
 *   onReset: () => void,
 * }} options
 */
export function createModelControls({ controls, onChange, onReset }) {
  const rows = new Map();

  const inputs = controls.map((control) => {
    const readout = el('span', { class: 'model-control-value', text: control.format(control.value) });
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
          readout.textContent = control.format(value);
          onChange(control.id, value);
        },
      },
    });
    rows.set(control.id, { input, readout, control });
    return el('label', { class: 'model-control' }, [
      el('span', { class: 'model-control-label' }, [
        el('span', { class: 'lang-en', text: control.label }),
        el('span', { class: 'lang-ja', text: control.labelJa }),
      ]),
      el('span', { class: 'model-control-row' }, [input, readout]),
    ]);
  });

  const reset = el('button', {
    class: 'model-control-reset',
    type: 'button',
    title: 'Return both loading conditions to the modelled state',
    on: { click: () => onReset() },
  }, [
    el('span', { class: 'lang-en', text: 'Reset' }),
    el('span', { class: 'lang-ja', text: '戻す' }),
  ]);

  const element = el('div', { class: 'panel model-controls' }, [
    el('div', { class: 'model-controls-head' }, [
      el('span', { class: 'model-controls-title' }, [
        el('span', { class: 'lang-en', text: 'Loading conditions' }),
        el('span', { class: 'lang-ja', text: '負荷条件' }),
      ]),
      reset,
    ]),
    ...inputs,
  ]);

  return {
    element,
    /** Pushes model-side values back into the sliders (used by "reset"). */
    sync(next) {
      for (const control of next) {
        const row = rows.get(control.id);
        if (!row) continue;
        row.input.value = String(control.value);
        row.readout.textContent = control.format(control.value);
      }
    },
  };
}
