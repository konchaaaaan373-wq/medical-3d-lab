/** Small numeric helpers shared by every scene. */

export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export const lerp = (a, b, t) => a + (b - a) * t;

/** Smooth 0..1 ramp between `edge0` and `edge1` (same semantics as GLSL smoothstep). */
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Frame-rate independent easing towards a target. */
export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/**
 * Deterministic PRNG (mulberry32). Using a seeded generator keeps the layout
 * identical on every reload, which matters when you re-shoot a screen capture.
 */
export function createRandom(seed = 20240824) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform point on a unit sphere. */
export function randomDirection(rnd, out = { x: 0, y: 0, z: 0 }) {
  const u = rnd() * 2 - 1;
  const theta = rnd() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  out.x = r * Math.cos(theta);
  out.y = u;
  out.z = r * Math.sin(theta);
  return out;
}
