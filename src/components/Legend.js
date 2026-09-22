import { el } from '../utils/dom.js';

/**
 * Colour key. Each swatch dims when its species is not yet present, so the
 * legend doubles as a second read-out of where the progression currently is.
 *
 * An entry may also declare a `lineType` — `tract`, `coarse` or `conceptual` —
 * and its swatch is then a **line** drawn the way the scene draws that kind of
 * line: solid, long-dashed or dotted. A legend whose three entries look
 * identical is a legend that has to be read to be used, and the whole point of
 * the distinction it describes is that it can be seen.
 */
export function createLegend(meta) {
  const items = meta.legend.map((entry) => {
    const dot = el('span', {
      class: `legend-dot${entry.outline ? ' is-outline' : ''}`
        + (entry.lineType ? ` is-line is-${entry.lineType}` : ''),
      style: `--dot:${meta.palette[entry.key]}`,
    });
    const node = el('li', { class: 'legend-item' }, [
      dot,
      el('span', { class: 'legend-label' }, [
        el('span', { class: 'legend-en lang-en', text: entry.label }),
        el('span', { class: 'legend-ja lang-ja', text: entry.labelJa }),
      ]),
    ]);
    return { key: entry.key, activeFrom: entry.activeFrom, node, dot };
  });

  const element = el('ul', { class: 'panel legend' }, items.map((item) => item.node));

  return {
    element,
    /**
     * Entries dim until their species is actually present, so the legend acts as
     * a second read-out of the progression. Each scene declares its own
     * thresholds in `data/`; anything without one is always shown.
     */
    update(progress) {
      for (const item of items) {
        item.node.classList.toggle('is-active', progress >= (item.activeFrom ?? 0));
      }
    },
    setPalette(palette) {
      for (const item of items) {
        if (palette?.[item.key]) item.dot.style.setProperty('--dot', palette[item.key]);
      }
    },
  };
}
