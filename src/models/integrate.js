/**
 * Fixed-timestep integration, so that physiology does not depend on frame rate.
 *
 * A model advanced by whatever `dt` the browser happened to hand over is a
 * model whose answer changes on a slower machine, in a background tab, or on a
 * 120 Hz display. For a scene whose whole subject is *how much a lung empties
 * in the time available*, that is not a rounding error — it is the physiology
 * being decided by the display.
 *
 * The pattern here is the standard accumulator: real time goes in, a whole
 * number of identical steps comes out, and the remainder is carried to the next
 * frame. `alpha` is what is left over, for a scene that wants to interpolate
 * the drawn state between two solved ones.
 *
 * Pure: no Three.js, no clock of its own. The caller supplies the elapsed time.
 */

/**
 * @param {{ hz?: number, maxCatchUp?: number }} [options]
 *   `hz` is the solver rate; `maxCatchUp` caps how much real time one call may
 *   consume, so that a tab returning from the background replays a fraction of
 *   a second rather than ten minutes of breathing in one frame.
 */
export function createStepper({ hz = 200, maxCatchUp = 0.25 } = {}) {
  if (!(hz > 0)) throw new Error('createStepper: hz must be positive');
  const h = 1 / hz;
  let accumulator = 0;

  return {
    /** The solver's step, in seconds. Constant for the life of the stepper. */
    get stepSeconds() {
      return h;
    },
    /**
     * How far into the next step the leftover time reaches, 0..1. A scene that
     * draws state solved at step boundaries can use it to interpolate; one that
     * does not can ignore it.
     */
    get alpha() {
      return accumulator / h;
    },
    /**
     * Advances by `dt` seconds of real time, calling `step(h)` once per fixed
     * step.
     *
     * @param {number} dt seconds since the last call
     * @param {(h: number) => void} step
     * @returns {number} how many steps were taken
     */
    advance(dt, step) {
      if (!Number.isFinite(dt) || dt <= 0) return 0;
      accumulator += Math.min(dt, maxCatchUp);
      // Counted, not drained in a loop. Sixty additions of 1/60 come to a hair
      // less than one in binary floating point, so a `while (acc >= h)` drops a
      // step every second — a lung that empties 1% less than it should, for a
      // reason that has nothing to do with lungs. The tolerance is what stops
      // that hair from mattering.
      const steps = Math.max(0, Math.floor(accumulator / h + 1e-9));
      for (let i = 0; i < steps; i++) step(h);
      accumulator = Math.max(0, accumulator - steps * h);
      return steps;
    },
    reset() {
      accumulator = 0;
    },
  };
}

/**
 * Runs a model forward for a fixed span at a fixed step, with no clock at all.
 *
 * This is how a model is asked "where does this settle?" — for a solved steady
 * state, for a test, or for a trace to plot. Nothing about it is per-frame.
 *
 * @template T
 * @param {{ seconds: number, hz?: number, step: (h: number, elapsed: number) => void,
 *           sample?: (elapsed: number) => T, sampleHz?: number }} options
 * @returns {T[]} whatever `sample` returned, or an empty array without one
 */
export function run({ seconds, hz = 200, step, sample, sampleHz = hz }) {
  const h = 1 / hz;
  const total = Math.max(0, Math.round(seconds * hz));
  const every = Math.max(1, Math.round(hz / sampleHz));
  const samples = [];
  for (let i = 0; i < total; i++) {
    const elapsed = i * h;
    if (sample && i % every === 0) samples.push(sample(elapsed));
    step(h, elapsed);
  }
  if (sample) samples.push(sample(total * h));
  return samples;
}

/**
 * Solves for a fixed point by damped iteration.
 *
 * Several of these models are circular by nature rather than by construction —
 * narrowing an airway reduces the ventilation of what is beyond it, which
 * reduces the stretch holding that airway open, which narrows it further. The
 * honest way to answer "where does that end up?" is to iterate it to a fixed
 * point, with damping so a genuinely bistable system settles instead of
 * oscillating between two answers forever.
 *
 * The result reports whether it converged; a caller that gets `false` is
 * looking at an unsettled system and should say so rather than quoting the
 * last iterate as an answer.
 *
 * @template T
 * @param {{ initial: T, next: (current: T) => T, blend: (a: T, b: T, t: number) => T,
 *           distance: (a: T, b: T) => number, damping?: number,
 *           tolerance?: number, maxIterations?: number }} options
 * @returns {{ value: T, iterations: number, converged: boolean, residual: number }}
 */
export function fixedPoint({
  initial,
  next,
  blend,
  distance,
  damping = 0.35,
  tolerance = 1e-5,
  maxIterations = 400,
}) {
  let current = initial;
  let residual = Infinity;
  for (let i = 1; i <= maxIterations; i++) {
    const proposed = next(current);
    residual = distance(current, proposed);
    current = blend(current, proposed, damping);
    if (residual < tolerance) return { value: current, iterations: i, converged: true, residual };
  }
  return { value: current, iterations: maxIterations, converged: false, residual };
}
