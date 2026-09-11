/**
 * What the 3D is doing with the model's numbers — declared, not just commented.
 *
 * Three different things get said about a diseased lung and they are routinely
 * read as one:
 *
 * 1. **What the model solved.** `flowLimitedFraction` is 0.62. That is a number
 *    a twelve-unit mechanics model produced, and every read-out, plot and test
 *    derives from it.
 * 2. **How the picture says it.** The airway is drawn visibly pinched. The
 *    pinch is *keyed to* that fraction and its depth is a drawing decision —
 *    chosen so the change reads at all at this scale, on this screen.
 * 3. **What a person is told.** "It gets harder to push the air back out."
 *
 * The failure this file exists to prevent is a reader taking (2) for (1): the
 * drawn calibre of that airway is not a modelled airway diameter and is not
 * anybody's measurement. Saying so in a code comment protects the next author
 * and nobody else. Declaring it here makes it something a test can hold, a
 * scope panel can print and a reviewer can read without opening the renderer.
 *
 * @typedef {object} VisualMapping
 * @property {string} id
 * @property {string} target what is drawn — a structure, not a variable
 * @property {'geometry'|'scale'|'emissive'|'opacity'|'colour'|'motion'|'position'} channel
 *   which drawing property carries it
 * @property {string|null} from the model state field it is keyed to, or null
 *   when nothing in the model drives it
 * @property {'proportional'|'illustrative'|'thresholded'} reading how to read
 *   the magnitude: `proportional` means the drawn amount is the model's amount
 *   in a stated unit; `illustrative` means only the direction and the ordering
 *   are the model's, and the size is a drawing decision; `thresholded` means it
 *   appears past a value and says nothing about how far past.
 * @property {string} claim what the picture is entitled to say
 * @property {string} claimJa
 * @property {string} [notClaim] what it must never be read as. Required
 *   wherever `reading` is not `proportional`.
 * @property {string} [notClaimJa]
 */

/** The channels a declaration may use. */
export const VISUAL_CHANNELS = Object.freeze([
  'geometry',
  'scale',
  'emissive',
  'opacity',
  'colour',
  'motion',
  'position',
]);

/** How the magnitude on screen relates to the magnitude in the model. */
export const VISUAL_READINGS = Object.freeze(['proportional', 'illustrative', 'thresholded']);

/**
 * Everything wrong with one declaration, as sentences.
 *
 * @param {VisualMapping} mapping
 * @param {{stateFields?: string[]}} [options] the field names the scene's model
 *   actually solves. When given, `from` has to name one of them — a mapping
 *   keyed to a variable that does not exist is a mapping keyed to `undefined`,
 *   and that draws a constant while claiming to draw the physiology.
 * @returns {string[]}
 */
export function visualMappingProblems(mapping, { stateFields = null } = {}) {
  const problems = [];
  const where = mapping?.id ?? 'a mapping';

  if (!mapping?.id) problems.push('a mapping carries no id');
  if (!mapping?.target?.trim()) problems.push(`${where}: names nothing it draws`);
  if (!VISUAL_CHANNELS.includes(mapping?.channel)) {
    problems.push(`${where}: channel "${mapping?.channel}" is not one of ${VISUAL_CHANNELS.join(', ')}`);
  }
  if (!VISUAL_READINGS.includes(mapping?.reading)) {
    problems.push(`${where}: reading "${mapping?.reading}" is not one of ${VISUAL_READINGS.join(', ')}`);
  }
  if (mapping?.from !== null && !mapping?.from?.trim()) {
    problems.push(`${where}: from is neither a model field nor an explicit null`);
  }
  if (stateFields && mapping?.from && !stateFields.includes(mapping.from)) {
    problems.push(`${where}: is keyed to "${mapping.from}", which the model does not solve`);
  }
  for (const field of ['claim', 'claimJa']) {
    if (!mapping?.[field]?.trim()) problems.push(`${where}: carries no ${field}`);
  }
  // The whole point. A drawing whose size is a drawing decision has to say what
  // it is not, because the reader cannot tell by looking, and "it is only
  // illustrative" is exactly the sentence that never gets written down.
  if (mapping?.reading !== 'proportional') {
    for (const field of ['notClaim', 'notClaimJa']) {
      if (!mapping?.[field]?.trim()) {
        problems.push(`${where}: is ${mapping?.reading} and does not say what it must not be read as (${field})`);
      }
    }
  }
  return problems;
}

/**
 * Everything wrong with a scene's whole declaration.
 *
 * @param {VisualMapping[]} mappings
 * @param {{stateFields?: string[]}} [options]
 * @returns {string[]}
 */
export function visualMappingSetProblems(mappings, options = {}) {
  const problems = [];
  if (!Array.isArray(mappings) || !mappings.length) return ['the scene declares no visual mapping'];
  const seen = new Set();
  for (const mapping of mappings) {
    problems.push(...visualMappingProblems(mapping, options));
    if (seen.has(mapping?.id)) problems.push(`${mapping.id}: declared twice`);
    seen.add(mapping?.id);
  }
  return problems;
}
