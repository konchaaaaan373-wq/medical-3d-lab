import { el } from '../utils/dom.js';
import { statusById } from '../catalog/taxonomy.js';
import { clinicalReviewPresentation } from '../catalog/clinicalReview.js';
import '../styles/clinical-review.css';

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
        title: 'Clinical-review attestation is tracked separately from model maturity.',
      },
      [
        el('span', { class: 'lang-en', text: review.en }),
        el('span', { class: 'lang-ja', text: review.ja }),
      ]
    );

  const trustBadges =
    maturityBadge || reviewBadge
      ? el('div', { class: 'title-trust-badges', 'aria-label': 'Model trust status' }, [
          maturityBadge || null,
          reviewBadge || null,
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
  ]);
}
