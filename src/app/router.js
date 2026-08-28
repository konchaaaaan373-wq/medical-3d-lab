import { EXPLORER_SLUG, resolveSceneId, sceneBySlug } from '../catalog/index.js';

/**
 * Everything the URL can point at.
 *
 * One hash route per scene plus one for the explorer, resolved from the
 * catalogue rather than from a hand-maintained table — adding a scene adds its
 * route. Hash routing (rather than paths) is what lets the built site be opened
 * from a file:// URL or any static host without server rewrites, which is how
 * this project is deployed.
 */

/** `#/explore` is accepted as well, because it is the word half of us reach for. */
const EXPLORER_ALIASES = new Set([EXPLORER_SLUG, 'explore']);

/** The part of a hash that addresses something: `#/heart-failure` -> `heart-failure`. */
export const slugOf = (hash = '') => String(hash).replace(/^#\/?/, '').trim();

/** @param {string} hash @returns {{ kind: 'explorer' } | { kind: 'scene', sceneId: string }} */
export function resolveRoute(hash = '') {
  if (EXPLORER_ALIASES.has(slugOf(hash))) return { kind: 'explorer' };
  return { kind: 'scene', sceneId: resolveSceneId(hash) };
}

/**
 * Whether a hash names a scene that actually exists.
 *
 * `resolveRoute` answers "where should this go", and sends anything unknown to
 * the default scene — which is right for an address bar and wrong for deciding
 * whether to reload. The explorer's own in-page anchors (`#system-renal`) are
 * unknown slugs, and reloading on one would drop the reader into a 3D scene
 * instead of scrolling the page.
 */
export const namesScene = (hash = '') => Boolean(sceneBySlug(slugOf(hash)));

/** True when two hashes address the same thing — used to decide whether to reload. */
export function sameRoute(a, b) {
  const left = resolveRoute(a);
  const right = resolveRoute(b);
  return left.kind === right.kind && left.sceneId === right.sceneId;
}
