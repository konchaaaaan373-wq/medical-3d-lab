/**
 * How one scene relates to the scene it points at.
 *
 * The prose note on a `related` block already says this, and prose is the right
 * place for the reasoning. What prose cannot do is let the *interface* tell the
 * two cases apart, and they are genuinely different things:
 *
 * - `same-subject` — the same organ at the same scale, modelled twice for
 *   different purposes. The heart atlas and heart failure are this: a fixed
 *   specimen and a solved ventricle, both a heart, both life-size.
 * - `scale-change` — the reader is being moved to another scale. Then
 *   `scaleRelationship` says which kind, and the distinction matters:
 *   - `magnified-detail` — a real part of that organ, drawn larger. Pushing in
 *     on the organ would get you here.
 *   - `schematic` — a diagram at no anatomical scale. Pushing in would **not**
 *     get you here, and the model does not say where in the organ it would be.
 *
 * Brain anatomy → amyloid-β is `schematic`, and calling it a zoom would be a
 * false claim about what the atlas contains. Kidney → nephron and lung →
 * alveolus are the cases this exists to serve next; both are the other kind.
 *
 * Two fields, no engine. If a third kind ever turns up, add it here — not a
 * scale system somewhere else.
 */

export const TRANSITION_TYPES = Object.freeze(['same-subject', 'scale-change']);
export const SCALE_RELATIONSHIPS = Object.freeze(['magnified-detail', 'schematic']);

/** Short words for the marker the panel draws. Not the explanation — the note is. */
export const TRANSITION_COPY = Object.freeze({
  'magnified-detail': {
    en: 'Another scale · a real part, drawn larger',
    ja: '別スケール・実在する一部の拡大',
  },
  schematic: {
    en: 'Another scale · a schematic, not a zoom',
    ja: '別スケール・模式図（拡大ではありません）',
  },
});

/**
 * Everything wrong with one `related` block, as sentences. Empty means fine.
 *
 * @param {{scenes?: object[], note?: string, noteJa?: string}} related
 * @param {string} owner slug of the scene declaring it, for the message
 */
export function relatedProblems(related, owner = '<scene>') {
  const problems = [];
  for (const entry of related?.scenes ?? []) {
    const where = `${owner} → ${entry?.slug ?? '<no slug>'}`;
    const type = entry?.transitionType ?? 'same-subject';
    if (!TRANSITION_TYPES.includes(type)) {
      problems.push(`${where}: transitionType "${type}" is not one of ${TRANSITION_TYPES.join(', ')}`);
      continue;
    }
    if (type !== 'scale-change') {
      if (entry?.scaleRelationship) {
        problems.push(`${where}: scaleRelationship is only meaningful on a scale-change`);
      }
      continue;
    }
    // A scale change that does not say which kind is the ambiguity this exists
    // to remove, so it is an error rather than a default.
    if (!SCALE_RELATIONSHIPS.includes(entry?.scaleRelationship)) {
      problems.push(
        `${where}: a scale-change must declare scaleRelationship (${SCALE_RELATIONSHIPS.join(' | ')})`
      );
    }
  }
  return problems;
}
