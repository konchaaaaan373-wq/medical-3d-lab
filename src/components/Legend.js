import { el } from '../utils/dom.js';

/**
 * Colour key. Each swatch dims when its species is not yet present, so the
 * legend doubles as a second read-out of where the progression currently is.
 */
export function createLegend(meta) {
  const items = meta.legend.map((entry) => {
    const node = el('li', { class: 'legend-item' }, [
      el('span', { class: 'legend-dot', style: `--dot:${meta.palette[entry.key]}` }),
      el('span', { class: 'legend-label' }, [
        el('span', { class: 'legend-en', text: entry.label }),
        el('span', { class: 'legend-ja', text: entry.labelJa }),
      ]),
    ]);
    return { key: entry.key, node };
  });

  const element = el('ul', { class: 'panel legend' }, items.map((item) => item.node));

  /** Presence thresholds mirror the shader's join thresholds, roughly. */
  const ACTIVE_FROM = { monomer: 0.02, oligomer: 0.34, fibril: 0.56, plaque: 0.78 };

  return {
    element,
    update(progress) {
      for (const item of items) {
        item.node.classList.toggle('is-active', progress >= ACTIVE_FROM[item.key]);
      }
    },
  };
}
