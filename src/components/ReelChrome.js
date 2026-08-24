import { el } from '../utils/dom.js';

/**
 * The only controls visible during the sequence.
 *
 * Pinned to the viewport rather than to the video frame, so on most screens it
 * sits on the letterbox area *outside* what gets recorded. A screen recording
 * of the frame itself therefore contains no application chrome at all.
 */
export function createReelChrome({ formats, currentFormatId, onFormat, onRestart, onExit }) {
  const chips = formats.map((format) =>
    el('button', {
      class: `reel-chip${format.id === currentFormatId ? ' is-current' : ''}`,
      type: 'button',
      title: `${format.width} × ${format.height}`,
      text: format.label,
      on: { click: () => onFormat(format.id) },
    })
  );

  const element = el('div', { class: 'reel-chrome' }, [
    el('div', { class: 'reel-chip-row' }, chips),
    el('button', { class: 'reel-chip', type: 'button', text: '↻', title: 'Restart', on: { click: onRestart } }),
    el('button', { class: 'reel-chip is-exit', type: 'button', text: 'Exit (Esc)', on: { click: onExit } }),
  ]);

  return {
    element,
    setFormat(id) {
      chips.forEach((chip, index) => chip.classList.toggle('is-current', formats[index].id === id));
    },
  };
}
