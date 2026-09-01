import { clinicalReviewPresentation } from '../catalog/clinicalReview.js';
import { el } from '../utils/dom.js';

const bilingual = (en, ja, className = '') =>
  el('span', { class: className }, [
    el('span', { class: 'lang-en', text: en }),
    el('span', { class: 'lang-ja', text: ja }),
  ]);

function statusExplanation(status) {
  if (status === 'reviewed') {
    return {
      en: 'A clinical reviewer signed a specific repository commit. The recorded scope and limitations apply to that reviewed version.',
      ja: '特定のリポジトリcommitに対する医学レビューが記録されています。下記の範囲と限界は、そのレビュー版に対する記録です。',
    };
  }
  if (status === 'legacy-unversioned') {
    return {
      en: 'This scene predates the current versioned review standard. Historical review context exists, but no current commit-level clinical attestation is recorded.',
      ja: '現在の版固定レビュー基準より前からあるシーンです。過去のレビュー文脈はありますが、現在のcommitに対する医学的attestationは記録されていません。',
    };
  }
  if (status === 'pending') {
    return {
      en: 'The model/evidence package is present, but no completed clinical sign-off is recorded yet.',
      ja: 'モデル／evidence packageはありますが、完了した医学的sign-offはまだ記録されていません。',
    };
  }
  return {
    en: 'No clinical-review record is available for this scene.',
    ja: 'このシーンには医学レビュー記録がありません。',
  };
}

/**
 * Compact disclosure used beside a public scene card.
 *
 * The content is intentionally sourced from the review registry. We do not
 * invent a second user-facing list of limitations that could drift away from
 * the attestation record.
 */
export function createClinicalReviewDetails(scene) {
  const presentation = clinicalReviewPresentation(scene);
  const record = presentation.record;
  const explanation = statusExplanation(presentation.status);

  const metadata = [];
  if (record?.reviewedAt) {
    metadata.push(
      bilingual(`Reviewed ${record.reviewedAt}`, `レビュー日 ${record.reviewedAt}`, 'clinical-review-meta')
    );
  }
  if (record?.reviewedCommit) {
    const short = record.reviewedCommit.slice(0, 10);
    metadata.push(
      bilingual(`Reviewed commit ${short}`, `レビューcommit ${short}`, 'clinical-review-meta')
    );
  }

  const scope = (record?.scope ?? []).map((item) => el('li', { text: item }));
  const limitations = (record?.unresolvedLimitations ?? []).map((item) => el('li', { text: item }));

  return el('details', { class: `clinical-review-details is-${presentation.status}` }, [
    el('summary', { class: 'clinical-review-summary' }, [
      bilingual(presentation.en, presentation.ja, 'clinical-review-summary-label'),
      bilingual('Why this status?', 'この状態の根拠', 'clinical-review-summary-hint'),
    ]),
    el('div', { class: 'clinical-review-body' }, [
      bilingual(explanation.en, explanation.ja, 'clinical-review-explanation'),
      ...metadata,
      scope.length
        ? el('section', { class: 'clinical-review-section' }, [
            bilingual('Recorded review scope', '記録されたレビュー範囲', 'clinical-review-section-title'),
            el('ul', {}, scope),
          ])
        : null,
      limitations.length
        ? el('section', { class: 'clinical-review-section' }, [
            bilingual('Known limitations still visible', '残っている既知の限界', 'clinical-review-section-title'),
            el('ul', {}, limitations),
          ])
        : null,
    ]),
  ]);
}
