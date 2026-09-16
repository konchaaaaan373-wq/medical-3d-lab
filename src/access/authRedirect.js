/**
 * What a Supabase redirect fragment is, decided in one place.
 *
 * Split out of `auth.js` because two callers need the answer at two very
 * different moments. `consumeAuthRedirect` asks once the access layer has
 * loaded; `main.js` has to ask *before* it, because the route is resolved from
 * the hash at boot — and a fragment read as a route sends somebody who has just
 * confirmed their address to whatever scene an unknown hash falls back to.
 *
 * The alternative was an approximation in `main.js`, and it drifted
 * immediately: a regex pair disagreed with this parser about hashes beginning
 * with `/`, which forced such a URL to the landing page while leaving its token
 * in the address bar — producing both of the failures the redirect handling
 * exists to prevent. One predicate, one answer.
 *
 * Pure and dependency-free, so importing it into the entry chunk costs the
 * parser and nothing else. `auth.js` itself would have brought the whole
 * account client in front of every first paint.
 */

/**
 * Redirect types this app knows how to be on the receiving end of.
 *
 * Everything else is still scrubbed — a type nobody here recognises is not
 * somewhere to leave a live token — but is not adopted as a session. Signing
 * somebody in, possibly over a session they already had, on the strength of a
 * link this app has no handling for is not something to do silently.
 */
export const ADOPTABLE_REDIRECTS = new Set(['recovery', 'signup', 'email_change']);

/**
 * Parse the implicit-flow fragment Supabase redirects back to a client-only app.
 *
 * **Every** type, not only `recovery`. They all carry a real access token and a
 * real refresh token, and the reason those must not linger in the address bar
 * has nothing to do with which email they came from: a confirmation link is the
 * one a brand-new account follows, and it used to land on a scene with both
 * tokens still in the URL — in history, in any screenshot, and in the link
 * somebody copies to show a colleague the model they just opened.
 *
 * Failed links are recognised too, and they look nothing like the others: no
 * `type` and no token, just `error` and `error_code`. That is the commonest way
 * an emailed link ends — expired, or already used — and it was the one case
 * still falling through to the router.
 *
 * Kept pure so the routing/security edge case is unit-testable.
 *
 * @returns {{type: string, errorCode: string|null, session: object|null}|null}
 */
export function authRedirectFromHash(hash, nowSeconds = Math.floor(Date.now() / 1000)) {
  const raw = String(hash ?? '').replace(/^#/, '');
  if (!raw || raw.startsWith('/')) return null;
  const params = new URLSearchParams(raw);

  // Checked before `type`, because a failure carries neither a type nor a
  // token. Only the code is kept: `error_description` is free text from the
  // URL, and echoing it would let anybody who can get a link clicked put their
  // own words inside this product's dialog.
  const failed = params.get('error') ?? params.get('error_code');
  if (failed) {
    return {
      type: 'error',
      errorCode: params.get('error_code') || params.get('error') || 'unknown',
      session: null,
    };
  }

  const type = params.get('type');
  if (!type) return null;

  const accessToken = params.get('access_token');
  if (!accessToken) return null;
  const expiresIn = Number(params.get('expires_in') || 3600);
  return {
    type,
    errorCode: null,
    session: {
      access_token: accessToken,
      refresh_token: params.get('refresh_token') || null,
      expires_at: Number(nowSeconds) + (Number.isFinite(expiresIn) ? expiresIn : 3600),
      user: null,
    },
  };
}

/**
 * Whether a hash is a Supabase redirect rather than a route.
 *
 * The same question `authRedirectFromHash` answers, for the caller that only
 * needs the yes or no. Sharing the parser is the point — see the note at the
 * top of this file for what happened when the two were written separately.
 */
export const looksLikeAuthRedirect = (hash) => authRedirectFromHash(hash) !== null;
