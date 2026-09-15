/**
 * Which scenes have a current clinical sign-off — the states only.
 *
 * **Generated. Do not edit.** `node scripts/review-states.js --write`, from
 * `docs/clinical-reviews/registry.json`, which is the source of truth for
 * every one of these and for the reviewer's notes that are not here.
 *
 * It exists because the release gate runs at first paint and needs this one
 * field, while the notes beside it in the registry are 84 kB of prose that only
 * a reader who opens a model card ever sees. Importing the registry to answer
 * an enum put all of it in the entry chunk: 22.8 kB gzipped, a quarter of the
 * budget. See the header of `scripts/review-states.js`.
 *
 * `tests/clinical-review-states.test.js` fails if this disagrees with the
 * registry, so it cannot become a second opinion about who signed off on what.
 *
 * Anything richer than a state — the scope, the sources, the limitations, the
 * labels — comes from `catalog/clinicalReview.js`, which reads the registry
 * itself and must only ever be imported from a lazily-loaded surface.
 */
export const CLINICAL_REVIEW_STATES = Object.freeze({
  'abdomen-anatomy': 'pending',
  'achalasia': 'pending',
  'acl-injury': 'pending',
  'adrenal-anatomy': 'pending',
  'amyloid-beta': 'legacy-unversioned',
  'asthma-heterogeneity': 'stale',
  'benign-prostatic-enlargement': 'pending',
  'biliary-anatomy': 'pending',
  'biliary-obstruction': 'pending',
  'bladder-anatomy': 'pending',
  'bowel-obstruction': 'pending',
  'bppv': 'pending',
  'brain-anatomy': 'pending',
  'breast-anatomy': 'pending',
  'breast-lesion': 'pending',
  'cataract': 'pending',
  'circulation': 'pending',
  'copd-hyperinflation': 'stale',
  'ear-anatomy': 'pending',
  'elbow-anatomy': 'pending',
  'esophagus-anatomy': 'pending',
  'eye-anatomy': 'pending',
  'foot-anatomy': 'pending',
  'hand-anatomy': 'pending',
  'heart-anatomy': 'pending',
  'heart-failure': 'legacy-unversioned',
  'hepatorenal-syndrome': 'pending',
  'hip-anatomy': 'pending',
  'hip-osteoarthritis': 'pending',
  'intestine-anatomy': 'pending',
  'kidney-anatomy': 'pending',
  'knee-anatomy': 'pending',
  'knee-osteoarthritis': 'pending',
  'larynx-anatomy': 'pending',
  'liver-anatomy': 'pending',
  'lobar-collapse': 'pending',
  'lumbar-disc-herniation': 'pending',
  'lung-anatomy': 'pending',
  'lymph-node-anatomy': 'pending',
  'lymphatic-drainage': 'pending',
  'male-tract-anatomy': 'pending',
  'multinodular-goitre': 'pending',
  'myocardial-ischemia': 'pending',
  'neck-anatomy': 'pending',
  'nose-anatomy': 'pending',
  'oral-anatomy': 'pending',
  'pancreas-anatomy': 'pending',
  'pelvic-floor-anatomy': 'pending',
  'pelvis-anatomy': 'pending',
  'pneumonia-consolidation': 'pending',
  'portal-hypertension': 'stale',
  'pressure-injury': 'pending',
  'prostate-anatomy': 'pending',
  'pulmonary-edema': 'pending',
  'pulmonary-embolism': 'pending',
  'renal-filtration': 'pending',
  'retinal-detachment': 'pending',
  'rotator-cuff-tear': 'pending',
  'shoulder-anatomy': 'pending',
  'skeleton-overview': 'pending',
  'skin-anatomy': 'pending',
  'spine-anatomy': 'pending',
  'spleen-anatomy': 'pending',
  'stomach-anatomy': 'pending',
  'thorax-anatomy': 'pending',
  'thyroid-anatomy': 'pending',
  'urinary-obstruction': 'pending',
  'uterine-fibroid': 'pending',
  'uterus-anatomy': 'pending',
});

/**
 * The recorded state for a scene, in the shape the gate reads.
 *
 * An object rather than the bare string, so this is a drop-in for the registry
 * record the gate used to resolve and a caller injecting a full record in a
 * test still works.
 *
 * @param {string | {id: string} | null | undefined} scene
 * @returns {{reviewStatus: string} | null} null when the scene has no record
 */
export function clinicalReviewStateForScene(scene) {
  const id = typeof scene === 'string' ? scene : scene?.id;
  const reviewStatus = id == null ? undefined : CLINICAL_REVIEW_STATES[id];
  return reviewStatus ? Object.freeze({ reviewStatus }) : null;
}

/** A current, versioned sign-off. Historical or stale review does not qualify. */
export const hasCurrentClinicalReviewState = (scene) =>
  clinicalReviewStateForScene(scene)?.reviewStatus === 'reviewed';
