/**
 * Routes that no longer address a place of their own.
 *
 * ## The one that does
 *
 * `#/organs` was the Organ Explorer: a searchable index of every organ in the
 * catalogue, with filters, system sections and a card per model. Under the
 * preview unlock it still is, and it earns its page — seventy models is a
 * thing you need an index for.
 *
 * In the beta it is not that page. `createExplorer` sees the release gate,
 * hands straight over to `createPublicModelsExplorer`, and what renders is the
 * same organ hero, the same organ chips, the same "open this model" and
 * "sources & limits" buttons as the landing page, in the same order. Driven in
 * a browser, the two surfaces exposed **an identical set of 23 controls**; the
 * only differences were the heading above them and the footer below.
 *
 * Two pages with the same controls are not two pages. They are one page with
 * two entrances, and the cost is paid by the reader: "Models" in the header
 * and the wordmark beside it went to the same set of models, neither told you
 * which one you were on, and pressing either from the other changed the
 * heading and nothing else. A reader cannot use a landmark that appears twice.
 *
 * So while the release opens few enough models that the landing page shows all
 * of them, the index is the landing page, and `#/organs` says so instead of
 * rendering a copy. The header destination goes with it — see
 * `ShellHeader.js`, where `models` is gated on the same unlock.
 *
 * ## Why a redirect rather than deleting the route
 *
 * Links outlive pages. `#/organs` and its `#/explore` alias have been shipped,
 * shared and crawled, and a route that has been published owes its visitors an
 * arrival rather than the default scene — which is where `resolveRoute` sends
 * anything it does not recognise. The rule is one line and it disappears on
 * its own the day the Explorer is a real page again.
 *
 * Pure: `unlocked` is passed in, never read from `window`, so the rule is
 * testable and cannot disagree with itself between two callers on one page.
 */
import { LANDING_ROUTE } from '../catalog/index.js';
import { resolveRoute } from './router.js';

/**
 * Where this hash should actually go, or null when it is already there.
 *
 * @param {string} hash
 * @param {{unlocked: boolean}} options
 * @returns {string|null}
 */
export function redirectFor(hash, { unlocked }) {
  if (unlocked) return null;
  if (resolveRoute(hash).kind === 'explorer') return LANDING_ROUTE;
  return null;
}
