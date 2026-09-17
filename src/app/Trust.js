import { clinicalReviewPresentation } from '../catalog/clinicalReview.js';
import { inLanguage } from '../utils/language.js';
import { EXPLORER_ROUTE, LANDING_ROUTE, PUBLIC_SCENES, sceneRoute, statusById } from '../catalog/index.js';
import { isSceneReleased } from '../catalog/release.js';
import { betaUnlocked } from './releaseGate.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { el, skipLink } from '../utils/dom.js';
import { prefersReducedMotion } from '../utils/motion.js';

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

/** The id a model's card and TOC entry share. Derived, never written down twice. */
const cardIdFor = (scene) => `trust-${scene.slug}`;

/**
 * One model, `scene` paired with its already-computed review presentation and
 * the id its card and TOC entry share.
 *
 * Built once and handed to both `trustToc` and `trustCard` so the two agree by
 * construction — there is no second place that could list a different set of
 * models, or spell an id differently than the card that has to match it.
 *
 * @param {typeof PUBLIC_SCENES[number]} scene
 */
const trustEntry = (scene) => ({
  scene,
  id: cardIdFor(scene),
  review: clinicalReviewPresentation(scene),
});

/**
 * A model's row in the table of contents.
 *
 * Clicking it does two things a plain anchor cannot: it opens the `<details>`
 * the reader is jumping into (closed sections have no content to land in
 * otherwise) and it moves focus to the summary, so a keyboard reader ends up
 * *in* the record rather than merely scrolled past its top. `preventDefault`
 * keeps the hash itself untouched — `#trust-<slug>` never becomes the
 * document's hash, so there is nothing for the router's `hashchange` handler
 * to (mis)read as a navigation; `router.isInPageAnchor` already treats any
 * hash without a leading `/` this way, this simply never writes one.
 */
function trustTocItem({ scene, id, review }) {
  return el('li', { class: 'trust-toc-item' }, [
    el(
      'a',
      {
        class: 'trust-toc-link',
        href: `#${id}`,
        on: {
          click: (event) => {
            const target = document.getElementById(id);
            if (!target) return;
            event.preventDefault();
            target.open = true;
            target.scrollIntoView?.({
              behavior: prefersReducedMotion() ? 'auto' : 'smooth',
              block: 'start',
            });
            target.querySelector?.('summary')?.focus?.();
          },
        },
      },
      [
        el('span', { class: 'trust-toc-title' }, [
          el('span', { class: 'lang-en', text: scene.titleEn }),
          el('span', { class: 'lang-ja', text: scene.titleJa }),
        ]),
        reviewBadge(review),
      ]
    ),
  ]);
}

/**
 * A shared-section row in the table of contents (Overview, Legal & support).
 *
 * A plain `href="#content"` is a native fragment navigation: the browser
 * would replace the document's hash — `#/trust` — with `#content`, and
 * `#content` is not a route `resolveRoute` knows. A reload, a shared link or
 * history restoring that address lands `main.js` on an unknown hash, which
 * resolves to the default 3D model, not back on Trust. `skipLink()` in
 * `utils/dom.js` solved this exact problem for the same reason; this follows
 * its own pattern rather than inventing a second one: `preventDefault`, move
 * focus to the target itself, then scroll it into view.
 */
function sharedTocLink(targetId, en, ja) {
  return el('li', {}, [
    el(
      'a',
      {
        class: 'trust-toc-shared-link',
        href: `#${targetId}`,
        on: {
          click: (event) => {
            const target = document.getElementById(targetId);
            if (!target) return;
            event.preventDefault();
            target.focus({ preventScroll: true });
            target.scrollIntoView({ block: 'start' });
          },
        },
      },
      [
        el('span', { class: 'lang-en', text: en }),
        el('span', { class: 'lang-ja', text: ja }),
      ]
    ),
  ]);
}

/**
 * The table of contents: one row per model Trust renders, plus the short
 * shared sections that sit outside any `<details>`.
 *
 * `entries` is the same list `createTrust` builds the cards from — this
 * function invents no model of its own, so the two cannot drift apart. That
 * is also what keeps a scene name out of this file: nothing here is written
 * per model, only mapped over whatever the catalogue currently publishes.
 *
 * @param {ReturnType<typeof trustEntry>[]} entries
 */
function trustToc(entries) {
  return el('nav', { class: 'trust-toc', 'aria-label': inLanguage('On this page', 'このページの目次') }, [
    el('p', { class: 'trust-toc-label' }, [
      el('span', { class: 'lang-en', text: `Jump to a model (${entries.length})` }),
      el('span', { class: 'lang-ja', text: `モデルへ移動（${entries.length}件）` }),
    ]),
    el('ol', { class: 'trust-toc-list' }, entries.map(trustTocItem)),
    el('ul', { class: 'trust-toc-shared' }, [
      sharedTocLink('content', 'Overview', '概要'),
      sharedTocLink('trust-legal', 'Legal & support', '規約・サポート'),
    ]),
  ]);
}

/**
 * One model's record, collapsed by default behind a native `<details>`.
 *
 * The `<summary>` carries exactly what the table of contents already showed —
 * the model's name and its review badge — so opening one is not a surprise.
 * Everything else (the maturity badge, the "Open model" link, the note, the
 * scope, the limitations, the sources) lives in the body, which is why it is
 * absent from the accessibility tree while the card is closed: see L-31 in
 * `docs/verification-lessons.md` before adding a *second* interactive control
 * to the summary, because a closed `<details>` hides its body from a reader
 * but not from `getComputedStyle`.
 *
 * @param {ReturnType<typeof trustEntry>} entry
 * @param {{open: boolean}} options
 */
function trustCard({ scene, id, review }, { open }) {
  const maturity = statusById(scene.status);
  const note = REVIEW_NOTES[review.status] ?? REVIEW_NOTES.unrecorded;
  const record = review.record;
  const reviewMeta = record?.reviewedAt
    ? `${record.reviewedAt} · ${record.reviewedCommit?.slice(0, 8) ?? ''}`
    : null;

  return el('details', { class: 'trust-card', id, ...(open ? { open: '' } : {}) }, [
    el('summary', { class: 'trust-card-summary' }, [
      el('h2', { class: 'trust-card-title' }, [
        el('span', { class: 'lang-en', text: scene.titleEn }),
        el('span', { class: 'lang-ja', text: scene.titleJa }),
      ]),
      el('span', { class: 'trust-card-badges' }, [
        el('span', { class: `trust-maturity is-${scene.status}` }, [
          el('span', { class: 'lang-en', text: `Status: ${maturity?.label ?? scene.status}` }),
          el('span', { class: 'lang-ja', text: `公開状態: ${maturity?.labelJa ?? scene.status}` }),
        ]),
        reviewBadge(review),
      ]),
    ]),
    el('div', { class: 'trust-card-body' }, [
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
    ]),
  ]);
}

/**
 * @param {object} options
 * @param {HTMLElement} options.ui
 * @param {HTMLElement|null} [options.accountButton]
 * @param {string|null} [options.focusId] a scene id or slug the route named
 *   (`#/trust?model=<id>`, e.g. from a scene's "Model information" link) —
 *   that model's section opens instead of starting collapsed, and the page
 *   lands scrolled to it.
 */
export function createTrust({ ui, accountButton = null, focusId = null }) {
  const languageToggle = createLanguageToggle((mode) => {
    ui.dataset.lang = mode;
  });

  const entries = PUBLIC_SCENES.map(trustEntry);
  const focusIndex = focusId
    ? entries.findIndex((entry) => entry.scene.id === focusId || entry.scene.slug === focusId)
    : -1;
  const cards = entries.map((entry, index) => trustCard(entry, { open: index === focusIndex }));

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
    trustToc(entries),
    el('section', { class: 'trust-grid' }, cards),
    // `tabindex="-1"` so the shared-section jump above can move focus here,
    // the same reason `.trust-hero` (`id="content"`) already carries one.
    el('footer', { class: 'trust-footer', id: 'trust-legal', tabindex: '-1' }, [
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

  // Land on the record the route named, the way `#/brain-anatomy?structure=…`
  // opens on a structure instead of making the reader find it again. This
  // reads the card `createTrust` already built rather than looking it up by
  // id, so it works the moment the element exists and does not depend on the
  // document having actually mounted `element` yet.
  if (focusIndex >= 0) cards[focusIndex].scrollIntoView?.({ block: 'start' });

  return { element };
}
