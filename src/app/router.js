import {
  EXPLORER_SLUG,
  LAB_SLUG,
  resolveSceneId,
  sceneBySlug,
} from '../catalog/index.js';

/**
 * Everything the URL can point at.
 *
 * Published scene hashes remain unchanged. The empty hash now belongs to the
 * product landing page rather than silently launching one medical model, and
 * Prototype work has an explicit Lab route separate from the public explorer.
 */

/** `#/explore` is accepted as well, because it is the word half of us reach for. */
const EXPLORER_ALIASES = new Set([EXPLORER_SLUG, 'explore']);
const LAB_ALIASES = new Set([LAB_SLUG, 'experimental']);
const LANDING_ALIASES = new Set(['', 'home']);

/** The part of a hash that addresses something: `#/heart-failure` -> `heart-failure`. */
export const slugOf = (hash = '') => String(hash).replace(/^#\/?/, '').trim();

/**
 * @param {string} hash
 * @returns {{kind:'landing'}|{kind:'explorer'}|{kind:'lab'}|{kind:'scene',sceneId:string}}
 */
export function resolveRoute(hash = '') {
  const slug = slugOf(hash);
  if (LANDING_ALIASES.has(slug)) return { kind: 'landing' };
  if (EXPLORER_ALIASES.has(slug)) return { kind: 'explorer' };
  if (LAB_ALIASES.has(slug)) return { kind: 'lab' };
  return { kind: 'scene', sceneId: resolveSceneId(hash) };
}

/**
 * Whether a hash names a scene that actually exists.
 *
 * `resolveRoute` answers "where should this go", and sends anything unknown to
 * the historic default scene — which preserves old behaviour for malformed
 * deep links. Explorer section anchors are deliberately not scenes.
 */
export const namesScene = (hash = '') => Boolean(sceneBySlug(slugOf(hash)));

/** True when two hashes address the same thing — used to decide whether to reload. */
export function sameRoute(a, b) {
  const left = resolveRoute(a);
  const right = resolveRoute(b);
  return left.kind === right.kind && left.sceneId === right.sceneId;
}
