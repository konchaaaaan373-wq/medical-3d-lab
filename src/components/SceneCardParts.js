import { el } from '../utils/dom.js';
import { inLanguage } from '../utils/language.js';
import { statusById } from '../catalog/taxonomy.js';
import { clinicalReviewPresentation } from '../catalog/clinicalReview.js';

/**
 * The parts of a model's card that every list of models draws the same way:
 * its maturity, its clinical-review state, its title, its question and what
 * it does. The Explorer (`#/organs`, `#/lab`) and the disease-model list
 * (`#/pathology`) both build their cards from these, so a fix to how a
 * model's trust state is shown reaches both — the list began as a partial
 * copy of the Explorer's card, and a copy drifts. What differs between the
 * two lists (favourites, use lanes, product badges) stays with each.
 */

const dual = (en, ja, className = '') =>
  el('span', { class: className }, [
    el('span', { class: 'lang-en', text: en ?? '' }),
    el('span', { class: 'lang-ja', text: ja ?? '' }),
  ]);

/** Maturity, when the status carries a badge (Production does not). */
export function sceneStatusBadge(statusId) {
  const status = statusById(statusId);
  if (!status?.badge) return null;
  return el('span', {
    class: `status-badge is-${statusId}`,
    // One language in a tooltip: the one on screen.
    title: inLanguage(status.note, status.noteJa ?? status.note),
  }, [
    el('span', { class: 'lang-en', text: status.label }),
    el('span', { class: 'lang-ja', text: status.labelJa }),
  ]);
}

/** The clinical-review state, kept apart from maturity on every card. */
export function sceneReviewBadge(scene) {
  const review = clinicalReviewPresentation(scene);
  return el('span', {
    class: `status-badge clinical-review-badge is-${review.status}`,
    // A tooltip holds one language, and this one explains a distinction a
    // reader is entitled to be confused by — so it says it in theirs.
    title: inLanguage(
      'Clinical-review attestation is tracked separately from model maturity.',
      '臨床レビューの記録は、モデルの成熟度とは別に管理しています。'
    ),
  }, [
    el('span', { class: 'lang-en', text: review.en }),
    el('span', { class: 'lang-ja', text: review.ja }),
  ]);
}

/** Title, the question it asks (when it has one) and what it does. */
export function sceneCardText(scene) {
  return [
    el('span', { class: 'explorer-scene-title' }, [
      el('span', { class: 'lang-en', text: scene.titleEn }),
      el('span', { class: 'lang-ja', text: scene.titleJa }),
    ]),
    scene.storyTitleEn ? dual(scene.storyTitleEn, scene.storyTitleJa, 'explorer-scene-story') : null,
    el('span', { class: 'explorer-scene-note' }, [
      el('span', { class: 'lang-en', text: scene.description }),
      el('span', { class: 'lang-ja', text: scene.descriptionJa }),
    ]),
  ].filter(Boolean);
}

/** "Open model →". */
export const sceneOpenLabel = () => dual('Open model', 'モデルを開く', 'explorer-scene-open');
