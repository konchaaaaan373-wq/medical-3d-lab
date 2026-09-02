import { clinicalReviewPresentation } from '../catalog/clinicalReview.js';
import { EXPLORER_ROUTE, LANDING_ROUTE, PUBLIC_SCENES, sceneRoute, statusById } from '../catalog/index.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { el, skipLink } from '../utils/dom.js';

/**
 * The notes that go with each review state.
 *
 * The *labels* come from `src/catalog/clinicalReview.js`, which the Explorer
 * and the scene title cards read too — one vocabulary, so a scene cannot be
 * "Reviewed" in one place and something else in another. What is added here is
 * the sentence a reader needs on a page whose whole job is to explain the
 * distinction.
 */
const REVIEW_NOTES = {
  reviewed: {
    en: 'A clinical reviewer signed a specific commit, and nothing inside the scope they reviewed has changed since. Limitations remain part of the attestation.',
    ja: '特定コミットに対する臨床レビュー記録があり、その範囲のファイルはレビュー後に変更されていません。残る限界もレビュー記録の一部です。',
  },
  stale: {
    en: 'A real review exists, but files inside the scope it recorded changed afterwards. It is history, not a current sign-off, and the changed paths are listed below.',
    ja: '実際のレビュー記録はありますが、その範囲に含まれるファイルがレビュー後に変更されました。現在の署名ではなく履歴として扱い、変更されたパスを下に示します。',
  },
  pending: {
    en: 'The model/evidence package exists, but no completed current-standard clinical sign-off is recorded.',
    ja: 'モデル・証拠パッケージはありますが、現行基準の臨床レビュー完了記録はありません。',
  },
  'legacy-unversioned': {
    en: 'Evidence has been migrated to the current format without inventing a historical reviewer or commit.',
    ja: '証拠パッケージは現行形式へ移行済みですが、過去のレビュアーやコミットを推測して補っていません。',
  },
  unrecorded: {
    en: 'No clinical review record exists for this scene at all.',
    ja: 'このシーンの臨床レビュー記録は存在しません。',
  },
};

const githubSource = (path) =>
  `https://github.com/konchaaaaan373-wq/medical-3d-lab/blob/main/${path}`;

function bilingual(en, ja, className = '') {
  return el('span', { class: className }, [
    el('span', { class: 'lang-en', text: en }),
    el('span', { class: 'lang-ja', text: ja }),
  ]);
}

function reviewBadge(review) {
  return el('span', { class: `trust-review-badge is-${review.status}` }, [
    el('span', { class: 'lang-en', text: review.shortEn }),
    el('span', { class: 'lang-ja', text: review.shortJa }),
  ]);
}

/**
 * "This review signed something that has since changed."
 *
 * A stale review is not automatically invalid — it is a review of a different
 * version, and saying so is the entire point of a versioned attestation. What
 * is not acceptable is a stale review that keeps quiet, so the state has its
 * own badge, its own note and, here, the list of paths that moved.
 *
 * The staleness itself is decided in `src/catalog/clinicalReview.js` from the
 * registry's recorded scope. This only draws it.
 */
function changedSinceReview(review) {
  const paths = review.record?.stalePaths ?? [];
  if (review.status !== 'stale' || paths.length === 0) return null;
  return el('div', { class: 'trust-drift' }, [
    el('p', { class: 'trust-drift-head' }, [
      el('span', { class: 'lang-en', text: 'Changed after this review' }),
      el('span', { class: 'lang-ja', text: 'このレビュー後に変更されたもの' }),
    ]),
    el('ul', { class: 'trust-list trust-drift-paths' }, paths.map((path) => el('li', { text: path }))),
  ]);
}

function sourceLinks(record) {
  return el(
    'div',
    { class: 'trust-sources' },
    (record?.sources ?? []).map((source) =>
      el('a', { class: 'trust-source', href: githubSource(source), target: '_blank', rel: 'noreferrer' }, [
        el('span', { text: source }),
        el('span', { 'aria-hidden': 'true', text: ' ↗' }),
      ])
    )
  );
}

function trustCard(scene) {
  const maturity = statusById(scene.status);
  const review = clinicalReviewPresentation(scene);
  const note = REVIEW_NOTES[review.status] ?? REVIEW_NOTES.unrecorded;
  const record = review.record;
  const reviewMeta = record?.reviewedAt
    ? `${record.reviewedAt} · ${record.reviewedCommit?.slice(0, 8) ?? ''}`
    : null;

  return el('article', { class: 'trust-card' }, [
    el('div', { class: 'trust-card-head' }, [
      el('div', {}, [
        el('h2', { class: 'trust-card-title' }, [
          el('span', { class: 'lang-en', text: scene.titleEn }),
          el('span', { class: 'lang-ja', text: scene.titleJa }),
        ]),
        el('div', { class: 'trust-card-badges' }, [
          el('span', { class: `trust-maturity is-${scene.status}` }, [
            el('span', { class: 'lang-en', text: `Catalogue: ${maturity?.label ?? scene.status}` }),
            el('span', { class: 'lang-ja', text: `カタログ: ${maturity?.labelJa ?? scene.status}` }),
          ]),
          reviewBadge(review),
        ]),
      ]),
      el('a', { class: 'trust-open-model', href: sceneRoute(scene) }, [
        el('span', { class: 'lang-en', text: 'Open model →' }),
        el('span', { class: 'lang-ja', text: 'モデルを開く →' }),
      ]),
    ]),
    el('p', { class: 'trust-review-note' }, [
      el('span', { class: 'lang-en', text: note.en }),
      el('span', { class: 'lang-ja', text: note.ja }),
    ]),
    reviewMeta ? el('div', { class: 'trust-review-meta', text: reviewMeta }) : null,
    changedSinceReview(review),
    el('div', { class: 'trust-block' }, [
      bilingual('Reviewed / prepared scope', 'レビュー・準備範囲', 'trust-label'),
      el('ul', { class: 'trust-list' }, (record?.scope ?? []).map((item) => el('li', { text: item }))),
    ]),
    el('div', { class: 'trust-block' }, [
      bilingual('Unresolved limitations', '未解決の限界', 'trust-label'),
      el('ul', { class: 'trust-list' }, (record?.unresolvedLimitations ?? []).map((item) => el('li', { text: item }))),
    ]),
    el('div', { class: 'trust-block' }, [
      bilingual('Evidence package / audit trail', '証拠パッケージ / 監査記録', 'trust-label'),
      sourceLinks(record),
    ]),
  ]);
}

export function createTrust({ ui, accountButton = null }) {
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });

  const element = el('main', { class: 'trust-page' }, [
    el('header', { class: 'trust-nav' }, [
      el('a', { class: 'trust-brand', href: LANDING_ROUTE, text: 'Medical 3D Lab' }),
      el('nav', { class: 'trust-nav-links', 'aria-label': 'Trust navigation' }, [
        el('a', { href: EXPLORER_ROUTE }, [
          el('span', { class: 'lang-en', text: 'Models' }),
          el('span', { class: 'lang-ja', text: 'モデル' }),
        ]),
        el('a', { href: LANDING_ROUTE }, [
          el('span', { class: 'lang-en', text: 'Home' }),
          el('span', { class: 'lang-ja', text: 'ホーム' }),
        ]),
      ]),
      el('div', { class: 'trust-nav-actions' }, [accountButton, languageToggle.element]),
    ]),
    el('section', { class: 'trust-hero', id: 'content', tabindex: '-1', 'data-skip-target': '' }, [
      el('p', { class: 'trust-kicker' }, [
        el('span', { class: 'lang-en', text: 'Medical model trust' }),
        el('span', { class: 'lang-ja', text: '医学モデルの信頼性' }),
      ]),
      el('h1', {}, [
        el('span', { class: 'lang-en', text: 'Maturity and medical review are different claims.' }),
        el('span', { class: 'lang-ja', text: '実装の成熟度と、医学レビューは別の情報です。' }),
      ]),
      el('p', { class: 'trust-lead' }, [
        el('span', {
          class: 'lang-en',
          text: 'Every public model shows both. Reviewed does not mean perfect; Pending does not mean useless. The point is to make the evidence boundary and remaining limitations inspectable before you rely on a teaching claim.',
        }),
        el('span', {
          class: 'lang-ja',
          text: '各公開モデルについて両方を表示します。Reviewedは「完全」を意味せず、Pendingも「使えない」を意味しません。何が確認済みで、何が限界として残るのかを、利用前に確認できることを重視しています。',
        }),
      ]),
      el('div', { class: 'trust-principles' }, [
        bilingual('Catalogue maturity = implementation/readiness', 'カタログ成熟度 = 実装・公開準備度'),
        bilingual('Clinical review = versioned medical sign-off', '臨床レビュー = 特定コミットへの医学的署名'),
        bilingual('Evidence package = claims + tests + limitations', '証拠パッケージ = 主張 + テスト + 限界'),
      ]),
    ]),
    el('section', { class: 'trust-grid' }, PUBLIC_SCENES.map((scene) => trustCard(scene))),
    el('footer', { class: 'trust-footer' }, [
      bilingual('Educational conceptual models — not patient-specific diagnosis or treatment.', '教育目的の概念モデルです。個別患者の診断・治療を行うものではありません。'),
      el('nav', { class: 'trust-footer-links', 'aria-label': 'Legal and support / 規約・サポート' }, [
        el('a', { href: '#/terms' }, [
          el('span', { class: 'lang-en', text: 'Terms' }),
          el('span', { class: 'lang-ja', text: '利用規約' }),
        ]),
        el('a', { href: '#/privacy' }, [
          el('span', { class: 'lang-en', text: 'Privacy' }),
          el('span', { class: 'lang-ja', text: 'プライバシー' }),
        ]),
        el('a', { href: '#/commerce' }, [
          el('span', { class: 'lang-en', text: 'Commercial disclosure' }),
          el('span', { class: 'lang-ja', text: '特定商取引法に基づく表記' }),
        ]),
        el('a', { href: '#/support' }, [
          el('span', { class: 'lang-en', text: 'Support' }),
          el('span', { class: 'lang-ja', text: 'サポート' }),
        ]),
      ]),
    ]),
  ]);

  ui.append(skipLink(), element);
  languageToggle.init();
  document.title = 'Medical 3D Lab — model trust';
  return { element };
}
