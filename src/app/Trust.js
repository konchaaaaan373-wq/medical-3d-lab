import { clinicalReviewPresentation } from '../catalog/clinicalReview.js';
import { inLanguage } from '../utils/language.js';
import { EXPLORER_ROUTE, LANDING_ROUTE, PUBLIC_SCENES, sceneRoute, statusById } from '../catalog/index.js';
import { isSceneReleased } from '../catalog/release.js';
import { betaUnlocked } from './releaseGate.js';
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
    en: 'A clinical reviewer checked the recorded version. Files in the reviewed scope have not changed since.',
    ja: '記録されたバージョンへの臨床レビューが完了しており、確認範囲のファイルはその後変更されていません。',
  },
  stale: {
    en: 'A review exists, but files in its recorded scope changed afterwards. The changed paths are listed below.',
    ja: 'レビュー記録はありますが、確認範囲のファイルがその後変更されています。変更されたパスを下に示します。',
  },
  pending: {
    en: 'The model and its supporting files exist, but no completed clinical review is recorded for the current version.',
    ja: 'モデルと参照ファイルはありますが、現行版への臨床レビュー完了記録はありません。',
  },
  'legacy-unversioned': {
    en: 'Supporting files use the current format, but no historical reviewer or reviewed version is recorded.',
    ja: '参照ファイルは現行形式ですが、過去のレビュアーや確認済みバージョンの記録はありません。',
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
            el('span', { class: 'lang-en', text: `Status: ${maturity?.label ?? scene.status}` }),
            el('span', { class: 'lang-ja', text: `公開状態: ${maturity?.labelJa ?? scene.status}` }),
          ]),
          reviewBadge(review),
        ]),
      ]),
      // Trust stays open while most of what it describes is not: saying which
      // models are reviewed is more honest with the closed ones listed than
      // with the page hidden. What it must not do is offer to open one.
      betaUnlocked() || isSceneReleased(scene)
        ? el('a', { class: 'trust-open-model', href: sceneRoute(scene) }, [
            el('span', { class: 'lang-en', text: 'Open model →' }),
            el('span', { class: 'lang-ja', text: 'モデルを開く →' }),
          ])
        : el('span', { class: 'trust-open-model is-locked' }, [
            el('span', { class: 'lang-en', text: 'To be updated' }),
            el('span', { class: 'lang-ja', text: '準備中' }),
          ]),
    ]),
    el('p', { class: 'trust-review-note' }, [
      el('span', { class: 'lang-en', text: note.en }),
      el('span', { class: 'lang-ja', text: note.ja }),
    ]),
    reviewMeta ? el('div', { class: 'trust-review-meta', text: reviewMeta }) : null,
    changedSinceReview(review),
    el('div', { class: 'trust-block' }, [
      bilingual('Review / preparation scope', '確認・準備範囲', 'trust-label'),
      el('ul', { class: 'trust-list' }, (record?.scope ?? []).map((item) => el('li', { text: item }))),
    ]),
    el('div', { class: 'trust-block' }, [
      bilingual('Unresolved limitations', '未解決の限界', 'trust-label'),
      el('ul', { class: 'trust-list' }, (record?.unresolvedLimitations ?? []).map((item) => el('li', { text: item }))),
    ]),
    el('div', { class: 'trust-block' }, [
      bilingual('Source files', '参照ファイル', 'trust-label'),
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
      el('nav', { class: 'trust-nav-links', 'aria-label': inLanguage('Trust navigation', '出典と根拠のナビゲーション') }, [
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
        el('span', { class: 'lang-en', text: 'Model information' }),
        el('span', { class: 'lang-ja', text: 'モデル情報' }),
      ]),
      el('h1', {}, [
        el('span', { class: 'lang-en', text: 'Model status and medical review' }),
        el('span', { class: 'lang-ja', text: 'モデルの公開状態と医学レビュー' }),
      ]),
      el('p', { class: 'trust-lead' }, [
        el('span', {
          class: 'lang-en',
          text: 'For each model, we publish its implementation status, medical review, reviewed scope, unresolved limitations and source files.',
        }),
        el('span', {
          class: 'lang-ja',
          text: '各モデルの実装・公開状態、医学レビュー、確認範囲、未解決の限界、参照ファイルを掲載しています。',
        }),
      ]),
      el('div', { class: 'trust-principles' }, [
        bilingual('Status: current implementation and availability', '公開状態：現在の実装と利用可否'),
        bilingual('Medical review: reviewed version and date', '医学レビュー：確認したバージョンと日付'),
        bilingual('Evidence: sources, tests and limitations', '根拠：出典、テスト、限界'),
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
  document.title = 'Medical 3D Lab — model information';
  return { element };
}
