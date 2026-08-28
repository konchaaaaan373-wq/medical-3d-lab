/**
 * Timing shapes shared by the prototype scenes.
 *
 * These describe *when* something moves, not how much of anything there is:
 * they are presentation timing, and none of them is a physiological
 * measurement. A scene that needs a real time course solves a model for it —
 * `src/scenes/cardiovascular/scenes/heartFailure/hemodynamics.js` is what that
 * looks like.
 */

/**
 * One breathing cycle as a 0..1 envelope, 0 at end-expiration.
 *
 * Deliberately asymmetric: inspiration is shorter than expiration, which is the
 * one thing about the shape of quiet breathing that is obvious to look at.
 *
 * @param {number} elapsed seconds
 * @param {number} [breathsPerMinute]
 */
export function breathCycle(elapsed, breathsPerMinute = 14) {
  const period = 60 / breathsPerMinute;
  const phase = (elapsed % period) / period;
  const inspiratoryFraction = 0.42;
  if (phase < inspiratoryFraction) {
    const t = phase / inspiratoryFraction;
    return 0.5 - 0.5 * Math.cos(Math.PI * t);
  }
  const t = (phase - inspiratoryFraction) / (1 - inspiratoryFraction);
  return 0.5 + 0.5 * Math.cos(Math.PI * t);
}

/**
 * A travelling constriction: 1 at the wave, 0 away from it.
 *
 * `u` is the position along a tube (0..1) and `phase` is where the wave
 * currently is. With `count` above 1 the pattern repeats — segmentation rather
 * than a single propulsive wave.
 *
 * @param {number} u
 * @param {number} phase
 * @param {{ width?: number, count?: number }} [options]
 */
export function travellingWave(u, phase, { width = 0.09, count = 1 } = {}) {
  let peak = 0;
  for (let i = 0; i < count; i++) {
    // Wrapped distance, so a wave leaving the far end reappears at the near one
    // without a jump.
    let d = (u - phase - i / count) % 1;
    if (d < -0.5) d += 1;
    if (d > 0.5) d -= 1;
    peak = Math.max(peak, Math.exp(-(d * d) / (width * width)));
  }
  return peak;
}

/** A simple 0..1 sine oscillation at `rate` cycles per second. */
export function oscillate(elapsed, rate = 1, phase = 0) {
  return 0.5 - 0.5 * Math.cos((elapsed * rate + phase) * Math.PI * 2);
}
