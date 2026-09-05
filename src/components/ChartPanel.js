import { el } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';

/**
 * A plot of whatever a scene's model produced.
 *
 * The pressure-volume panel is a plot of one thing and knows what it is
 * plotting. This is the general case, for the scenes that came after: a lung
 * emptying, a distribution of ventilation across a hundred units, a pressure
 * dropping along a vascular pathway. The panel owns axes, scaling, the
 * device-pixel dance and the redraw; the scene owns what the numbers are and
 * what they mean.
 *
 * What it will not do is invent data. Every point drawn here came out of
 * `src/models/`. There is no smoothing, no interpolation between "key frames",
 * and no series the model did not produce — a chart is the model showing its
 * working, and a chart that flatters the model is worse than no chart.
 *
 * The static half of a chart — its title, its axes, its key — is declared in
 * `src/data/` beside the rest of the scene's copy. Only the numbers arrive per
 * frame.
 *
 * ### Spec (static)
 * ```
 * { id, title, titleJa, unitLabel?,
 *   x: { label, labelJa, unit, min?, max?, ticks?, invert? },
 *   y: { label, labelJa, unit, min?, max?, ticks? },
 *   key?: [{ id, label, labelJa, color, dash?: boolean }],
 *   height?: number }
 * ```
 *
 * ### Data (per frame)
 * ```
 * { x?: { min, max }, y?: { min, max },
 *   series?: [{ id, color, points: [{x,y}], width?, dash?: number[], closed?, fill?, alpha? }],
 *   bars?:   [{ id?, color, x0, x1, y, alpha? }],
 *   bands?:  [{ axis: 'x'|'y', from, to, color }],
 *   rules?:  [{ axis: 'x'|'y', at, color, dash?: number[], label?, labelJa? }],
 *   markers?:[{ x, y, color, radius?, label?, labelJa? }],
 *   note?:   { text, textJa } }
 * ```
 *
 * @param {object} spec
 */
export function createChartPanel(spec) {
  const canvas = el('canvas', { class: 'chart-canvas' });
  if (spec.height) canvas.style.height = `${spec.height}px`;
  const context = canvas.getContext('2d');

  const element = el('div', { class: 'panel chart', 'data-chart': spec.id }, [
    el('div', { class: 'chart-head' }, [
      el('span', { class: 'lang-en', text: headingOf(spec, false) }),
      el('span', { class: 'lang-ja', text: headingOf(spec, true) }),
    ]),
    canvas,
    spec.key?.length
      ? el(
          'div',
          { class: 'chart-key' },
          spec.key.map((entry) =>
            el('span', { class: `chart-key-item${entry.dash ? ' is-dashed' : ''}`, style: `--key:${entry.color}` }, [
              el('span', { class: 'lang-en', text: entry.label }),
              el('span', { class: 'lang-ja', text: entry.labelJa }),
            ])
          )
        )
      : null,
  ]);

  let data = null;
  let cssWidth = 0;
  let cssHeight = 0;

  /** Backing store follows devicePixelRatio, so hairlines stay hairlines. */
  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
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

    const padding = { left: 30, right: 8, top: 8, bottom: 17 };
    const width = cssWidth - padding.left - padding.right;
    const height = cssHeight - padding.top - padding.bottom;
    if (width <= 0 || height <= 0) return;

    // The axis range comes from the spec when the scene fixed it, and from the
    // data when it did not. A fixed axis is usually what teaching wants: an
    // auto-scaled y makes a doubling and a 5% rise look identical, which is
    // exactly the misreading a chart is supposed to prevent.
    const xRange = rangeFor(spec.x, data.x, data, 'x');
    const yRange = rangeFor(spec.y, data.y, data, 'y');

    const x = (value) => {
      const t = (value - xRange.min) / (xRange.max - xRange.min || 1);
      return padding.left + (spec.x?.invert ? 1 - t : t) * width;
    };
    const y = (value) =>
      padding.top + height - ((value - yRange.min) / (yRange.max - yRange.min || 1)) * height;

    context.clearRect(0, 0, cssWidth, cssHeight);

    for (const band of data.bands ?? []) drawBand(context, band, { x, y, padding, width, height });
    drawAxes(context, { padding, width, height, xRange, yRange, x, y, spec });
    for (const rule of data.rules ?? []) drawRule(context, rule, { x, y, padding, width, height });
    for (const bar of data.bars ?? []) drawBar(context, bar, { x, y, padding, height });
    for (const series of data.series ?? []) drawSeries(context, series, x, y, padding, height);
    for (const marker of data.markers ?? []) drawMarker(context, marker, x, y);

    if (data.note) {
      const text = inLanguage(data.note.text, data.note.textJa);
      if (text) {
        context.font = '600 9px system-ui, sans-serif';
        context.textAlign = 'right';
        context.textBaseline = 'top';
        context.fillStyle = 'rgba(255, 255, 255, 0.62)';
        context.fillText(text, padding.left + width, padding.top + 1);
      }
    }
  }

  return {
    element,
    id: spec.id,
    /** @param {object} next per-frame chart data */
    update(next) {
      data = next;
      draw();
    },
    resize() {
      resize();
      draw();
    },
    /**
     * Presentation only: a lesson or a story step naming this chart as the one
     * to look at. Changes nothing about what is plotted.
     */
    setFocused(focused) {
      element.classList.toggle('is-focused', Boolean(focused));
    },
  };
}

/**
 * The panel heading.
 *
 * A chart declares `unitLabel` when joining its two axes' units with a slash
 * would read as a single compound unit — "lung volume · L / s" says litres per
 * second, which is not what is plotted on either axis.
 */
const headingOf = (spec, ja) => {
  const title = ja ? spec.titleJa : spec.title;
  const units = spec.unitLabel ?? [spec.y?.unit, spec.x?.unit].filter(Boolean).join(' / ');
  return units ? `${title} · ${units}` : title;
};

/**
 * A drawing range for one axis.
 *
 * Priority: what the scene sent this frame, then what the spec fixed, then the
 * data's own extent padded out. Fixed ranges are preferred because a moving
 * axis hides the very change the chart exists to show.
 */
function rangeFor(axis, sent, data, key) {
  const min = sent?.min ?? axis?.min;
  const max = sent?.max ?? axis?.max;
  if (min != null && max != null) return { min, max };

  const values = [];
  for (const series of data.series ?? []) for (const point of series.points) values.push(point[key]);
  for (const marker of data.markers ?? []) values.push(marker[key]);
  for (const bar of data.bars ?? []) {
    // Bars are drawn from the baseline up, so their extent along y includes 0.
    if (key === 'x') values.push(bar.x0, bar.x1);
    else values.push(0, bar.y);
  }
  if (!values.length) return { min: min ?? 0, max: max ?? 1 };

  const low = Math.min(...values);
  const high = Math.max(...values);
  const pad = (high - low) * 0.08 || Math.abs(high) * 0.08 || 1;
  return { min: min ?? Math.min(0, low - pad), max: max ?? high + pad };
}

function drawAxes(context, { padding, width, height, xRange, yRange, x, y, spec }) {
  context.strokeStyle = 'rgba(255, 255, 255, 0.16)';
  context.lineWidth = 1;
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(padding.left, padding.top);
  context.lineTo(padding.left, padding.top + height);
  context.lineTo(padding.left + width, padding.top + height);
  context.stroke();

  // A zero line inside the plot, when zero is inside the plot. Without it a
  // flow-volume loop's inspiratory half looks like a second expiratory one.
  if (yRange.min < 0 && yRange.max > 0) {
    context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    context.beginPath();
    context.moveTo(padding.left, y(0));
    context.lineTo(padding.left + width, y(0));
    context.stroke();
  }

  context.fillStyle = 'rgba(255, 255, 255, 0.45)';
  context.font = '9px system-ui, sans-serif';
  context.textAlign = 'right';
  context.textBaseline = 'middle';
  for (const value of spec.y?.ticks ?? [yRange.min, (yRange.min + yRange.max) / 2, yRange.max]) {
    if (value < yRange.min || value > yRange.max) continue;
    context.fillText(tickText(value), padding.left - 4, y(value));
  }

  context.textBaseline = 'top';
  const xTicks = spec.x?.ticks ?? [xRange.min, xRange.max];
  xTicks.forEach((value, index) => {
    if (value < xRange.min || value > xRange.max) return;
    context.textAlign = index === 0 ? 'left' : index === xTicks.length - 1 ? 'right' : 'center';
    context.fillText(tickText(value), x(value), padding.top + height + 3);
  });
}

/** Enough digits to tell two ticks apart, and no more. */
function tickText(value) {
  const magnitude = Math.abs(value);
  if (magnitude === 0) return '0';
  if (magnitude >= 100) return String(Math.round(value));
  if (magnitude >= 10) return value.toFixed(0);
  if (magnitude >= 1) return value.toFixed(1);
  return value.toFixed(2);
}

function drawBand(context, band, { x, y, padding, width, height }) {
  context.fillStyle = band.color;
  if (band.axis === 'y') {
    const top = y(band.to);
    context.fillRect(padding.left, top, width, y(band.from) - top);
  } else {
    const left = Math.min(x(band.from), x(band.to));
    context.fillRect(left, padding.top, Math.abs(x(band.to) - x(band.from)), height);
  }
}

function drawRule(context, rule, { x, y, padding, width, height }) {
  context.save();
  context.strokeStyle = rule.color;
  context.lineWidth = 1;
  context.setLineDash(rule.dash ?? [3, 3]);
  context.beginPath();
  if (rule.axis === 'y') {
    context.moveTo(padding.left, y(rule.at));
    context.lineTo(padding.left + width, y(rule.at));
  } else {
    context.moveTo(x(rule.at), padding.top);
    context.lineTo(x(rule.at), padding.top + height);
  }
  context.stroke();

  const text = inLanguage(rule.label, rule.labelJa);
  if (text) {
    context.setLineDash([]);
    context.font = '600 9px system-ui, sans-serif';
    context.fillStyle = rule.color;
    if (rule.axis === 'y') {
      context.textAlign = 'left';
      context.textBaseline = 'bottom';
      context.fillText(text, padding.left + 3, y(rule.at) - 2);
    } else {
      context.textAlign = 'left';
      context.textBaseline = 'top';
      context.fillText(text, x(rule.at) + 3, padding.top + 1);
    }
  }
  context.restore();
}

function drawBar(context, bar, { x, y, padding, height }) {
  const left = Math.min(x(bar.x0), x(bar.x1));
  const right = Math.max(x(bar.x0), x(bar.x1));
  const top = y(bar.y);
  const base = padding.top + height;
  context.save();
  context.globalAlpha = bar.alpha ?? 1;
  context.fillStyle = bar.color;
  // At least a pixel: a bin with a small but non-zero count still exists, and
  // rounding it away turns "rare" into "none".
  context.fillRect(left, top, Math.max(1, right - left - 1), Math.max(1, base - top));
  context.restore();
}

function drawSeries(context, series, x, y, padding, height) {
  if (!series.points?.length) return;
  context.save();
  context.globalAlpha = series.alpha ?? 1;

  if (series.fill) {
    context.fillStyle = series.fill;
    context.beginPath();
    context.moveTo(x(series.points[0].x), padding.top + height);
    for (const point of series.points) context.lineTo(x(point.x), y(point.y));
    context.lineTo(x(series.points[series.points.length - 1].x), padding.top + height);
    context.closePath();
    context.fill();
  }

  context.strokeStyle = series.color;
  context.lineWidth = series.width ?? 1.6;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.setLineDash(series.dash ?? []);
  context.beginPath();
  series.points.forEach((point, index) => {
    const px = x(point.x);
    const py = y(point.y);
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  });
  if (series.closed) context.closePath();
  context.stroke();
  context.restore();
}

function drawMarker(context, marker, x, y) {
  context.save();
  context.fillStyle = marker.color;
  context.beginPath();
  context.arc(x(marker.x), y(marker.y), marker.radius ?? 3, 0, Math.PI * 2);
  context.fill();
  const text = inLanguage(marker.label, marker.labelJa);
  if (text) {
    context.font = '600 9px system-ui, sans-serif';
    context.textAlign = 'left';
    context.textBaseline = 'bottom';
    context.fillText(text, x(marker.x) + 5, y(marker.y) - 3);
  }
  context.restore();
}
