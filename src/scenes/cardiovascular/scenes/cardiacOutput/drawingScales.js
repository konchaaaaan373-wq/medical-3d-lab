import { clamp, lerp } from '../../../../utils/math.js';

/**
 * Drawing scales shared by the full model's circuit (`circuit.js`) and the
 * introductory lesson's figure (`lessonFigureGeometry.js`), so the two draw
 * one resistance at one width.
 *
 * Pure: no `three`, no DOM.
 */

/**
 * How wide the small vessels are drawn for a systemic resistance, as a
 * multiple of their resting calibre.
 *
 * Poiseuille would make the radius go as the fourth root of 1/R — a narrowing
 * too small to see across this range — so the calibre is a drawing scale over
 * the control's range, labelled as such; its direction and its order are the
 * model's. It shows **how easily blood gets through**, not how much a vessel's
 * diameter changes, and both screens say so.
 *
 * @param {number} resistance mmHg·s/mL
 * @param {{ min: number, max: number }} domain the control's range
 */
export function bedCalibreFor(resistance, domain) {
  return lerp(1.5, 0.45, clamp((resistance - domain.min) / (domain.max - domain.min)));
}
