/**
 * 「今、何が起きた？」 — one short sentence on why the figures moved, chosen by
 * the direction of what moved.
 *
 * ## The shape every disease model can use
 *
 * A scene that can say what moved gives a *signature* — the inputs it moved,
 * each `up` or `down`, and the results it computed, each `up`, `down` or
 * `same` at the precision the reader is shown — and its data declares
 * *rules*: `when` (the moved inputs, exactly, and the results the copy talks
 * about) and the copy itself, once for each reader:
 *
 * ```
 * { id, when: { moved: { inputId: 'up' }, results: { map: 'up', co: ['down', 'same'] } },
 *   medical: { en, ja }, patient: { en, ja } }
 * ```
 *
 * The first rule that matches is the explanation; none matching is no
 * explanation, which is the honest answer — the chain of changes and the
 * figures are still on screen. A result the copy mentions must be in `when`,
 * so the sentence can never contradict the read-out beside it; a list of
 * directions lets one sentence cover a change still too small to show, when
 * it is written to be true of both ("cardiac output did not rise").
 *
 * ## One model, two readers
 *
 * Medical and Patient are the same rule — the same state, the same condition
 * matched — with two ways of saying it (ADR 2026-09-30). A rule with no
 * patient copy falls back to the medical one and says so (`audience`), so a
 * caller can tell a patient reader got clinical words.
 *
 * Pure: no DOM, no `three`.
 */

/** @typedef {'up'|'down'|'same'} Direction */
/**
 * @typedef {object} ChangeRule
 * @property {string} id
 * @property {{ moved: Record<string, 'up'|'down'>, results?: Record<string, Direction|Direction[]> }} when
 * @property {{ en: string, ja: string }} medical
 * @property {{ en: string, ja: string }} [patient]
 */

export const AUDIENCES = Object.freeze(['medical', 'patient']);

const allows = (expected, actual) =>
  Array.isArray(expected) ? expected.includes(actual) : expected === actual;

/**
 * @param {null | { moved: Record<string, 'up'|'down'>, results: Record<string, Direction> }} signature
 * @param {ReadonlyArray<ChangeRule>} rules
 * @param {'medical'|'patient'} [audience]
 * @returns {null | { id: string, en: string, ja: string, audience: 'medical'|'patient' }}
 */
export function explainChange(signature, rules, audience = 'medical') {
  if (!signature) return null;
  const moved = Object.entries(signature.moved ?? {});
  if (moved.length === 0) return null;
  for (const rule of rules) {
    const wanted = Object.entries(rule.when.moved);
    if (wanted.length !== moved.length) continue;
    if (!wanted.every(([id, direction]) => signature.moved[id] === direction)) continue;
    const results = Object.entries(rule.when.results ?? {});
    if (!results.every(([key, expected]) => allows(expected, signature.results?.[key]))) continue;
    const spoken = audience === 'patient' && rule.patient ? 'patient' : 'medical';
    return { id: rule.id, en: rule[spoken].en, ja: rule[spoken].ja, audience: spoken };
  }
  return null;
}

/**
 * Everything wrong with a rule set, as readable lines — for the test that
 * holds a scene's rules to the shape above.
 *
 * @param {ReadonlyArray<ChangeRule>} rules
 * @param {{ inputs: ReadonlyArray<string>, results: ReadonlyArray<string> }} vocabulary
 */
export function changeRuleProblems(rules, { inputs, results }) {
  const problems = [];
  const ids = new Set();
  for (const rule of rules) {
    const where = `rule "${rule.id}"`;
    if (ids.has(rule.id)) problems.push(`${where}: duplicate id`);
    ids.add(rule.id);
    const moved = Object.entries(rule.when?.moved ?? {});
    if (moved.length === 0) problems.push(`${where}: moves nothing`);
    for (const [id, direction] of moved) {
      if (!inputs.includes(id)) problems.push(`${where}: unknown input "${id}"`);
      if (direction !== 'up' && direction !== 'down') problems.push(`${where}: "${id}" must move up or down`);
    }
    for (const key of Object.keys(rule.when?.results ?? {})) {
      if (!results.includes(key)) problems.push(`${where}: unknown result "${key}"`);
    }
    for (const audience of AUDIENCES) {
      const copy = rule[audience];
      if (!copy) {
        if (audience === 'medical') problems.push(`${where}: no medical copy`);
        continue;
      }
      if (!copy.en?.trim() || !copy.ja?.trim()) problems.push(`${where}: ${audience} copy needs both languages`);
    }
  }
  return problems;
}
