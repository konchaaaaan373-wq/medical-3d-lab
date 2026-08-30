/**
 * Seeded, deterministic pseudo-randomness for the medical layer.
 *
 * Heterogeneity is real physiology — no two lung units have the same time
 * constant, no two airways the same wall thickness — and a model that ignores
 * it cannot show what heterogeneity *does*. But heterogeneity drawn from
 * `Math.random()` gives a different lung on every reload, and a scene that
 * answers a question differently each time it is opened cannot be taught from
 * and cannot be tested.
 *
 * So: variation, fixed by a seed, reproducible everywhere. The seed is part of
 * the model's definition, not an implementation detail.
 *
 * `src/utils/math.js` has a `createRandom` for the same reason on the
 * presentation side. This is a separate copy on purpose: the medical layer does
 * not import from the rendering side, and a shared helper would be the first
 * thread back.
 */

/**
 * A small, fast, well-distributed 32-bit generator (mulberry32). Good enough
 * for scattering time constants; deliberately not a source of anything that
 * needs statistical quality.
 *
 * @param {number} seed
 * @returns {() => number} successive values in [0, 1)
 */
export function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `count` multipliers centred on 1 with a given spread, in a fixed order.
 *
 * Used wherever a population of units differs from the textbook value by some
 * amount: lung units with different time constants, airways with different
 * smooth-muscle sensitivity. The mean is held at exactly 1 so that adding
 * heterogeneity does not also, silently, change the average.
 *
 * @param {{ count: number, spread: number, seed?: number }} options
 *   `spread` is the half-width as a fraction of the mean, so 0.4 gives roughly
 *   0.6 to 1.4.
 * @returns {number[]}
 */
export function scatter({ count, spread, seed = 1 }) {
  const random = seededRandom(seed);
  const raw = Array.from({ length: count }, () => 1 + (random() * 2 - 1) * spread);
  const mean = raw.reduce((sum, value) => sum + value, 0) / (count || 1);
  return raw.map((value) => value / mean);
}
