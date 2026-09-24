import { clinicalReviewPresentation } from '../catalog/clinicalReview.js';
import { inLanguage } from '../utils/language.js';
import { PUBLIC_SCENES, sceneRoute } from '../catalog/index.js';
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
 * The two badges, said once in words a reader did not have to learn.
 *
 * `公開状態: アルファ` and `レビュー待ち` are this repository's vocabulary, and
 * they are load-bearing — the maturity axis and the clinical-review axis are
 * deliberately separate and a badge that merged them would be a claim neither
 * of them makes (`docs/architecture/intended-use-and-model-provenance.md`). So
 * the badges stay exactly as they are and this is added beside them.
 *
 * Measured on the record a reader reaches from inside a model: the first
 * screenful read `Status: Alpha / 公開状態: アルファ / Pending / レビュー待ち`,
 * four internal terms and no sentence, in answer to "what is this model based
 * on". Both facts matter to a student and neither of them is self-explanatory.
 *
 * @param {object} scene
 * @param {{status: string}} review
 */

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

  function apply() {
    const needle = field.value.trim().toLowerCase();
    let shown = 0;
    for (const entry of entries) {
      const card = cardsById.get(entry.id);
      if (!card) continue;
      const matches =
        !needle ||
        entry.scene.titleEn.toLowerCase().includes(needle) ||
        entry.scene.titleJa.toLowerCase().includes(needle) ||
        entry.scene.slug.includes(needle);
      const visible = matches;
      card.hidden = !visible;
      if (visible) shown += 1;
    }
    count.replaceChildren(
      el('span', { class: 'lang-en', text: `${shown} published models` }),
      el('span', { class: 'lang-ja', text: `公開中のモデル ${shown}件` })
    );
    empty.hidden = shown > 0;
  }

  /**
   * Undo any narrowing.
   *
   * `focus` is opt-out because the two callers want opposite things. The
   * "show every model" button is a press: the reader is standing at the
   * filter and focus belongs back in it. A deep link to one model's record is
   * not a press on anything — it resets the ledger below out of caution, and
   * moving focus into a search field three screenfuls under the record the
   * reader actually asked for would undo the whole point of putting it first.
   */
  function reset({ focus = true } = {}) {
    field.value = '';
    apply();
    if (focus) field.focus?.();
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
function trustCard({ scene, id, review }, { open, lead = false }) {
  const note = REVIEW_NOTES[review.status] ?? REVIEW_NOTES.unrecorded;
  const record = review.record;
  const reviewMeta = record?.reviewedAt
    ? `${record.reviewedAt} · ${record.reviewedCommit?.slice(0, 8) ?? ''}`
    : null;

  const badges = el('span', { class: 'trust-card-badges' }, [
    reviewBadge(review),
  ]);

  /**
   * The record of the model the page is *about* is not a disclosure.
   *
   * As one it repeated the page's own `<h1>` two lines under it, offered a
   * collapse control for the one thing nobody came here to collapse, and
   * carried a second "モデルを開く →" beside the hero's "← 3Dモデルに戻る" —
   * two links to one place on one screen. Measured on a 390 px phone: the
   * model's name appeared twice in the first 600 px.
   *
   * So in lead position the summary goes and the badges move into the body,
   * which is where they were being read from anyway.
   */
  const head = lead
    ? [el('div', { class: 'trust-card-lead-badges' }, [badges])]
    : [
        el('summary', { class: 'trust-card-summary' }, [
          el('h2', { class: 'trust-card-title' }, [
            el('span', { class: 'lang-en', text: scene.titleEn }),
            el('span', { class: 'lang-ja', text: scene.titleJa }),
          ]),
          badges,
        ]),
      ];

  return el(lead ? 'section' : 'details', {
    class: `trust-card${lead ? ' is-lead' : ''}`,
    id,
    ...(open && !lead ? { open: '' } : {}),
  }, [
    ...head,
    el('div', { class: 'trust-card-body' }, [
      // Trust stays open while most of what it describes is not: saying which
      // models are reviewed is more honest with the closed ones listed than
      // with the page hidden. What it must not do is offer to open one.
      //
      // Not in lead position: the hero above it already carries
      // "← 3Dモデルに戻る" to the same route.
      lead
        ? null
        : betaUnlocked() || isSceneReleased(scene)
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
  const publishedEntries = entries.filter((entry) => isSceneReleased(entry.scene));
  /**
   * The model the reader came here about, if the route named one.
   *
   * ## Why it is taken out of the list rather than scrolled to
   *
   * `#/trust?model=brain-anatomy` is what a reader presses from *inside* the
   * brain, and the question they pressed it with is about the brain. What
   * arrived was this page: a heading reading "model status and medical
   * review", a paragraph about what the page publishes, three definitions, a
   * search field, `71 of 71 models`, and the brain's own record as one
   * collapsible row among seventy-one. Opened by hand, the first screenful of
   * an answer to "what is this model based on" was four pieces of internal
   * vocabulary and a filter.
   *
   * Scrolling to the row was the previous answer and it is not enough — and,
   * measured, it did not even hold: the swap resets the scroll after the
   * surface mounts, so the card's own `scrollIntoView` was undone on every
   * arrival that was not a full document load. A record you have to be carried
   * to is still a record inside somebody else's page.
   *
   * So when the route names a model, this page **is** that model's record, and
   * the ledger of every other model follows it under its own heading. Nothing
   * is duplicated: the focused entry is removed from the list below rather
   * than copied above it, which is also why the filter is handed `others` —
   * its count has to describe what it can actually narrow.
   */
  const focused = focusId
    ? entries.find((entry) => entry.scene.id === focusId || entry.scene.slug === focusId) ?? null
    : null;
  const others = focused
    ? publishedEntries.filter((entry) => entry !== focused)
    : publishedEntries;
  const cards = others.map((entry) => trustCard(entry, { open: false }));
  const cardsById = new Map(others.map((entry, index) => [entry.id, cards[index]]));
  const filter = trustFilter(others, cardsById);

  const leadCard = focused ? trustCard(focused, { open: true, lead: true }) : null;
  const canOpenFocused =
    focused && (betaUnlocked() || isSceneReleased(focused.scene));

  const element = el('main', { class: 'trust-page' }, [
    createShellHeader({
      current: 'trust',
      accountButton,
      languageToggle: languageToggle.element,
    }),
    focused
      ? el('section', {
          class: 'trust-hero is-model',
          id: 'content',
          tabindex: '-1',
          'data-skip-target': '',
        }, [
          el('p', { class: 'trust-kicker' }, [
            el('span', { class: 'lang-en', text: "This model's record" }),
            el('span', { class: 'lang-ja', text: 'このモデルの記録' }),
          ]),
          el('h1', {}, [
            el('span', { class: 'lang-en', text: focused.scene.titleEn }),
            el('span', { class: 'lang-ja', text: focused.scene.titleJa }),
          ]),
          el('p', { class: 'trust-lead' }, [
            el('span', {
              class: 'lang-en',
              text: 'What this model is based on, how far it has been checked, and what has not been checked yet.',
            }),
            el('span', {
              class: 'lang-ja',
              text: 'このモデルが何にもとづいているか、どこまで確かめられているか、まだ確かめられていないことは何かを掲載しています。',
            }),
          ]),
          // The way back to the thing the question was about. Back does this
          // too, and a reader who followed a link from a model and then read
          // three screenfuls of record should not have to remember that.
          canOpenFocused
            ? el('a', { class: 'trust-back-to-model', href: sceneRoute(focused.scene) }, [
                el('span', { class: 'lang-en', text: `← Back to the ${focused.scene.titleEn} model` }),
                el('span', { class: 'lang-ja', text: '← 3Dモデルに戻る' }),
              ])
            : null,
        ].filter(Boolean))
      : el('section', { class: 'trust-hero', id: 'content', tabindex: '-1', 'data-skip-target': '' }, [
          el('p', { class: 'trust-kicker' }, [
            el('span', { class: 'lang-en', text: 'Medical evidence' }),
            el('span', { class: 'lang-ja', text: '医学的根拠' }),
          ]),
          el('h1', {}, [
            el('span', { class: 'lang-en', text: 'Medical review and evidence' }),
            el('span', { class: 'lang-ja', text: '医学レビューと根拠' }),
          ]),
          el('p', { class: 'trust-lead' }, [
            el('span', {
              class: 'lang-en',
              text: 'For each published model, you can review its medical review record, checked scope, unresolved limitations and source files.',
            }),
            el('span', {
              class: 'lang-ja',
              text: '公開中の各モデルについて、医学レビュー、確認範囲、未解決の限界、参照ファイルを確認できます。',
            }),
          ]),
          el('div', { class: 'trust-principles' }, [
            bilingual('Medical review: reviewed version and date', '医学レビュー：確認したバージョンと日付'),
            bilingual('Evidence: sources, tests and limitations', '根拠：出典、テスト、限界'),
          ]),
        ]),
    leadCard ? el('section', { class: 'trust-lead-record' }, [leadCard]) : null,
    // The ledger, named as what it now is: everything except the record above.
    focused
      ? el('h2', { class: 'trust-others-heading' }, [
          el('span', { class: 'lang-en', text: 'Records for every other model' }),
          el('span', { class: 'lang-ja', text: 'ほかのモデルの記録' }),
        ])
      : null,
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
  ].filter(Boolean));

  ui.append(skipLink(), element);
  languageToggle.init();
  // The tab says which record this is. A reader with the model in one tab and
  // its record in another had two tabs called "model information".
  document.title = focused
    ? `Medical 3D Lab — ${focused.scene.titleJa}`
    : 'Medical 3D Lab — medical review and evidence';

  // Land on the record the route named, the way `#/brain-anatomy?structure=…`
  // opens on a structure instead of making the reader find it again. This
  // reads the card `createTrust` already built rather than looking it up by
  // id, so it works the moment the element exists and does not depend on the
  // document having actually mounted `element` yet.
  // No scroll and no focus move any more: the record the route named is the
  // top of the page, so there is nowhere to be carried to. The filter is still
  // reset explicitly — it narrows the *other* models, and a remembered or
  // future default must never be able to make the ledger below look empty to
  // somebody who arrived by deep link.
  if (focused) filter.reset({ focus: false });

  return { element, filter };
}
