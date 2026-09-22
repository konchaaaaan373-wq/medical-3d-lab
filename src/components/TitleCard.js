import { el } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { statusById } from '../catalog/taxonomy.js';
import { clinicalReviewPresentation } from '../catalog/clinicalReview.js';
import { relatedScenesFor, sceneById, sceneRoute } from '../catalog/index.js';
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
      el('span', { class: 'lang-en', text: 'Sources & limits of this model →' }),
      el('span', { class: 'lang-ja', text: 'このモデルの根拠と限界 →' }),
    ]);

  const trustBadges =
    maturityBadge || reviewBadge || modelInfoLink
      ? el('div', { class: 'title-trust-badges', 'aria-label': 'Model trust status' }, [
          maturityBadge || null,
          reviewBadge || null,
          modelInfoLink || null,
        ])
      : null;

  // The badges sit outside both title lines on purpose. Nested in the English
  // heading they disappeared in Japanese-only mode, which hides `.lang-en` —
  // taking the badge away from the readers its Japanese label was written for.
  return el('header', { class: 'panel title-card' }, [
    el('p', { class: 'eyebrow', text: 'medical-3d-lab' }),
    el('h1', { class: 'title lang-en', text: meta.title }),
    el('p', { class: 'title-ja lang-ja', text: meta.titleJa }),
    trustBadges,
    el('p', { class: 'subtitle' }, [
      el('span', { class: 'lang-ja', text: meta.subtitleJa }),
      el('span', { class: 'lang-en', text: meta.subtitle }),
    ]),
    pairedSceneLinks(meta),
  ]);
}
