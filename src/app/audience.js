/**
 * Who the model is explaining itself to right now: `medical` or `patient`.
 *
 * The reader's side of the Medical | Patient switch (ADR 2026-09-30), as one
 * value the explanation components read, so a new component that speaks to the
 * reader subscribes here instead of learning the purpose controller.
 *
 * It follows the purpose (`purpose.js`): patient explanation is the patient
 * side, everything else is medical. The purpose controller is the only
 * writer, and it only runs where the model offers patient explanation at all —
 * so on the released product, where none yet does, this stays `medical`. The
 * gate is the purpose's (`patientPurpose.js`), not repeated here.
 */
let current = 'medical';
const listeners = new Set();

/** @returns {'medical'|'patient'} */
export const currentAudience = () => current;

/** @param {'medical'|'patient'} audience */
export function setAudience(audience) {
  const next = audience === 'patient' ? 'patient' : 'medical';
  if (next === current) return;
  current = next;
  for (const listener of listeners) listener(current);
}

/**
 * @param {(audience: 'medical'|'patient') => void} listener
 * @returns {() => void} unsubscribe
 */
export function onAudienceChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
