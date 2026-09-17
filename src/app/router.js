import {
  EXPLORER_SLUG,
  LAB_SLUG,
  resolveSceneId,
  sceneBySlug,
} from '../catalog/index.js';
import { LEGAL_SLUGS } from '../data/legalRoutes.js';

/**
 * Everything the URL can point at.
 *
 * Published scene hashes remain unchanged. The empty hash now belongs to the
 * product landing page rather than silently launching one medical model,
 * Prototype work has an explicit Lab route, medical review/evidence has a
 * WebGL-independent Trust route, and the terms, privacy, commercial disclosure
 * and support documents have one each.
 */

/** `#/explore` is accepted as well, because it is the word half of us reach for. */
const EXPLORER_ALIASES = new Set([EXPLORER_SLUG, 'explore']);
const LAB_ALIASES = new Set([LAB_SLUG, 'experimental']);
const TRUST_ALIASES = new Set(['trust', 'evidence']);
const LANDING_ALIASES = new Set(['', 'home']);
/** One slug per legal document, declared in `src/data/legal.js`. */
const LEGAL_ALIASES = new Set(LEGAL_SLUGS);

/**
 * The part of a hash that addresses something: `#/heart-failure` -> `heart-failure`.
 *
 * Anything after a `?` is state carried to that place rather than part of its
 * address, so it is not part of the slug. See `structureOf`.
 */
export const slugOf = (hash = '') => String(hash).replace(/^#\/?/, '').split('?')[0].trim();

/**
 * A named value inside a hash's query string, trimmed, or `null` if absent.
 *
 * The one parser both `structureOf` and Trust's model focus read from — a
 * hash's query string has one grammar, and it should not be reimplemented at
 * each call site.
 *
 * @param {string} hash
 * @param {string} key
 * @returns {string|null}
 */
function queryValue(hash, key) {
  const query = String(hash).split('?')[1];
  if (!query) return null;
  const value = new URLSearchParams(query).get(key);
  return value?.trim() ? value.trim() : null;
}

/**
 * The structure a scene route opens on, if it names one.
 *
 * `#/brain-anatomy?structure=17` is the landing hero handing a reader over: it
 * named a structure on a small model, and this is how the full model opens on
 * the same one instead of making them find it again. It is deliberately a
 * *query* rather than another path segment — the address is the same model, and
 * `sameRoute` below agrees, so moving between structures is not a navigation
 * that reloads the page.
 *
 * The id is returned as it was written. Only the scene knows what its ids look
 * like, and a router that decided they were numbers would be wrong for the next
 * atlas that keys on a string.
 *
 * @param {string} hash
 * @returns {string|null}
 */
export function structureOf(hash = '') {
  return queryValue(hash, 'structure');
}

/**
 * The model a Trust route should open focused, if it names one.
 *
 * `#/trust?model=heart-failure` is the same idea as `structureOf` above, one
 * level up: a scene's "Model information" link can hand the reader to Trust
 * already pointed at *its own* record instead of the flat top of a page with
 * 69 headings on it. It is a query, not a path segment, for the same reason —
 * Trust is one page, and which record starts open is state inside it, not a
 * different page. `sameRoute` deliberately does not compare it either.
 *
 * The value is returned as written; matching it against a real scene id or
 * slug is `Trust.js`'s job, not the router's.
 *
 * @param {string} hash
 * @returns {string|null}
 */
export function trustFocusOf(hash = '') {
  return queryValue(hash, 'model');
}

/**
 * Is this hash an in-page anchor rather than a route?
 *
 * Every route in this product is written `#/something`. A hash without that
 * slash — `#content` for a skip link, `#system-renal` for an explorer jump —
 * addresses an element on the page that is already open, and changing it must
 * not be read as navigation.
 *
 * This existed as one hard-coded `startsWith('#system-')` check in the
 * explorer's own handler, which is why the skip link broke when it was added:
 * `#content` fell through to `resolveRoute`, resolved to a *scene*, and every
 * surface's hashchange handler reloaded into the default 3D model. An
 * accessibility affordance that throws the reader out of the page is worse
 * than not having one.
 *
 * @param {string} hash
 */
export function isInPageAnchor(hash = '') {
  const value = String(hash);
  return value.startsWith('#') && !value.startsWith('#/');
}

/**
 * @param {string} hash
 * @returns {{kind:'landing'}|{kind:'explorer'}|{kind:'lab'}
 *   |{kind:'trust',focusId:string|null}
 *   |{kind:'legal',docId:string}|{kind:'scene',sceneId:string,structureId:string|null}}
 */
export function resolveRoute(hash = '') {
  const slug = slugOf(hash);
  if (LANDING_ALIASES.has(slug)) return { kind: 'landing' };
  if (EXPLORER_ALIASES.has(slug)) return { kind: 'explorer' };
  if (LAB_ALIASES.has(slug)) return { kind: 'lab' };
  if (TRUST_ALIASES.has(slug)) return { kind: 'trust', focusId: trustFocusOf(hash) };
  if (LEGAL_ALIASES.has(slug)) return { kind: 'legal', docId: slug };
  return { kind: 'scene', sceneId: resolveSceneId(hash), structureId: structureOf(hash) };
}

/**
 * Whether a hash names a scene that actually exists.
 *
 * `resolveRoute` answers "where should this go", and sends anything unknown to
 * the historic default scene — which preserves old behaviour for malformed
 * deep links. Product-shell routes and Explorer section anchors are deliberately
 * not scenes.
 */
export const namesScene = (hash = '') => Boolean(sceneBySlug(slugOf(hash)));

/**
 * True when two hashes address the same thing — used to decide whether to reload.
 *
 * The structure a scene route carries is deliberately not part of the answer: it
 * is state inside a place, not a different place, and reloading the page to
 * change it would throw away the model the reader is already looking at.
 */
export function sameRoute(a, b) {
  const left = resolveRoute(a);
  const right = resolveRoute(b);
  // Two legal documents are two routes, not one: `#/terms` and `#/privacy`
  // share a `kind` and must still reload the page.
  return left.kind === right.kind && left.sceneId === right.sceneId && left.docId === right.docId;
}
