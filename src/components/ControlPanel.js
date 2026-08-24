import { el, ICONS } from '../utils/dom.js';

/**
 * Progression slider + transport buttons + the educational disclaimer.
 *
 * @param {{
 *   meta: any,
 *   onSeek: (value: number) => void,
 *   onToggle: () => void,
 *   onReset: () => void,
 *   onResetView: () => void,
 *   onCapture: () => void,
 * }} options
 */
export function createControlPanel({ meta, onSeek, onToggle, onReset, onResetView, onCapture }) {
  const slider = el('input', {
    class: 'slider',
    type: 'range',
    min: '0',
    max: '1000',
    step: '1',
    value: '0',
    'aria-label': 'Disease progression',
    on: { input: (event) => onSeek(Number(event.target.value) / 1000) },
  });

  const playButton = button('play', 'Play', onToggle, 'primary');
  const element = el('div', { class: 'controls' }, [
    el('div', { class: 'slider-row' }, [
      el('span', { class: 'slider-cap', text: 'Normal' }),
      slider,
      el('span', { class: 'slider-cap', text: 'Plaque' }),
    ]),
    el('div', { class: 'button-row' }, [
      playButton.element,
      button('reset', 'Reset', onReset).element,
      button('frame', 'View', onResetView).element,
      button('camera', 'PNG', onCapture).element,
    ]),
    el('p', { class: 'disclaimer' }, [
      el('span', { text: `⚠︎ ${meta.disclaimerJa}` }),
      el('span', { class: 'disclaimer-en', text: meta.disclaimer }),
    ]),
  ]);

  return {
    element,
    update(progress, playing) {
      // Do not fight the user while they are dragging the handle.
      if (document.activeElement !== slider) slider.value = String(Math.round(progress * 1000));
      playButton.setIcon(playing ? 'pause' : 'play');
      playButton.setLabel(playing ? 'Pause' : 'Play');
    },
  };
}

function button(iconName, label, onClick, variant = '') {
  const iconSpan = el('span', { class: 'btn-icon', html: ICONS[iconName] });
  const labelSpan = el('span', { class: 'btn-label', text: label });
  const element = el(
    'button',
    { class: `btn ${variant}`.trim(), type: 'button', title: label, on: { click: onClick } },
    [iconSpan, labelSpan]
  );
  return {
    element,
    setIcon: (name) => {
      iconSpan.innerHTML = ICONS[name];
    },
    setLabel: (text) => {
      labelSpan.textContent = text;
      element.title = text;
    },
  };
}
