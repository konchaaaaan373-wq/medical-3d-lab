import { el } from '../utils/dom.js';
import { drawPhaseName } from './plotPhaseName.js';

/**
 * The solved beat plotted against time: ventricular, arterial and atrial
 * pressure on one axis.
 *
 * The loop panel shows what the ventricle did; this shows why it did it. The
 * aortic valve opens where the ventricular trace crosses the arterial one and
 * closes where it falls back through it, so the isovolumic periods are visible
 * as the gaps at either end of the shaded ejection band. In the simulated HFrEF
 * state the band starts later than in the simulated normal one and the atrial
 * line sits higher — consequences of these particular parameters, not a claim
 * about what HFrEF does in general.
 *
 * Fed by the same `getPressureVolume()` result as the loop panel, so the two
 * can never disagree about the beat they are showing.
 */
export function createPressureWavePanel({ title, titleJa }) {
  const canvas = el('canvas', { class: 'wave-canvas' });
  const context = canvas.getContext('2d');
  const element = el('div', { class: 'panel wave' }, [
    el('div', { class: 'wave-head' }, [
      el('span', { class: 'lang-en', text: `${title} · mmHg` }),
      el('span', { class: 'lang-ja', text: `${titleJa} · mmHg` }),
    ]),
    canvas,
    el('div', { class: 'wave-key' }, [
      keyItem('wave-key-lv', 'LV', '左室'),
      keyItem('wave-key-ao', 'Aorta', '大動脈'),
      keyItem('wave-key-la', 'LA', '左房'),
      keyItem('wave-key-ejection', 'Ejection', '駆出'),
    ]),
  ]);

  let data = null;
  let cssWidth = 0;
  let cssHeight = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cssWidth = rect.width;
    cssHeight = rect.height;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  function draw() {
    if (!data) return;
    if (!cssWidth && !resize()) return;

    const padding = { left: 26, right: 6, top: 6, bottom: 15 };
    const plotWidth = cssWidth - padding.left - padding.right;
    const plotHeight = cssHeight - padding.top - padding.bottom;
    if (plotWidth <= 0 || plotHeight <= 0) return;

    // Comparison shares one pressure axis, so the healthy and failing traces are
    // read against each other rather than each filling the box.
    const sets = [data.current, data.reference].filter(Boolean).map((set) => set.waveform);
    const peak = Math.max(...sets.flatMap((w) => w.ventricular.concat(w.arterial)));
    const maxPressure = niceCeiling(peak * 1.08, 20);

    const x = (phase) => padding.left + phase * plotWidth;
    const y = (pressure) => padding.top + plotHeight - (Math.max(pressure, 0) / maxPressure) * plotHeight;

    context.clearRect(0, 0, cssWidth, cssHeight);

    // The band goes down before any trace, so nothing is painted over.
    drawEjectionBand(context, data.current.waveform, x, plotHeight, padding);
    if (data.reference) drawTraces(context, data.reference.waveform, x, y, { muted: true });
    drawTraces(context, data.current.waveform, x, y, { muted: false });
    drawAxes(context, {
      padding,
      plotWidth,
      plotHeight,
      maxPressure,
      x,
      y,
      waveform: data.current.waveform,
      reference: data.reference?.waveform,
    });

    // Where in the beat the heart on screen currently is.
    const phase = data.phase - Math.floor(data.phase);
    context.strokeStyle = rgba(255, 217, 221, 0.55);
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x(phase), padding.top);
    context.lineTo(x(phase), padding.top + plotHeight);
    context.stroke();

    // The same name the loop panel shows, from the same `beat` — the two plots
    // and the 3D are one read of one model.
    if (data.beat) {
      drawPhaseName(context, data.beat, padding.left + plotWidth, padding.top);
    }
  }

  return {
    element,
    /** @param {object} next result of the scene's `getPressureVolume()` */
    update(next) {
      data = next;
      draw();
    },
    resize() {
      resize();
      draw();
    },
  };
}

/**
 * When the aortic valve is open, taken from the solved flows rather than from
 * where the two lines look like they meet. Only the current state's band is
 * drawn: two overlapping bands are less legible than one, and the reference
 * beat's ejection is readable from its own traces.
 */
function drawEjectionBand(context, waveform, x, plotHeight, padding) {
  const { from, to } = waveform.ejection;
  context.fillStyle = rgba(255, 150, 168, 0.09);
  context.fillRect(x(from), padding.top, x(to) - x(from), plotHeight);
}

function drawTraces(context, waveform, x, y, { muted }) {
  const alpha = muted ? 0.35 : 1;
  trace(context, waveform.phase, waveform.atrial, x, y, rgba(140, 190, 255, 0.75 * alpha), 1);
  trace(context, waveform.phase, waveform.arterial, x, y, rgba(255, 196, 140, 0.85 * alpha), 1.2);
  trace(context, waveform.phase, waveform.ventricular, x, y, rgba(255, 150, 168, 0.95 * alpha), muted ? 1.2 : 1.8);
}

function trace(context, phases, values, x, y, color, width) {
  context.strokeStyle = color;
  context.lineWidth = width;
  context.beginPath();
  for (let i = 0; i < phases.length; i++) {
    const px = x(phases[i]);
    const py = y(values[i]);
    if (i === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  // The beat is periodic, so the last sample joins back to the first.
  context.lineTo(x(1), y(values[0]));
  context.stroke();
}

function drawAxes(context, { padding, plotWidth, plotHeight, maxPressure, x, y, waveform, reference }) {
  context.strokeStyle = rgba(255, 255, 255, 0.16);
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(padding.left, padding.top);
  context.lineTo(padding.left, padding.top + plotHeight);
  context.lineTo(padding.left + plotWidth, padding.top + plotHeight);
  context.stroke();

  context.fillStyle = rgba(255, 255, 255, 0.45);
  context.font = '9px system-ui, sans-serif';
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  for (const pressure of [0, maxPressure / 2, maxPressure]) {
    context.fillText(String(Math.round(pressure)), padding.left - 4, y(pressure));
  }
  // The axis is one beat, not a fixed span of time: the two hearts in
  // comparison mode beat at different rates and the scene deliberately locks
  // their phase so the wall and the chamber can be compared. So the right edge
  // is labelled with how long that beat lasts — both beats when comparing,
  // in the same "normal → current" order the read-out uses.
  const seconds = (w) => w.cycleLengthSeconds.toFixed(2);
  const span = reference
    ? `${seconds(reference)} → ${seconds(waveform)} s`
    : `${seconds(waveform)} s`;
  context.textBaseline = 'top';
  context.textAlign = 'left';
  context.fillText('0', padding.left, padding.top + plotHeight + 3);
  context.textAlign = 'right';
  context.fillText(span, padding.left + plotWidth, padding.top + plotHeight + 3);
}

const niceCeiling = (value, step) => Math.ceil(value / step) * step;
const rgba = (r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${a})`;

function keyItem(className, label, labelJa) {
  return el('span', { class: `wave-key-item ${className}` }, [
    el('span', { class: 'lang-en', text: label }),
    el('span', { class: 'lang-ja', text: labelJa }),
  ]);
}
