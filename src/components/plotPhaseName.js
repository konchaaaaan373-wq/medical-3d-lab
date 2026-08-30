import { inLanguage } from '../utils/language.js';

/**
 * Names the part of the beat a plot's cursor is currently on.
 *
 * Shared by the loop and the waveform so the two can never put different words
 * on the same moment — and the words themselves come from the scene, computed
 * from the same phase and the same solved valve times the 3D is drawn from.
 *
 * Drawn on the canvas rather than in the panel heading: it belongs next to the
 * marker it describes, the top-right corner of both plots is empty, and it then
 * survives into a PNG capture along with the rest of the plot.
 *
 * @param {CanvasRenderingContext2D} context
 * @param {{short: string, shortJa: string}} beat
 * @param {number} right right edge of the plot area, px
 * @param {number} top top edge of the plot area, px
 */
export function drawPhaseName(context, beat, right, top) {
  const text = inLanguage(beat.short, beat.shortJa);
  if (!text) return;
  context.save();
  context.font = '600 9px system-ui, sans-serif';
  context.textAlign = 'right';
  context.textBaseline = 'top';
  context.fillStyle = 'rgba(255, 217, 221, 0.72)';
  context.fillText(text.toUpperCase(), right, top + 1);
  context.restore();
}
