import { betaUnlocked } from '../app/releaseGate.js';
import { ENTITLEMENT } from './policy.js';

/**
 * The paid surfaces, opened for a reviewer and for nobody else.
 *
 * ## Why this exists
 *
 * `patient` and `education` are billing entitlements, so the surfaces behind
 * them can only be looked at by somebody holding a subscription. That is right
 * for a visitor and wrong for the two jobs this repository keeps having to do:
 * reading a surface before anyone is asked to sign it off, and measuring one.
 * The medical boundary statements on the patient guide are 9px — the smallest
 * type in the product, on the sentences that say what the model may be used for
 * (F-113) — and until now there was no way to see them in a browser at all.
 *
 * So: the same unlock the beta gate already uses. A build made with
 * `VITE_ALLOW_PREVIEW=1` and opened with `?preview=1` carries the paid grants;
 * every other build carries none, because `betaUnlocked()` is compiled to a
 * constant `false` in a production bundle and this whole branch is dead code in
 * it. There is no second switch to get wrong.
 *
 * ## What it is not
 *
 * **It is not a subscription.** It grants the entitlements the *browser* checks
 * so the surfaces render; it cannot make the server hand over paid content,
 * which is where the guides actually live (`/.netlify/functions/paid-content`
 * checks the caller's real entitlement). A preview build pointed at production
 * opens the panels and finds them empty. That is the correct shape: the gate a
 * reviewer steps around is the presentation one, and the gate that protects the
 * content is not this file's to open.
 *
 * **It is not a way to see a surface as a customer sees it** — unless asked.
 * A reviewer holding these grants is never shown the purchase flow, the lock on
 * a paid control, or the copy that says what is behind it, and those are
 * surfaces too. `?entitled=0` withholds the grants and leaves everything else
 * alone, so both states are reachable from the same build; see
 * `reviewerIsEntitled` below.
 */

/** The entitlements a reviewable build hands out. `free` is implicit. */
export const PREVIEW_ENTITLEMENTS = Object.freeze([ENTITLEMENT.PATIENT, ENTITLEMENT.EDUCATION]);

/** How a reviewer asks to be shown the surfaces they would see unentitled. */
export const PREVIEW_ENTITLED_PARAM = 'entitled';

const OFF = new Set(['0', 'off', 'no', 'false']);

/**
 * Whether a reviewer wants the grants, given the query string.
 *
 * A reviewer holding the entitlements never sees the surfaces a visitor meets
 * *before* paying — the purchase flow, the lock on the control, the copy that
 * says what is behind it. Those are surfaces too, and they were the ones nobody
 * could measure once this file existed (F-124). `?entitled=0` withholds the
 * grants while leaving everything else about the preview build alone.
 *
 * Not a second build-time capability, which is the thing worth not having: it
 * only ever narrows what an already-unlocked build hands out, and a production
 * bundle has no unlock for it to narrow. `?entitled=0` there is a query
 * parameter on a page that was never going to grant anything.
 *
 * Read on every call and never stripped or stored, unlike `?preview=1`. A query
 * string survives a hash navigation and the reload one causes, so a reviewer
 * who asked for the unentitled view keeps it while they move around — and gets
 * out of it by removing the parameter, rather than by remembering that
 * something was remembered.
 *
 * @param {string} search
 */
export function reviewerIsEntitled(search = '') {
  const asked = new URLSearchParams(search).get(PREVIEW_ENTITLED_PARAM);
  if (asked == null) return true;
  return !OFF.has(asked.trim().toLowerCase());
}

/**
 * The grants this visitor gets for being a reviewer, which is normally none.
 *
 * @param {() => boolean} [unlocked] the beta unlock, injectable for tests
 * @param {() => string} [search] the query string, injectable for tests
 * @returns {string[]}
 */
export function previewGrants(unlocked = betaUnlocked, search = () => globalThis.location?.search ?? '') {
  try {
    if (!unlocked()) return [];
    return reviewerIsEntitled(search()) ? [...PREVIEW_ENTITLEMENTS] : [];
  } catch {
    // A missing `window` under `node --test`, or storage denied outright. The
    // answer when the unlock cannot be read is the same as when it says no.
    return [];
  }
}

/**
 * Add the reviewer's grants to a set the account layer just computed.
 *
 * Applied after every recomputation rather than once at startup: signing in,
 * signing out and a failed entitlement lookup all rebuild `grants` from
 * scratch, and a reviewer who signs in to read the account surfaces should not
 * lose the panels they were reading a moment ago.
 *
 * @param {Set<string>} grants
 * @returns {Set<string>} the same set, for use as an expression
 */
export function withPreviewGrants(grants, unlocked = betaUnlocked, search) {
  for (const entitlement of previewGrants(unlocked, search)) grants.add(entitlement);
  return grants;
}
