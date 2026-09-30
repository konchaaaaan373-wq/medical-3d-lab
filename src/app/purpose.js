/**
 * What the reader is using a model **for** — patient explanation or medical
 * education — as one value the URL carries.
 *
 * ## What it is, and what it is not
 *
 * It is not who the reader is. A physician explaining a result at the desk
 * chooses 患者説明; a patient reading about their own condition may choose
 * 医学教育. So the words are the two uses — 「患者説明」「医学教育」 — and
 * never a rank of reader (no 初心者／上級者, no 患者／医療者).
 *
 * It is not a second model either. The medical scene and its solved state are
 * one; what changes with the purpose is the language, the guide, what is shown
 * first and how the controls are offered (`docs/pathology-explanation-handoff.md`).
 *
 * ## Why it lives in the address
 *
 * A shared link, a reload and the Back button all have to agree about which
 * purpose the screen is in, and the address is the one thing all three read.
 * It is a query on the scene's route (`#/heart-failure?purpose=patient`) rather
 * than a path segment for the same reason `?structure=` is: the same model, in
 * a different state — `sameRoute` ignores it, so switching does not reload the
 * model or lose the viewpoint.
 *
 * Medical education is the default and is written as the absence of the
 * parameter, so every existing link keeps meaning what it meant.
 *
 * Pure: no `window`, no DOM — `node --test` holds it.
 */

import { hashWithParam } from './hashQuery.js';

export const PURPOSE = Object.freeze({
  PATIENT: 'patient',
  EDUCATION: 'education',
});

export const DEFAULT_PURPOSE = PURPOSE.EDUCATION;

/** The query key the scene route carries. */
export const PURPOSE_PARAM = 'purpose';

/**
 * The two uses, in the order a switch shows them, named as uses.
 *
 * `explore` is how that purpose looks for a model — the patient side starts
 * from a question, the education side from a body system, organ and mechanism.
 */
export const PURPOSES = Object.freeze([
  Object.freeze({
    id: PURPOSE.EDUCATION,
    en: 'Medical education',
    ja: '医学教育',
    explore: Object.freeze({ en: 'By system, organ and mechanism', ja: '系統・臓器・病態から探す' }),
  }),
  Object.freeze({
    id: PURPOSE.PATIENT,
    en: 'Patient explanation',
    ja: '患者説明',
    explore: Object.freeze({ en: 'By the question you have', ja: '知りたいことから探す' }),
  }),
]);

/** @param {string} id */
export const purposeById = (id) => PURPOSES.find((purpose) => purpose.id === id) ?? null;

/** Split a hash into its route and its query, keeping both as written. */
function split(hash) {
  const value = String(hash ?? '');
  const at = value.indexOf('?');
  return at < 0 ? [value, ''] : [value.slice(0, at), value.slice(at + 1)];
}

/**
 * The purpose a hash asks for, or `null` when it asks for none.
 *
 * An unknown value is `null` rather than the default: "the link said something
 * this build does not understand" and "the link said nothing" end in the same
 * screen, but only the first is worth telling the reader about.
 *
 * @param {string} hash
 * @returns {'patient'|'education'|null}
 */
export function requestedPurpose(hash = '') {
  const [, query] = split(hash);
  if (!query) return null;
  const value = new URLSearchParams(query).get(PURPOSE_PARAM)?.trim().toLowerCase();
  return value === PURPOSE.PATIENT || value === PURPOSE.EDUCATION ? value : null;
}

/**
 * The same hash, asking for `purpose`. Every other part of the query — the
 * structure an anatomy link named, say — is kept.
 *
 * The default is written as no parameter, so switching back to medical
 * education gives the link everybody already has.
 *
 * @param {string} hash
 * @param {'patient'|'education'} purpose
 */
export function hashWithPurpose(hash, purpose) {
  // Every other part kept as written (`hashQuery.js`).
  return hashWithParam(hash, PURPOSE_PARAM, purpose !== DEFAULT_PURPOSE && purposeById(purpose) ? purpose : null);
}

/**
 * The purpose the screen may actually open in.
 *
 * Patient explanation only where it is available for this model — the release,
 * the versioned clinical review and the authored content all agreeing
 * (`src/access/patientPurpose.js`). Asked for anywhere else, the screen opens
 * in medical education and `refused` says so, so the reader is told rather than
 * silently shown something else.
 *
 * @param {{requested: string|null, patientAvailable: boolean}} options
 * @returns {{purpose: 'patient'|'education', refused: boolean}}
 */
export function resolvePurpose({ requested, patientAvailable }) {
  if (requested === PURPOSE.PATIENT) {
    return patientAvailable
      ? { purpose: PURPOSE.PATIENT, refused: false }
      : { purpose: PURPOSE.EDUCATION, refused: true };
  }
  return { purpose: PURPOSE.EDUCATION, refused: false };
}
