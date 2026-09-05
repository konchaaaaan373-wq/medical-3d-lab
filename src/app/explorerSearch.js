import { clinicalReviewForScene, clinicalReviewMatchesFilter } from '../catalog/clinicalReview.js';
import { organById } from '../catalog/taxonomy.js';

export const EXPLORER_MODE_FILTERS = Object.freeze([
  'all',
  'patient',
  'education',
  'clinical-learning',
]);
export const EXPLORER_STATUS_FILTERS = Object.freeze([
  'all',
  'reviewed-plus',
  'production',
  'reviewed',
  'alpha',
  'prototype',
]);
export const EXPLORER_REVIEW_FILTERS = Object.freeze([
  'all',
  'reviewed',
  'stale',
  'pending',
  'legacy-unversioned',
]);

const fold = (value) => String(value ?? '').trim().toLocaleLowerCase();

export function queryTokens(query) {
  return fold(query).split(/\s+/u).filter(Boolean);
}

function containsAll(document, tokens) {
  const text = fold(document);
  return tokens.every((token) => text.includes(token));
}

function contextDocument({ system, organ }) {
  return [
    system?.id,
    system?.label,
    system?.labelJa,
    organ?.id,
    organ?.label,
    organ?.labelJa,
  ].filter(Boolean);
}

function sceneOrganDocument(scene) {
  const ids = scene?.organs?.length ? scene.organs : scene?.organ ? [scene.organ] : [];
  return ids.flatMap((id) => {
    const organ = organById(id);
    return organ ? [organ.id, organ.label, organ.labelJa] : [id];
  });
}

export function sceneSearchDocument({ scene, system, organ }) {
  const review = clinicalReviewForScene(scene);
  return [
    ...contextDocument({ system, organ }),
    // A multi-organ scene can be rendered under more than one organ row. Search
    // the anatomy the scene actually depicts, not only the particular row that
    // happened to yield this record. Thus COPD remains searchable as "肺" even
    // when its first Explorer occurrence is under 気管・気管支.
    ...sceneOrganDocument(scene),
    scene?.id,
    scene?.slug,
    scene?.titleEn,
    scene?.titleJa,
    scene?.description,
    scene?.descriptionJa,
    scene?.disease,
    ...(scene?.conditions ?? []),
    ...(scene?.uses ?? []),
    ...(scene?.tags ?? []),
    review?.reviewStatus,
    review?.reviewerRole,
    review?.reviewedAt,
    review?.staleReason,
    ...(review?.scope ?? []),
  ]
    .filter(Boolean)
    .join(' ');
}

export function sceneMatchesExplorerFilters(record, filters = {}) {
  const { scene } = record;
  if (!scene) return false;

  const mode = EXPLORER_MODE_FILTERS.includes(filters.mode) ? filters.mode : 'all';
  const status = EXPLORER_STATUS_FILTERS.includes(filters.status) ? filters.status : 'all';
  const review = EXPLORER_REVIEW_FILTERS.includes(filters.review) ? filters.review : 'all';
  if (mode !== 'all' && !(scene.uses ?? ['education']).includes(mode)) return false;

  if (status === 'reviewed-plus' && !['reviewed', 'production'].includes(scene.status)) return false;
  if (!['all', 'reviewed-plus'].includes(status) && scene.status !== status) return false;

  if (!clinicalReviewMatchesFilter(scene, review)) return false;

  return containsAll(sceneSearchDocument(record), queryTokens(filters.query));
}

export function plannedMatchesExplorerFilters({ planned, system, organ }, filters = {}) {
  // Planned entries have no paid capability, maturity or clinical-review state
  // yet. A filter asking for any of those must not make backlog work look as if
  // it already satisfied a product or trust gate.
  if ((filters.mode ?? 'all') !== 'all') return false;
  if ((filters.status ?? 'all') !== 'all') return false;
  if ((filters.review ?? 'all') !== 'all') return false;

  const document = [
    ...contextDocument({ system, organ }),
    planned?.id,
    planned?.slug,
    planned?.titleEn,
    planned?.titleJa,
    planned?.description,
    planned?.descriptionJa,
    planned?.disease,
    ...(planned?.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ');
  return containsAll(document, queryTokens(filters.query));
}

export function emptyOrganMatchesExplorerFilters({ system, organ }, filters = {}) {
  if ((filters.mode ?? 'all') !== 'all') return false;
  if ((filters.status ?? 'all') !== 'all') return false;
  if ((filters.review ?? 'all') !== 'all') return false;
  return containsAll(contextDocument({ system, organ }).join(' '), queryTokens(filters.query));
}
