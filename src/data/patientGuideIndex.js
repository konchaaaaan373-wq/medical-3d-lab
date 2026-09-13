/**
 * Which scenes have an authored patient explanation — the ids, and nothing else.
 *
 * The release gate asks one question of the patient guides: *is one written for
 * this scene?* Importing `patientGuides.js` to answer it pulled the guides
 * themselves — and, through them, the COPD and asthma teaching data — into the
 * eager entry chunk, so every first-time visitor downloaded 220 kB of prose
 * they had not asked for before anything rendered. That was most of why
 * `npm run budget` failed (F-99): the entry measured 134.7 kB gzipped against
 * a 90 kB budget, and cutting this one edge brought it to 89 kB.
 *
 * So the gate reads this list instead. It is deliberately only the keys — the
 * guide payloads still ship, lazily, to a reader who opens one.
 *
 * **This is a second copy of a list, which this repository otherwise refuses.**
 * It is allowed here only because it cannot drift unnoticed:
 * `tests/patient-guide-index.test.js` asserts this list and the keys of
 * `PATIENT_GUIDES` are the same set in both directions, so authoring a guide
 * without listing it here — or listing one that does not exist — fails the
 * suite. If you are adding a patient guide, add its id here too; the test will
 * tell you if you forget.
 */
export const PATIENT_GUIDE_SCENE_IDS = Object.freeze([
  'amyloid-beta',
  'heart-failure',
  'myocardial-ischemia',
  'copd-hyperinflation',
  'asthma-heterogeneity',
  'pneumonia-consolidation',
  'pulmonary-embolism',
  'pulmonary-edema',
  'portal-hypertension',
  'hepatorenal-syndrome',
  'renal-filtration',
  'biliary-obstruction',
  'achalasia',
  'benign-prostatic-enlargement',
  'bowel-obstruction',
  'uterine-fibroid',
  'multinodular-goitre',
  'knee-osteoarthritis',
  'acl-injury',
  'rotator-cuff-tear',
  'hip-osteoarthritis',
  'urinary-obstruction',
  'lobar-collapse',
  'lumbar-disc-herniation',
  'retinal-detachment',
  'cataract',
  'bppv',
  'pressure-injury',
  'breast-lesion',
]);

/** Whether a patient explanation is authored for this scene. */
export const hasAuthoredPatientGuide = (sceneId) => PATIENT_GUIDE_SCENE_IDS.includes(sceneId);
