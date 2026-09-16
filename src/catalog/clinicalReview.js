import registry from '../../docs/clinical-reviews/registry.json' with { type: 'json' };

/**
 * **This module must only be reached from a lazily-loaded surface.**
 *
 * It imports the whole registry, and the registry is mostly the reviewers'
 * prose — the scope they covered, the sources they read, the limitations they
 * could not resolve — which is 84 kB of its 98.5 kB. A bundler cannot take one
 * field out of a JSON import, so anything statically reachable from `main.js`
 * that imports this ships all of it in the entry chunk: measured at 22.8 kB
 * gzipped, a quarter of the entry budget, in front of a first paint that shows
 * none of it.
 *
 * The release gate needed one field and used to import this for it. It now
 * reads `clinicalReviewStates.js`, which is generated from the same registry.
 * If you need a review *state* on a path that runs at first paint, use that.
 * If you need anything a reviewer wrote, you are on a surface that can wait for
 * a chunk, and this is the right module.
 *
 * `tests/eager-entry-graph.test.js` fails if the registry becomes eager again.
 */

/**
 * Clinical-review status is deliberately separate from catalogue maturity.
 *
 * `production` means the software/model surface is mature enough for the public
 * product. It does NOT by itself mean that the current commit has a versioned
 * clinical sign-off. The registry in docs/clinical-reviews is the single source
 * of truth for that second question, and the UI reads it directly rather than
 * copying review flags into the scene manifest.
 *
 * `stale` is intentionally different from both `reviewed` and `pending`: a real
 * historical attestation exists, but files inside its recorded scope changed
 * afterwards, so the old sign-off must not be presented as current.
 */

const LABELS = Object.freeze({
  reviewed: Object.freeze({
    en: 'Clinical review: Reviewed',
    ja: '医学レビュー：完了',
    shortEn: 'Reviewed',
    shortJa: 'レビュー済み',
  }),
  stale: Object.freeze({
    en: 'Clinical review: Re-review required',
    ja: '医学レビュー：再レビュー必要',
    shortEn: 'Re-review required',
    shortJa: '再レビュー必要',
  }),
  pending: Object.freeze({
    en: 'Clinical review: Pending',
    ja: '医学レビュー：未完了',
    shortEn: 'Pending',
    shortJa: 'レビュー待ち',
  }),
  'legacy-unversioned': Object.freeze({
    en: 'Clinical review: Legacy / unversioned',
    ja: '医学レビュー：旧基準・版固定なし',
    shortEn: 'Legacy review',
    shortJa: '旧基準レビュー',
  }),
});

/**
 * Every review state the registry can present, as data.
 *
 * Exported because more than one surface has to cover them all, and a surface
 * that silently falls back for one of them says the wrong thing rather than
 * nothing: the crawlable scene page had no `stale` case, so COPD, asthma and
 * portal hypertension were each published saying "Reviewed — a clinical
 * reviewer has signed a specific commit" and "Clinical review pending" on the
 * same page. A list a test can iterate is what stops that recurring.
 */
export const CLINICAL_REVIEW_STATUSES = Object.freeze(Object.keys(LABELS));

/**
 * The states a *surface* has to be able to render, which is one more.
 *
 * `unrecorded` is not a registry state — it is what a scene with no registry
 * entry at all resolves to, and `clinicalReviewPresentation` returns it. It is
 * deliberately not filterable, because filtering by "we have no record" is not
 * a question the Explorer asks. But it is very much presentable: a new scene
 * added without a registry entry publishes *something*, and a surface whose
 * copy table falls back to "pending" for it would say a review is on its way
 * when nobody has ever looked. That is exactly the bug `stale` had.
 */
export const CLINICAL_REVIEW_PRESENTABLE_STATUSES = Object.freeze([
  ...CLINICAL_REVIEW_STATUSES,
  'unrecorded',
]);

const FILTERABLE_STATUSES = new Set(CLINICAL_REVIEW_STATUSES);

export const CLINICAL_REVIEW_RECORDS = Object.freeze(
  registry.map((record) => Object.freeze({
    ...record,
    scope: Object.freeze([...(record.scope ?? [])]),
    sources: Object.freeze([...(record.sources ?? [])]),
    unresolvedLimitations: Object.freeze([...(record.unresolvedLimitations ?? [])]),
    stalePaths: record.stalePaths ? Object.freeze([...record.stalePaths]) : undefined,
  }))
);

const BY_SCENE = new Map(CLINICAL_REVIEW_RECORDS.map((record) => [record.sceneId, record]));

/** @param {string | {id:string}} scene */
export function clinicalReviewForScene(scene) {
  const id = typeof scene === 'string' ? scene : scene?.id;
  return BY_SCENE.get(id) ?? null;
}

/** First registered source under a repository-relative trust-document prefix. */
function sourceForScene(scene, prefix) {
  return clinicalReviewForScene(scene)?.sources.find((source) => source.startsWith(prefix)) ?? null;
}

/**
 * The model card is part of the public trust path, so derive it from the same
 * registry that owns the review state rather than copying a second path into
 * production scene metadata.
 */
export const modelCardForScene = (scene) => sourceForScene(scene, 'docs/model-cards/');

/** Claim-level evidence dossier when a scene has one. Anatomy-only scenes may not. */
export const evidenceDossierForScene = (scene) => sourceForScene(scene, 'docs/model-evidence/');

/** A current, versioned clinical sign-off. Historical/stale review does not qualify. */
export const hasCurrentClinicalReview = (scene) => clinicalReviewForScene(scene)?.reviewStatus === 'reviewed';

/**
 * Exact review-state filter used by the Explorer and its tests. `all` is the
 * only wildcard; an unknown value fails closed rather than silently becoming
 * an unfiltered view.
 */
export function clinicalReviewMatchesFilter(scene, filter = 'all') {
  const value = String(filter ?? 'all');
  if (value === 'all') return true;
  if (!FILTERABLE_STATUSES.has(value)) return false;
  return clinicalReviewForScene(scene)?.reviewStatus === value;
}

/**
 * Presentation metadata for a review record. Unknown/missing review state fails
 * visibly rather than being treated as reviewed.
 */
export function clinicalReviewPresentation(scene) {
  const record = clinicalReviewForScene(scene);
  const status = record?.reviewStatus ?? 'unrecorded';
  const labels = LABELS[status] ?? {
    en: 'Clinical review: Not recorded',
    ja: '医学レビュー：記録なし',
    shortEn: 'Not recorded',
    shortJa: '記録なし',
  };
  return Object.freeze({ status, record, ...labels });
}
