import clinicalReviews from '../../docs/clinical-reviews/registry.json';
import { EXPLORER_ROUTE, LANDING_ROUTE, PUBLIC_SCENES, sceneRoute, statusById } from '../catalog/index.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { el } from '../utils/dom.js';

const REVIEW_LABELS = {
  reviewed: {
    en: 'Versioned clinical review',
    ja: '臨床レビュー記録済み',
    noteEn: 'A clinical reviewer signed a specific commit. Limitations remain part of the attestation.',
    noteJa: '特定コミットに対する臨床レビュー記録があります。残る限界もレビュー記録の一部です。',
  },
  pending: {
    en: 'Clinical review pending',
    ja: '臨床レビュー待ち',
    noteEn: 'The model/evidence package exists, but no completed current-standard clinical sign-off is recorded.',
    noteJa: 'モデル・証拠パッケージはありますが、現行基準の臨床レビュー完了記録はありません。',
  },
  'legacy-unversioned': {
    en: 'Legacy production — sign-off unversioned',
    ja: '旧Production — 現行形式の署名なし',
    noteEn: 'Evidence has been migrated to the current format without inventing a historical reviewer or commit.',
    noteJa: '証拠パッケージは現行形式へ移行済みですが、過去のレビュアーやコミットを推測して補っていません。',
  },
};

const registry = new Map(clinicalReviews.map((record) => [record.sceneId, record]));
const githubSource = (path) =>
  `https://github.com/konchaaaaan373-wq/medical-3d-lab/blob/main/${path}`;

function bilingual(en, ja, className = '') {
  return el('span', { class: className }, [
    el('span', { class: 'lang-en', text: en }),
    el('span', { class: 'lang-ja', text: ja }),
  ]);
}

function reviewBadge(record) {
  const label = REVIEW_LABELS[record?.reviewStatus] ?? REVIEW_LABELS.pending;
  return el('span', { class: `trust-review-badge is-${record?.reviewStatus ?? 'pending'}` }, [
    el('span', { class: 'lang-en', text: label.en }),
    el('span', { class: 'lang-ja', text: label.ja }),
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

function trustCard(scene, record) {
  const maturity = statusById(scene.status);
  const review = REVIEW_LABELS[record?.reviewStatus] ?? REVIEW_LABELS.pending;
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
          reviewBadge(record),
        ]),
      ]),
      el('a', { class: 'trust-open-model', href: sceneRoute(scene) }, [
        el('span', { class: 'lang-en', text: 'Open model →' }),
        el('span', { class: 'lang-ja', text: 'モデルを開く →' }),
      ]),
    ]),
    el('p', { class: 'trust-review-note' }, [
      el('span', { class: 'lang-en', text: review.noteEn }),
      el('span', { class: 'lang-ja', text: review.noteJa }),
    ]),
    reviewMeta ? el('div', { class: 'trust-review-meta', text: reviewMeta }) : null,
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
    el('section', { class: 'trust-hero' }, [
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
    el('section', { class: 'trust-grid' }, PUBLIC_SCENES.map((scene) => trustCard(scene, registry.get(scene.id)))),
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

  ui.append(element);
  languageToggle.init();
  document.title = 'Medical 3D Lab — model trust';
  return { element };
}
