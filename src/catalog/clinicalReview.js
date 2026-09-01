import registry from '../../docs/clinical-reviews/registry.json' with { type: 'json' };

/**
 * Clinical-review status is deliberately separate from catalogue maturity.
 *
 * `production` means the software/model surface is mature enough for the public
 * product. It does NOT by itself mean that the current commit has a versioned
 * clinical sign-off. The registry in docs/clinical-reviews is the single source
 * of truth for that second question, and the UI reads it directly rather than
 * copying review flags into the scene manifest.
 */

const LABELS = Object.freeze({
  reviewed: Object.freeze({
    en: 'Clinical review: Reviewed',
    ja: '医学レビュー：完了',
    shortEn: 'Reviewed',
    shortJa: 'レビュー済み',
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

export const CLINICAL_REVIEW_RECORDS = Object.freeze(
  registry.map((record) => Object.freeze({
    ...record,
    scope: Object.freeze([...(record.scope ?? [])]),
    sources: Object.freeze([...(record.sources ?? [])]),
    unresolvedLimitations: Object.freeze([...(record.unresolvedLimitations ?? [])]),
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
