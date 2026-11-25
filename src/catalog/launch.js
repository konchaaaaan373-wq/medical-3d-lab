/**
 * The launch's three areas — what the header, the front page and the crawlable
 * pages offer a first-time visitor (ADR 2026-11-24, brain launch).
 *
 *   高次脳機能 · 脳解剖 · MRIアトラス
 *
 * It lives in the catalogue because it names scenes, and a surface that names a
 * scene id is a release decision made by whoever was editing that surface
 * (`tests/public-manifest.test.js`). Surfaces read this; none of them spells a
 * slug.
 *
 * **Being listed here opens nothing.** An area whose scene the release holds
 * closed is still an area — the header still names it — and its `route` then
 * arrives at the closed door, which says so. `functions` is different in kind:
 * its route is a reading surface (`#/functions`) that is always open, and
 * `sceneId` names the model that page leads to once that model is published.
 *
 * Pure data: no DOM, no `three`.
 */
import { FUNCTIONS_ROUTE, sceneById, sceneRoute } from './index.js';

const routeOfScene = (id) => {
  const scene = sceneById(id);
  return scene ? sceneRoute(scene) : null;
};

export const LAUNCH_AREAS = Object.freeze([
  Object.freeze({
    id: 'functions',
    sceneId: 'higher-brain-function',
    route: FUNCTIONS_ROUTE,
    en: 'Higher brain function',
    ja: '高次脳機能',
    lineEn: 'Language, memory, attention and executive function — as networks, not as one region per function.',
    lineJa: '言語・記憶・注意・遂行機能を、「1 領域 = 1 機能」ではなくネットワークとして。',
  }),
  Object.freeze({
    id: 'anatomy',
    sceneId: 'brain-anatomy',
    route: routeOfScene('brain-anatomy'),
    en: 'Brain anatomy',
    ja: '脳解剖',
    lineEn: 'Turn it, look through it, point at a structure by name — from the cortex to the deep nuclei.',
    lineJa: '回して、透かして、名前で指す。皮質の脳回から深部の核まで。',
  }),
  Object.freeze({
    id: 'mri',
    sceneId: 'mri-atlas',
    route: routeOfScene('mri-atlas'),
    en: 'MRI atlas',
    ja: 'MRIアトラス',
    lineEn: 'Three planes of a standard-brain MRI, and 3D surfaces of the same labels in the same space.',
    lineJa: '標準脳 MRI の三断面と、同じラベルから作った 3D を行き来する。',
  }),
]);

export const launchAreaById = (id) => LAUNCH_AREAS.find((area) => area.id === id) ?? null;

/** The area a scene belongs to, for the header's "you are here". */
export const launchAreaForScene = (sceneId) =>
  LAUNCH_AREAS.find((area) => area.sceneId === sceneId) ?? null;
