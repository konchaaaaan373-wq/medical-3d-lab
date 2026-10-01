import { el } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { statusById } from '../catalog/taxonomy.js';
import { clinicalReviewPresentation, reviewDateLabel } from '../catalog/clinicalReview.js';
import { relatedScenesFor, sceneById, sceneRoute } from '../catalog/index.js';
import { anatomyChecksFor } from '../catalog/anatomyLinks.js';
import { foldsAboutThisModel, modelLocation } from '../app/modelLocation.js';
import { sceneOpen } from '../app/releaseGate.js';
import '../styles/clinical-review.css';
import '../styles/scene-pairing.css';


/**
 * The link between an anatomy scene and the disease that happens in it.
 *
 * The pairing is declared once, in the catalogue, on both ends — so this needs
 * no list of its own and no scene has to know it is paired. Which end is which
 * is read off the scene rather than declared twice: the row with a `disease` is
 * what goes wrong, the row without one is the anatomy it goes wrong in.
 *
 * It is here rather than in a surface of its own because the journey it exists
 * for is "look at the liver, then look at what portal hypertension does to it,
 * then come back" — and coming back is the half that gets lost when the link
 * lives on a landing page the reader has already left.
 *
 * Release-gated like every other route: a link to a model this build will not
 * open is a trapdoor, so on a locked build there is no link rather than a link
 * to a "TO BE UPDATED" page.
 */
function pairedSceneLinks(meta) {
  const related = relatedScenesFor(meta.id).filter(sceneOpen);
  if (related.length === 0) return null;
  // Which end this scene is, read from the catalogue rather than from the
  // scene's own metadata: a scene's `META` describes what it draws, and whether
  // there is a disease in it is a catalogue fact.
  const isDisease = Boolean(sceneById(meta.id)?.disease);

  return el('nav', { class: 'title-pairing', 'aria-label': 'Related model / 関連モデル' }, [
    el('p', { class: 'title-pairing-lead' }, [
      el('span', { class: 'lang-en', text: isDisease ? 'The anatomy behind it' : 'What goes wrong here' }),
      el('span', { class: 'lang-ja', text: isDisease ? 'この病態が起きる場所の解剖' : 'この臓器で起きること' }),
    ]),
    ...related.map((scene) =>
      el('a', { class: 'title-pairing-link', href: sceneRoute(scene) }, [
        el('span', { class: 'lang-en', text: scene.titleEn ?? scene.title ?? scene.id }),
        el('span', { class: 'lang-ja', text: scene.titleJa ?? scene.titleEn ?? scene.id }),
      ])
    ),
  ]);
}

/**
 * 「このモデルについて」 — About this model — folded into one quiet line.
 *
 * Everything a reader is owed about how far to trust the figures is inside it
 * (ADR 2026-09-30): what kind of model this is and what it is not for, what it
 * shows and does not (the scene's scope panel, put inside by the shell), its
 * maturity, its medical-review state and date, and the link to its own record.
 * It is closed by default because it is a reference, not the first thing to
 * read — and it is one press away because a reader deciding whether to believe
 * a number wants to know now. The maturity stays on the closed line in plain
 * text: a model that has not been through review keeps saying so unopened.
 *
 * It was 「根拠と限界」; the contents are the same records.
 */
function aboutFold(status, badges, { lead = true, anatomy = null } = {}) {
  // The contents are one body that lies over the model rather than pushing it
  // down: the camera frames the model into the room the title card leaves, and
  // a reference the reader opened must not zoom the heart to make room for
  // itself. A sheet on a phone, a panel under the line on a wide window.
  const close = el('button', { class: 'title-about-close', type: 'button' }, [
    el('span', { class: 'lang-en', text: 'Close' }),
    el('span', { class: 'lang-ja', text: '閉じる' }),
  ]);
  const body = el('div', { class: 'title-about-body' }, [
    lead
      ? el('p', { class: 'title-about-lead' }, [
          el('span', {
            class: 'lang-en',
            text: 'An educational model of the mechanism. It does not predict any individual patient’s condition, and is not for diagnosis or treatment decisions.',
          }),
          el('span', {
            class: 'lang-ja',
            text: '病態生理の概念を理解するための教育用モデルです。個々の患者の状態を定量的に予測するものではなく、診断・治療の判断には使えません。',
          }),
        ])
      : null,
    // On a phone the title line has room for one row over the model, so the
    // way to the anatomy moves in here (brand.css); on a wide window this copy
    // is hidden and the one under the title shows.
    anatomy ? el('div', { class: 'title-about-anatomy' }, [anatomy]) : null,
    badges,
    close,
  ]);
  const summary = el('summary', { class: 'title-trust-summary' }, [
    el('span', { class: 'lang-en', text: 'About this model' }),
    el('span', { class: 'lang-ja', text: 'このモデルについて' }),
    status?.badge
      ? el('span', { class: 'title-trust-maturity' }, [
          el('span', { class: 'lang-en', text: status.label }),
          el('span', { class: 'lang-ja', text: status.labelJa }),
        ])
      : null,
  ]);
  const fold = el('details', { class: 'title-trust-fold title-about' }, [summary, body]);
  const shut = () => {
    fold.open = false;
    summary.focus?.({ preventScroll: true });
  };
  close.addEventListener('click', shut);
  // On a wide window the panel hangs from the line that opened it. It is
  // fixed rather than absolute because the column it sits in scrolls, and a
  // scroll box clips what hangs out of it; so its place is read off the
  // summary when it opens. A phone's sheet is placed by the stylesheet.
  const place = () => {
    const wide = globalThis.matchMedia?.('(min-width: 721px)').matches ?? true;
    if (!fold.open || !wide) {
      body.style.top = '';
      body.style.left = '';
      return;
    }
    const rect = summary.getBoundingClientRect?.();
    if (!rect) return;
    body.style.top = `${Math.round(rect.bottom + 6)}px`;
    body.style.left = `${Math.round(Math.max(12, rect.left))}px`;
  };
  // The column the card sits in fades its last pixels with a mask while it
  // scrolls (`.top-left.has-more`), and a mask clips everything inside it —
  // fixed descendants included. The body is placed below that column on a
  // phone (a sheet at the foot of the screen), so with the fade on it was not
  // painted at all. The column is told while the fold is open, and drops it.
  const markColumn = () => fold.closest?.('.top-left')?.classList.toggle('is-reading-about', fold.open);
  fold.addEventListener('toggle', markColumn);
  fold.addEventListener('toggle', place);
  globalThis.addEventListener?.('resize', place, { passive: true });
  body.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    event.stopPropagation();
    shut();
  });
  return fold;
}

/**
 * 「心臓の解剖を確認」 — the anatomy this disease model is about, one press away.
 *
 * Read off the catalogue (`anatomyLinks.js`) and filtered by the release gate
 * like every other link: an organ whose anatomy is not open has no link rather
 * than a link to a "to be updated" page.
 */
function anatomyCheck(checks) {
  if (checks.length === 0) return null;
  return el('nav', { class: 'title-anatomy-check', 'aria-label': inLanguage('Anatomy', '解剖') }, checks.map(({ scene, organ }) =>
    el('a', { class: 'title-anatomy-link', href: sceneRoute(scene) }, [
      el('span', { class: 'lang-en', text: `Check the ${(organ?.label ?? scene.titleEn).toLowerCase()} anatomy` }),
      el('span', { class: 'lang-ja', text: `${organ?.labelJa ?? scene.titleJa}の解剖を確認` }),
      el('span', { class: 'title-anatomy-arrow', 'aria-hidden': 'true', text: '→' }),
    ])
  ));
}

/**
 * Where the model sits, above its name: 「病態モデル / 循環」 on a disease model.
 * The first part is the way back to the others of that kind (`#/models`); the
 * second says the system. The title that follows is the current place, so it
 * is not repeated. An anatomy model has none — its header's organ strip says
 * where it is, and a second line here covers the model (`modelLocation`).
 */
function categoryTrail(meta) {
  const location = modelLocation(sceneById(meta.id));
  if (!location) return null;
  const { kind, parent, where } = location;
  // A second screen of the same model (`?view=detail`) names the first one
  // here, so the way back to it is a link rather than the Back button.
  const view = meta.viewTrail;
  return el('nav', { class: `title-trail is-${kind}`, 'aria-label': inLanguage('Breadcrumb', '現在地') }, [
    el('a', { class: 'title-trail-parent', href: parent.href }, [
      el('span', { class: 'lang-en', text: parent.en }),
      el('span', { class: 'lang-ja', text: parent.ja }),
    ]),
    where ? el('span', { class: 'title-trail-separator', 'aria-hidden': 'true', text: '/' }) : null,
    where
      ? el('span', { class: 'title-trail-system' }, [
          el('span', { class: 'lang-en', text: where.en }),
          el('span', { class: 'lang-ja', text: where.ja }),
        ])
      : null,
    view ? el('span', { class: 'title-trail-separator', 'aria-hidden': 'true', text: '/' }) : null,
    view
      ? el('a', { class: 'title-trail-parent title-trail-view', href: view.href, dataset: { control: 'view-default' } }, [
          el('span', { class: 'lang-en', text: `${meta.title}: ${view.name.en}` }),
          el('span', { class: 'lang-ja', text: `${meta.titleJa}：${view.name.ja}` }),
        ])
      : null,
  ]);
}

/** Top-left identity block. Sized to survive a 1080x1350 crop for social posts. */
export function createTitleCard(meta) {
  // Catalogue maturity and clinical review are deliberately separate. A mature
  // production implementation can still pre-date the current commit-level
  // clinical-attestation standard, and a direct scene URL must not hide that.
  const status = statusById(meta.status ?? 'production');
  const maturityBadge =
    status?.badge &&
    el('span', { class: `status-badge is-${status.id}`, title: status.note }, [
      el('span', { class: 'lang-en', text: status.label }),
      el('span', { class: 'lang-ja', text: status.labelJa }),
    ]);

  // Prototype is already an explicit experimental warning and does not belong
  // to the public Clinical Review shelf. Every non-prototype scene shows the
  // registry state even when its maturity badge (Production) is intentionally
  // hidden, so Heart Failure/Amyloid cannot look silently version-reviewed.
  const review = meta.status === 'prototype' ? null : clinicalReviewPresentation(meta.id);
  const reviewBadge =
    review &&
    el(
      'span',
      {
        class: `clinical-review-badge is-${review.status}`,
        // A tooltip holds one language, and this one explains a distinction a
        // reader is entitled to be confused by — so it says it in theirs.
        title: inLanguage(
          'Clinical-review attestation is tracked separately from model maturity.',
          '臨床レビューの記録は、モデルの成熟度とは別に管理しています。'
        ),
      },
      [
        el('span', { class: 'lang-en', text: review.en }),
        el('span', { class: 'lang-ja', text: review.ja }),
      ]
    );

  // Trust only carries a card for a scene in its own `PUBLIC_SCENES` list —
  // the same non-prototype set `review` is already gated on above — so this
  // link only appears where landing on it would actually open something.
  // `?model=<id>` is read by `router.trustFocusOf` / `Trust.js`'s `focusId`:
  // that scene's record opens instead of the reader finding it themselves
  // among every other model's.
  const modelInfoLink =
    review &&
    el('a', { class: 'title-trust-link', href: `#/trust?model=${encodeURIComponent(meta.id)}` }, [
      // Named for what it opens: *this* model's record. "Model information",
      // pressed with a model on screen, promised something about that model and
      // arrived at a ledger of seventy — the same words appeared four times on
      // the landing page pointing at the same ledger, which is how the label
      // came to mean nothing in particular.
      el('span', { class: 'lang-en', text: 'This model’s evidence record →' }),
      el('span', { class: 'lang-ja', text: 'このモデルの根拠の記録 →' }),
    ]);

  // The date the model was last signed, or which kind of "no date" it is —
  // said in words, because a blank reads as "recently" (`reviewDateLabel`).
  const dateLabel = reviewDateLabel(review);
  const reviewDate =
    dateLabel &&
    el('span', { class: 'title-review-date' }, [
      el('span', { class: 'lang-en', text: dateLabel.en }),
      el('span', { class: 'lang-ja', text: dateLabel.ja }),
    ]);

  const trustBadges =
    maturityBadge || reviewBadge || modelInfoLink
      ? el('div', { class: 'title-trust-badges', 'aria-label': 'Model trust status' }, [
          maturityBadge || null,
          reviewBadge || null,
          reviewDate || null,
          modelInfoLink || null,
        ])
      : null;

  // The badges sit outside both title lines on purpose. Nested in the English
  // heading they disappeared in Japanese-only mode, which hides `.lang-en` —
  // taking the badge away from the readers its Japanese label was written for.
  const trail = categoryTrail(meta);
  // Every disease model folds its trust into 「このモデルについて」 (ADR
  // 2026-09-30): the generic shell, not a per-scene opt-in. A scene may still
  // ask for it (`titleCard.foldTrust`), and an anatomy scene keeps its row.
  const fold = foldsAboutThisModel(sceneById(meta.id), meta);
  // Read once; drawn twice — under the title on a wide window, inside the
  // sheet on a phone (a node can be in one place only).
  const anatomyChecks = anatomyChecksFor(sceneById(meta.id)).filter((check) => sceneOpen(check.scene));
  return el('header', { class: `panel title-card${trail ? ' has-trail' : ''}` }, [
    trail,
    el('h1', { class: 'title lang-en', text: meta.title }),
    el('p', { class: 'title-ja lang-ja', text: meta.titleJa }),
    fold && trustBadges ? aboutFold(status, trustBadges, { anatomy: anatomyCheck(anatomyChecks) }) : trustBadges,
    el('p', { class: 'subtitle' }, [
      el('span', { class: 'lang-ja', text: meta.subtitleJa }),
      el('span', { class: 'lang-en', text: meta.subtitle }),
    ]),
    anatomyCheck(anatomyChecks),
    pairedSceneLinks(meta),
  ].filter(Boolean));
}
