import { el } from '../utils/dom.js';

/**
 * Optional read-out panel. Any scene that implements `getMetrics()` gets one;
 * scenes that do not simply never see it.
 *
 * The values come from the scene's own model, so what the panel says and what
 * the 3D view shows are the same numbers.
 */
export function createMetricsPanel() {
  const element = el('div', { class: 'panel metrics' });
  const rows = new Map();

  return {
    element,
    /** @param {{id:string,label:string,labelJa:string,value:number|string,unit:string,emphasis?:boolean}[]} metrics */
    update(metrics) {
      for (const metric of metrics) {
        let row = rows.get(metric.id);
        if (!row) {
          // Numbers are language-independent, but a qualitative read-out
          // ("raised" / "上昇") needs both languages.
          const bilingual = metric.valueJa != null;
          const value = el('span', { class: `metric-value${bilingual ? ' lang-en' : ''}` });
          const valueJa = bilingual ? el('span', { class: 'metric-value lang-ja' }) : null;
          // Filled in only while comparing, so the row does not reserve space
          // for a value that is usually absent.
          const reference = el('span', { class: 'metric-reference' });
          const unit = el('span', { class: 'metric-unit', text: metric.unit });
          const node = el('div', { class: `metric${metric.emphasis ? ' is-key' : ''}` }, [
            el('span', { class: 'metric-label' }, [
              el('span', { class: 'lang-en', text: metric.label }),
              el('span', { class: 'lang-ja', text: metric.labelJa }),
            ]),
            el('span', { class: 'metric-figure' }, [reference, value, valueJa, unit]),
          ]);
          element.append(node);
          row = { value, valueJa, reference, unit };
          rows.set(metric.id, row);
        }
        row.value.textContent = String(metric.value);
        if (row.valueJa) row.valueJa.textContent = String(metric.valueJa);
        row.unit.textContent = metric.unit;
        row.reference.textContent = metric.reference == null ? '' : `${metric.reference} →`;
      }
    },
  };
}
