import { clinicalReviewPresentation } from '../catalog/clinicalReview.js';
import { inLanguage } from '../utils/language.js';
import { PUBLIC_SCENES, sceneRoute, statusById } from '../catalog/index.js';
import { isSceneReleased } from '../catalog/release.js';
import { betaUnlocked } from './releaseGate.js';
import { createLanguageToggle } from '../components/LanguageToggle.js';
import { el, skipLink } from '../utils/dom.js';
import { createShellHeader } from '../components/ShellHeader.js';

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
 * Built once and handed to both the filter and `trustCard` so the two agree by
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
 * The control that narrows the records, replacing the list that duplicated them.
 *
 * ## What was here
 *
 * A table of contents: seventy chips, each the name of a model and its review
 * badge, above seventy cards carrying the same name and the same badge. Two
 * structures for one set. A reader looking for the heart scanned seventy chips,
 * pressed one, and arrived at a card that repeated what the chip had said —
 * and a reader who did not already know what they were looking for had no
 * purchase on either list, because seventy names in review order is not an
 * index, it is the data with a heading on it.
 *
 * ## What is here instead
 *
 * One structure, narrowed in place. A text field matches a model's name in
 * either language, and a two-way split separates the models that can be opened
 * today from the ones still being built — which is the one distinction a
 * visitor can act on, and the one the page never made. Review state stays on
 * each record, where it belongs, instead of being the axis the whole page is
 * organised by.
 *
 * It is a filter rather than a second navigation on purpose. Adding search
 * *beside* a jump list would have made three structures for one set. And it is
 * the shape that survives the catalogue growing: at seventy models the jump
 * list was already unusable, and nothing about it would have been better at two
 * hundred.
 *
 * @param {ReturnType<typeof trustEntry>[]} entries
 * @param {Map<string, HTMLElement>} cardsById
 */
function trustFilter(entries, cardsById) {
  const field = el('input', {
    class: 'trust-filter-field',
    type: 'search',
    id: 'trust-filter',
    autocomplete: 'off',
    placeholder: inLanguage('Model name', 'モデル名'),
  });

  const SCOPES = [
    { id: 'all', en: 'All', ja: 'すべて' },
    { id: 'open', en: 'Published', ja: '公開中' },
    { id: 'building', en: 'In development', ja: '開発中' },
  ];
  let scope = 'all';

  const count = el('p', {
    class: 'trust-filter-count',
    role: 'status',
    'aria-live': 'polite',
  });

  /**
   * What the page says when the filter matches nothing.
   *
   * Without it, narrowing to zero left a heading, a search box and seven
   * thousand pixels of nothing, with the only explanation a grey line reading
   * `71件中 0件`. A reader who mistypes a model name gets a page that looks
   * broken, and the control that caused it is above the fold while the empty
   * space is below.
   *
   * It offers the way out rather than only describing the state: the button is
   * the same `reset()` a deep link uses, so there is one way to undo a filter.
   */
  const clearButton = el(
    'button',
    { class: 'trust-empty-clear', type: 'button', on: { click: () => reset() } },
    [
      el('span', { class: 'lang-en', text: 'Show every model' }),
      el('span', { class: 'lang-ja', text: 'すべてのモデルを表示' }),
    ]
  );
  const empty = el('div', { class: 'trust-empty', hidden: '' }, [
    el('p', { class: 'trust-empty-line' }, [
      el('span', { class: 'lang-en', text: 'No model matches that.' }),
      el('span', { class: 'lang-ja', text: '該当するモデルがありません。' }),
    ]),
    clearButton,
  ]);

  const buttons = SCOPES.map((item) =>
    el(
      'button',
      {
        class: 'trust-filter-scope',
        type: 'button',
        'aria-pressed': String(item.id === scope),
        on: {
          click: () => {
            scope = item.id;
            for (const [id, button] of pressed) button.setAttribute('aria-pressed', String(id === scope));
            apply();
          },
        },
      },
      [
        el('span', { class: 'lang-en', text: item.en }),
        el('span', { class: 'lang-ja', text: item.ja }),
      ]
    )
  );
  const pressed = new Map(SCOPES.map((item, index) => [item.id, buttons[index]]));

  function apply() {
    const needle = field.value.trim().toLowerCase();
    let shown = 0;
    for (const entry of entries) {
      const card = cardsById.get(entry.id);
      if (!card) continue;
      // `isSceneReleased`, not "can this reader open it". The split describes
      // the *model's* publication state, which is what this page is about; a
      // preview unlock changes what a developer may open and must not change
      // what the ledger says is published, or the control reads 70/0 for
      // exactly the people who need it to be honest.
      const published = isSceneReleased(entry.scene);
      const inScope = scope === 'all' || (scope === 'open') === published;
      const matches =
        !needle ||
        entry.scene.titleEn.toLowerCase().includes(needle) ||
        entry.scene.titleJa.toLowerCase().includes(needle) ||
        entry.scene.slug.includes(needle);
      const visible = inScope && matches;
      card.hidden = !visible;
      if (visible) shown += 1;
    }
    count.replaceChildren(
      el('span', { class: 'lang-en', text: `${shown} of ${entries.length} models` }),
      el('span', { class: 'lang-ja', text: `${entries.length}件中 ${shown}件` })
    );
    empty.hidden = shown > 0;
  }

  function reset() {
    field.value = '';
    scope = 'all';
    for (const [id, button] of pressed) button.setAttribute('aria-pressed', String(id === 'all'));
    apply();
    field.focus?.();
  }

  field.addEventListener('input', apply);
  apply();

  return {
    empty,
    element: el('div', { class: 'trust-filter' }, [
      el('label', { class: 'trust-filter-label', for: 'trust-filter' }, [
        el('span', { class: 'lang-en', text: 'Find a model' }),
        el('span', { class: 'lang-ja', text: 'モデルを探す' }),
      ]),
      field,
      el(
        'div',
        {
          class: 'trust-filter-scopes',
          role: 'group',
          'aria-label': inLanguage('Availability', '公開状態'),
        },
        buttons
      ),
      count,
    ]),
    /** Undo any narrowing, so a deep link to one record is never filtered out. */
    reset,
  };
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
 *   (`#/trust?model=<id>`, e.g. from a scene's "sources & limits" link) —
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
  const cardsById = new Map(entries.map((entry, index) => [entry.id, cards[index]]));
  const filter = trustFilter(entries, cardsById);

  const element = el('main', { class: 'trust-page' }, [
    createShellHeader({
      current: 'trust',
      accountButton,
      languageToggle: languageToggle.element,
    }),
    el('section', { class: 'trust-hero', id: 'content', tabindex: '-1', 'data-skip-target': '' }, [
      el('p', { class: 'trust-kicker' }, [
        el('span', { class: 'lang-en', text: 'Publication & review' }),
        el('span', { class: 'lang-ja', text: '公開とレビュー' }),
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
    filter.element,
    filter.empty,
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
  if (focusIndex >= 0) {
    // The filter starts wide open, but a future default — or a remembered one
    // — must not be able to hide the record the route asked for. Asking for it
    // explicitly is one line; discovering that a deep link silently showed an
    // empty page is a bug report.
    filter.reset();
    cards[focusIndex].scrollIntoView?.({ block: 'start' });
    cards[focusIndex].querySelector?.('summary')?.focus?.();
  }

  return { element, filter };
}
