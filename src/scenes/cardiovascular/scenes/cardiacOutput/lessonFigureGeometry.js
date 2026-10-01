import { CONTROL_DOMAIN } from '../../../../models/cardiacOutput.js';
import { clamp } from '../../../../utils/math.js';
import { bedCalibreFor } from './drawingScales.js';

/**
 * The introductory lesson's figure, as numbers: where every part stands and how
 * each solved value becomes a length, an angle or a width.
 *
 * ## What the figure is
 *
 * A circuit, not an anatomy (owner's review, 2026-10-01): the question is how
 * three things relate — **what the heart sends out per minute, how hard it is
 * for blood to get through the small vessels of the whole body, and the
 * average blood pressure** — and a reader who has to work out which red shape
 * is which before reading any of them has been given the wrong picture. So one
 * circulation is one strip:
 *
 *   ┌ name ──────────────────────────── vessels' label ┐
 *   │  ♥ ══ artery ═══════════════════════╦╦╦╦╦╦       │
 *   │  heart     ◔ dial   label           ║║║║║║ small │
 *   │  ══════════ vein ═══════════════════╩╩╩╩╩╩ vessels
 *   │  sent out per minute [▓▓▓▓▓▓▓▓▓░░░░░░░] tube     │
 *   └───────────────────────────────────────────────────┘
 *
 * - **What the heart sends out per minute** is the filled length of a tube
 *   along the bottom, on one 0–6 L scale for every strip, from one left edge —
 *   so two strips one above the other compare like two bars on one axis.
 * - **How hard it is for blood to get through** is the width of the channels
 *   on the right: six of them, every one narrowed by the same amount along its
 *   whole length. Never fewer channels and never one narrowed place — the
 *   action is on all the small vessels of the body at once.
 * - **The average blood pressure** is a needle on a 0–150 mmHg dial on the
 *   artery.
 *
 * ## One size
 *
 * The figure is one fixed box (`FIGURE`) the page scales as a whole, and it is
 * always two strips tall, whether one circulation is shown or two. Nothing in
 * it is fitted to what is on screen: the heart and the dial are the same size
 * at A, at B and beside C, and B and C are drawn to one scale. The main
 * circulation always stands in the upper place and never moves; the lower
 * place holds **how to read the figure** (`LEGEND`) until C takes it — so a
 * first-time reader is told what the width, the needle and the tube mean
 * before there is a second circulation to compare, without reading a caption
 * (owner's review, 2026-10-01).
 *
 * Pure: no `three`, no DOM.
 */

/** The whole figure, in its own units: always room for two strips. */
export const FIGURE = Object.freeze({ width: 340, height: 248 });

/** One circulation. */
export const STRIP = Object.freeze({ width: 340, height: 120, gap: 8 });

/**
 * The smallest text in the figure, in figure units. The figure is drawn at
 * about one unit to one pixel on a 375 px phone, and the product's floor is
 * 12 px (`tests/type-floor.test.js`), so nothing in it is smaller.
 */
export const TEXT_FLOOR = 12;

/** The pipes: the artery along the top, the vein along the bottom, back to the heart. */
export const PIPES = Object.freeze({ arteryY: 26, veinY: 94, width: 6, right: 331 });

/** The heart: a pump glyph where both pipes meet it. */
export const HEART = Object.freeze({ x: 27, y: 60, halfWidth: 21, top: 41, bottom: 80 });

/**
 * The small vessels of the whole body: six channels between the artery and the
 * vein. `outer` is the channel's wall; the lumen inside it is what narrows.
 */
export const BED = Object.freeze({
  left: 254,
  right: 336,
  channels: 6,
  firstX: 262,
  lastX: 328,
  top: PIPES.arteryY + PIPES.width / 2,
  bottom: PIPES.veinY - PIPES.width / 2,
  outer: 9,
  /** Lumen width for a calibre of 1 (`bedCalibreFor`). */
  lumenPerCalibre: 6,
  /** The lumen never fills its wall: a sliver of wall always shows. */
  minWall: 0.6,
});

/** The dial on the artery: 0 mmHg points left, `maxMmHg` right. */
export const DIAL = Object.freeze({ x: 116, y: 64, radius: 22, needle: 18, maxMmHg: 150, tickEvery: 30 });

/** The tube: the litres the heart sends out per minute, from one left edge. */
export const TUBE = Object.freeze({ left: 112, right: 336, top: 102, height: 14, maxLitres: 6 });

/** The x of each channel's centre line. */
export function channelXs() {
  const step = (BED.lastX - BED.firstX) / (BED.channels - 1);
  return Array.from({ length: BED.channels }, (_, i) => BED.firstX + step * i);
}

/**
 * The lumen of every channel for a systemic resistance, in figure units. One
 * width for all six: the action narrows them all alike.
 *
 * @param {number} resistance mmHg·s/mL
 */
export function lumenWidth(resistance) {
  const width = bedCalibreFor(resistance, CONTROL_DOMAIN.systemicResistanceMmHgSPerMl) * BED.lumenPerCalibre;
  return Math.min(width, BED.outer - 2 * BED.minWall);
}

/**
 * The needle's angle for an average pressure, in radians from the positive x
 * axis with y up: π at 0 mmHg, 0 at the dial's maximum.
 *
 * @param {number} mmHg
 */
export function needleAngle(mmHg) {
  return Math.PI * (1 - clamp(mmHg / DIAL.maxMmHg));
}

/**
 * Where the needle's tip stands, in strip units (y down, as drawn).
 *
 * @param {number} mmHg
 * @param {number} [length]
 */
export function needleTip(mmHg, length = DIAL.needle) {
  const angle = needleAngle(mmHg);
  return { x: DIAL.x + Math.cos(angle) * length, y: DIAL.y - Math.sin(angle) * length };
}

/** Figure units per litre per minute, on the tube's one scale. */
export const UNITS_PER_LITRE = (TUBE.right - TUBE.left) / TUBE.maxLitres;

/**
 * The filled length of the tube for an output, in figure units.
 *
 * @param {number} litresPerMinute
 */
export function tubeLength(litresPerMinute) {
  return clamp(litresPerMinute / TUBE.maxLitres) * (TUBE.right - TUBE.left);
}

/**
 * Where each strip stands: the main circulation in the upper place, C in the
 * lower. Fixed — a strip never moves or changes size because another arrived.
 */
export const STRIP_TOPS = Object.freeze([0, STRIP.height + STRIP.gap]);

/** How to read the figure: in the lower place while it has no second circulation. */
export const LEGEND = Object.freeze({ top: STRIP.height + STRIP.gap, rows: [33, 66, 92], textX: 44 });

/**
 * The drawn quantities for one solved circulation — and, while B stands alone,
 * for A as its cream "start" marks.
 *
 * @param {{ metrics: object }} result the solver's result
 * @param {{ metrics: object } | null} [reference] A, while it is the comparison
 */
export function circulationDrawing(result, reference = null) {
  const m = result.metrics;
  return {
    lumen: lumenWidth(m.systemicResistanceMmHgSPerMl),
    needleAngle: needleAngle(m.meanArterialPressureMmHg),
    tube: tubeLength(m.cardiacOutputLMin),
    before: reference
      ? {
          needleAngle: needleAngle(reference.metrics.meanArterialPressureMmHg),
          tube: tubeLength(reference.metrics.cardiacOutputLMin),
        }
      : null,
  };
}

/**
 * The heart's squeeze at a phase of the beat: 0 at rest, 1 at its tightest.
 * Presentation: one clock for every heart on screen, so two circulations at one
 * rate (`lessonClaimProblems` holds that) are always at the same moment.
 *
 * @param {number} phase 0…1
 */
export function squeezeAt(phase) {
  const p = ((phase % 1) + 1) % 1;
  // Ejection over the first third of the cycle, a smooth rise and fall.
  return p < 0.34 ? Math.sin((p / 0.34) * Math.PI) : 0;
}

/**
 * The heart glyph's outline, centred on `HEART`, for a scale about its centre.
 *
 * @param {number} [scale]
 */
export function heartPath(scale = 1) {
  const { x, y } = HEART;
  const w = HEART.halfWidth * scale;
  const top = (HEART.top - y) * scale;
  const bottom = (HEART.bottom - y) * scale;
  const notch = top + 6 * scale;
  const f = (n) => n.toFixed(2);
  return [
    `M ${f(x)} ${f(y + bottom)}`,
    `C ${f(x - w * 0.55)} ${f(y + bottom * 0.62)} ${f(x - w * 1.05)} ${f(y + bottom * 0.2)} ${f(x - w)} ${f(y + top * 0.35)}`,
    `C ${f(x - w * 0.98)} ${f(y + top * 1.05)} ${f(x - w * 0.2)} ${f(y + top * 1.1)} ${f(x)} ${f(y + notch)}`,
    `C ${f(x + w * 0.2)} ${f(y + top * 1.1)} ${f(x + w * 0.98)} ${f(y + top * 1.05)} ${f(x + w)} ${f(y + top * 0.35)}`,
    `C ${f(x + w * 1.05)} ${f(y + bottom * 0.2)} ${f(x + w * 0.55)} ${f(y + bottom * 0.62)} ${f(x)} ${f(y + bottom)}`,
    'Z',
  ].join(' ');
}
