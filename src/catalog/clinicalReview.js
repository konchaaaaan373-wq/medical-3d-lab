import registry from '../../docs/clinical-reviews/registry.json' with { type: 'json' };

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

const FILTERABLE_STATUSES = new Set(Object.keys(LABELS));

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
