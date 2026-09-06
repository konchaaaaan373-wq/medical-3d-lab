/**
 * The names of the three coronary territories, and nothing else.
 *
 * A separate module because two layers need this vocabulary and neither can
 * import the other. `src/models/myocardialIschemia.js` is pure JavaScript by the
 * rule of its directory, so it cannot reach into the organ layer; the organ
 * layer's `coronaryAnatomy.js` needs `three` for its geometry, so it cannot be
 * the shared source. Held here, both read the same list and a fourth territory
 * — or a rename — is one edit rather than two that can disagree.
 *
 * These are *anatomical* names, which is why they live beside the anatomy
 * rather than inside the disease: an ischemia model decides how badly the
 * anterior descending's territory is supplied, not what that territory is
 * called or what belongs to it.
 */

/** Left anterior descending, right coronary, left circumflex. */
export const TERRITORIES = Object.freeze(['lad', 'rca', 'lcx']);

/** The full name of each, for anything that shows one to a reader. */
export const TERRITORY_LABELS = Object.freeze({
  lad: Object.freeze({ label: 'Left anterior descending', labelJa: '左前下行枝' }),
  rca: Object.freeze({ label: 'Right coronary', labelJa: '右冠動脈' }),
  lcx: Object.freeze({ label: 'Left circumflex', labelJa: '左回旋枝' }),
});
