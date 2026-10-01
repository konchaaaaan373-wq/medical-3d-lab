/**
 * Routes that no longer address a place of their own.
 *
 * ## The one that does
 *
 * `#/pathology` was the disease-model list, the place "病態モデル" in a
 * mechanism scene's breadcrumb went back to. Since the BYOKI MOTION rebrand
 * (ADR 2026-09-30) that list *is* the product's model index, `#/models`, and
 * the old address renders the same page. Two addresses for one page are how a
 * header stops being a landmark — so the old one is corrected in the address
 * bar, and a shared link still arrives.
 *
 * ## The one that used to, and why it stopped
 *
 * Until 2026-09-30 the beta corrected `#/organs` (and `#/explore`) to the
 * landing page, because the landing page *was* the organ chooser: the two
 * surfaces exposed an identical set of 23 controls. The rebrand took the organ
 * hero off the landing page — BYOKI MOTION opens on its disease models — so
 * `#/organs` is a page of its own again: the anatomy shelf, also reached as
 * `#/anatomy`. Correcting it to a landing page that no longer shows any organ
 * would send a reader who asked for anatomy somewhere without it.
 *
 * ## Why a redirect rather than deleting the route
 *
 * Links outlive pages. A route that has been published owes its visitors an
 * arrival rather than the default scene — which is where `resolveRoute` sends
 * anything it does not recognise.
 *
 * Pure, and the same on every build: when the beta corrected `#/organs` the
 * answer depended on the preview unlock, which callers passed in. Nothing does
 * now, so nothing is passed.
 */
import { MODELS_ROUTE, PATHOLOGY_SLUG } from '../catalog/index.js';
import { slugOf } from './router.js';

/**
 * Where this hash should actually go, or null when it is already there.
 *
 * The query survives the correction: `?purpose=` and `?preview=` are the
 * reader's, not the route's.
 *
 * @param {string} hash
 * @returns {string|null}
 */
export function redirectFor(hash) {
  if (slugOf(hash) !== PATHOLOGY_SLUG) return null;
  const query = String(hash).split('?')[1];
  return query ? `${MODELS_ROUTE}?${query}` : MODELS_ROUTE;
}
