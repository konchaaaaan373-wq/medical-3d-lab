import { el } from '../utils/dom.js';
import { drawPhaseName } from './plotPhaseName.js';

/**
 * The model's pressure-volume loop, drawn on a small canvas beside the view.
 *
 * Optional, like the metrics panel: a scene gets one only if it implements
 * `getPressureVolume()`. For the heart-failure scene this panel is the model
 * showing its working — the loop is the beat the circulation solver settled
 * into, and the two straight/curved relationships it touches are the equations
 * that produced it.
 *
 * Drawn with 2D canvas rather than SVG because it is redrawn on every frame to
 * move the marker around the loop.
 */
export function createPressureVolumePanel({ title, titleJa }) {
  const canvas = el('canvas', { class: 'pv-canvas' });
  const context = canvas.getContext('2d');
  const element = el('div', { class: 'panel pv' }, [
    el('div', { class: 'pv-head' }, [
      el('span', { class: 'lang-en', text: `${title} · mmHg / mL` }),
      el('span', { class: 'lang-ja', text: `${titleJa} · mmHg / mL` }),
    ]),
    canvas,
    el('div', { class: 'pv-key' }, [
      keyItem('pv-key-loop', 'Beat', '拍動'),
      keyItem('pv-key-espvr', 'ESPVR', '収縮末期'),
      keyItem('pv-key-edpvr', 'EDPVR', '拡張末期'),
    ]),
  ]);

  let data = null;
  let cssWidth = 0;
  let cssHeight = 0;

  /** Canvas backing store follows devicePixelRatio, so the lines stay crisp. */
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

    // Axes are shared with the reference loop when comparing, so the two are
    // read against the same scale rather than each filling the box.
    const sets = [data.current, data.reference].filter(Boolean);
    const volumes = sets.flatMap((set) => set.loop.map((point) => point.volume));
    const pressures = sets.flatMap((set) => set.loop.map((point) => point.pressure));
    const maxVolume = niceCeiling(Math.max(...volumes) * 1.08, 25);
    const maxPressure = niceCeiling(Math.max(...pressures) * 1.12, 20);

    const x = (volume) => padding.left + (volume / maxVolume) * plotWidth;
    const y = (pressure) => padding.top + plotHeight - (pressure / maxPressure) * plotHeight;

    context.clearRect(0, 0, cssWidth, cssHeight);
    drawAxes(context, { padding, plotWidth, plotHeight, maxVolume, maxPressure, x, y });

    if (data.reference) drawSet(context, data.reference, x, y, { muted: true });
    drawSet(context, data.current, x, y, { muted: false });

    // The leg of the loop being traversed right now, brightened over the rest.
    // Its bounds are the scene's solved valve times, the same ones the shaded
    // band on the waveform uses.
    if (data.beat) drawLeg(context, data.current.loop, data.beat, x, y);

    // Where in the beat the heart on screen currently is.
    const point = pointAtPhase(data.current.loop, data.phase);
    if (point) {
      context.fillStyle = '#ffd9dd';
      context.beginPath();
      context.arc(x(point.volume), y(point.pressure), 3, 0, Math.PI * 2);
      context.fill();
    }

    // Names the leg the marker is on, in the top-right — a corner of the plot
    // a pressure-volume loop never reaches.
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

function drawSet(context, set, x, y, { muted }) {
  const alpha = muted ? 0.4 : 1;

  context.setLineDash([3, 3]);
  context.lineWidth = 1;
  context.strokeStyle = rgba(230, 120, 140, 0.55 * alpha);
  trace(context, set.endSystolic, x, y);
  context.strokeStyle = rgba(140, 190, 255, 0.5 * alpha);
  trace(context, set.endDiastolic, x, y);
  context.setLineDash([]);

  context.lineWidth = muted ? 1.2 : 1.8;
  context.strokeStyle = muted ? rgba(200, 200, 215, 0.5) : rgba(255, 150, 168, 0.95);
  trace(context, set.loop, x, y, true);
}

/** Re-stroke the samples inside one phase window, brighter and heavier. */
function drawLeg(context, loop, beat, x, y) {
  const inside = loop.filter((point) => point.phase >= beat.from && point.phase <= beat.to);
  if (inside.length < 2) return;
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.strokeStyle = rgba(255, 217, 221, 0.95);
  trace(context, inside, x, y);
  context.lineCap = 'butt';
}

function trace(context, points, x, y, close = false) {
  context.beginPath();
  points.forEach((point, index) => {
    const px = x(point.volume);
    const py = y(point.pressure);
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  });
  if (close) context.closePath();
  context.stroke();
}

function drawAxes(context, { padding, plotWidth, plotHeight, maxVolume, maxPressure, x, y }) {
  context.strokeStyle = rgba(255, 255, 255, 0.16);
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(padding.left, padding.top);
  context.lineTo(padding.left, padding.top + plotHeight);
  context.lineTo(padding.left + plotWidth, padding.top + plotHeight);
  context.stroke();

  // Units live in the panel heading, so the axes only carry numbers.
  context.fillStyle = rgba(255, 255, 255, 0.45);
  context.font = '9px system-ui, sans-serif';
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  for (const pressure of [0, maxPressure / 2, maxPressure]) {
    context.fillText(String(Math.round(pressure)), padding.left - 4, y(pressure));
  }
  context.textBaseline = 'top';
  context.textAlign = 'left';
  context.fillText('0', padding.left, padding.top + plotHeight + 3);
  context.textAlign = 'right';
  context.fillText(String(Math.round(maxVolume)), padding.left + plotWidth, padding.top + plotHeight + 3);
}

/** Linear walk along the loop to the sample nearest a phase. */
function pointAtPhase(loop, phase) {
  if (!loop.length) return null;
  const wrapped = phase - Math.floor(phase);
  let best = loop[0];
  let bestDistance = Infinity;
  for (const point of loop) {
    const distance = Math.abs(point.phase - wrapped);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = point;
    }
  }
  return best;
}

const niceCeiling = (value, step) => Math.ceil(value / step) * step;
const rgba = (r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${a})`;

function keyItem(className, label, labelJa) {
  return el('span', { class: `pv-key-item ${className}` }, [
    el('span', { class: 'lang-en', text: label }),
    el('span', { class: 'lang-ja', text: labelJa }),
  ]);
}
