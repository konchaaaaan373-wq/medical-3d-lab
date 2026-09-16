/**
 * Serving the paid surfaces to a check, without a subscription.
 *
 * Two different gates stand between a reviewer and the patient or education
 * guide, and they need different answers.
 *
 * The **presentation** gate is `access.has(ENTITLEMENT.PATIENT)` in the
 * browser, and a preview build already answers it: `src/access/previewGrants.js`
 * hands the paid entitlements to a `VITE_ALLOW_PREVIEW=1` build opened with
 * `?preview=1`, and to nothing else.
 *
 * The **content** gate is the server. The guides live behind
 * `/.netlify/functions/paid-content`, which checks the caller's real
 * subscription — correctly, and there is no version of this that should change.
 * So the check answers that request itself, from the repository's own authored
 * data, through the function's own `entitledGuide()`. The same scene/type
 * lookup and the same "this scene has no such guide" rule run; only the
 * subscription is synthetic.
 *
 * That last part matters. A stub that returned `{ guide: {...} }` from a shape
 * somebody typed into the check would pass while the real contract drifted
 * underneath it. Calling the function's own logic means a guide that the server
 * would refuse is refused here too.
 *
 * Everything here is a *check's* scaffolding. None of it ships, and none of it
 * can be reached from a deployed build: `paid-content` still asks Supabase who
 * is calling.
 */
import { entitledGuide } from '../../netlify/functions/paid-content.js';
import { authoredFeaturesForScene } from '../../src/access/features.js';

/** A subscription that grants everything, for the length of one check. */
const REVIEWER = Object.freeze([Object.freeze({ entitlement: 'complete', status: 'active' })]);

/**
 * Where `src/access/auth.js` keeps the session it reads on every request.
 *
 * Duplicated here rather than imported because `auth.js` does not export it,
 * and exporting a storage key so a check can write to it is a worse trade than
 * one line that `tests/preview-grants.test.js` keeps in step with the source.
 */
const SESSION_KEY = 'medical3dlab.auth.v1';

/**
 * A session, so that `authenticatedFetch` sends the request at all.
 *
 * The entitlement is not enough on its own: with the paid grants in place the
 * panel asks the server for its content, `authenticatedFetch` finds no session
 * and throws "Please sign in first" before any request leaves the page — so the
 * route below would never be reached and the panel would open empty. That is
 * what happened the first time this was wired up, and the symptom was a silent
 * "the control was there and the panel did not open".
 *
 * The token is a string this check invents and the check itself is the only
 * thing that ever reads it. Nothing verifies it, because the only endpoint it
 * is ever sent to is the one a few lines down.
 */
const REVIEWER_SESSION = Object.freeze({
  access_token: 'stub-reviewer-token',
  refresh_token: null,
  // Far enough out that `getSession()` never tries to refresh it, which would
  // be a network call to an auth server that is not there.
  expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  user: { id: 'stub-reviewer', email: 'reviewer@example.invalid' },
});

/**
 * Answer the paid-content and account calls a gated surface makes.
 *
 * @param {any} page a Playwright page
 * @returns {Promise<{served: string[], refused: string[]}>} what was asked for
 */
export async function stubPaidSurfaces(page) {
  const served = [];
  const refused = [];

  // Before any document script runs, so the first `getSession()` already finds
  // it. `addInitScript` also survives the reload a hash change causes.
  await page.addInitScript(
    ([key, session]) => {
      try {
        window.localStorage.setItem(key, JSON.stringify(session));
      } catch { /* private mode; the check will report what it could not open */ }
    },
    [SESSION_KEY, REVIEWER_SESSION],
  );

  await page.route('**/.netlify/functions/paid-content*', async (route) => {
    const url = new URL(route.request().url());
    const sceneId = url.searchParams.get('scene') ?? '';
    const type = url.searchParams.get('type') ?? '';

    // The function's own decision, with two substitutions and no others.
    //
    // A reviewer's subscription in place of the caller's — that is the whole
    // point. And the *authored* feature set in place of the released one,
    // because that is what the preview build used to decide whether to draw the
    // button at all (`installAccess`: `betaUnlocked() ? authoredFeaturesForScene
    // : featuresForScene`). Without it the server half refuses every scene as
    // `not_found` — the released set is fail-closed and reports `patient: false`
    // for all of them until a scene is reviewed — and the check reads as "the
    // control was there and the panel did not open", which is true and useless.
    //
    // Everything else is the function's: the scene/type lookup, the
    // "this scene has no authored guide" rule, and the shape of the answer.
    const result = entitledGuide({
      sceneId,
      type,
      subscriptions: REVIEWER,
      features: authoredFeaturesForScene(sceneId),
    });
    if (!result.allowed) {
      refused.push(`${type}:${sceneId} (${result.reason})`);
      return route.fulfill({
        status: result.reason === 'forbidden' ? 403 : 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: result.reason }),
      });
    }
    served.push(`${type}:${sceneId}`);
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ guide: result.guide }),
    });
  });

  // The account layer asks who is signed in and what they are entitled to. The
  // answer is "nobody, and nothing": the preview grants are what open the
  // surfaces, so the account state stays honest rather than inventing a
  // subscription. It also means `--locked` shows a real signed-in reader who
  // has simply not bought anything, which is the surface being measured.
  await page.route('**/.netlify/functions/entitlements*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: null, entitlements: ['free'], subscriptions: [] }),
    }));

  // Whether this deployment can sell at all, which is a *different* endpoint
  // from the prices and is the one that decides the notice. Stubbing only
  // `plan-catalog` left "purchasing is not enabled on this deploy" on screen
  // with a full price list loaded behind it.
  await page.route('**/.netlify/functions/billing-status*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ billingConfigured: true }),
    }));

  // Prices, so the purchase surface is the one a reader actually meets rather
  // than "purchasing is not enabled on this deploy". Without it `--locked`
  // measures a deploy's configuration instead of the product: real-looking
  // numbers in the shape `plan-catalog` returns, with `available: true` so the
  // buy control renders.
  await page.route('**/.netlify/functions/plan-catalog*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        billingConfigured: true,
        commerceReady: true,
        plans: {
          patient: { available: true, active: true, currency: 'jpy', unitAmount: 1200, recurring: { interval: 'month', intervalCount: 1 } },
          education: { available: true, active: true, currency: 'jpy', unitAmount: 1800, recurring: { interval: 'month', intervalCount: 1 } },
          complete: { available: true, active: true, currency: 'jpy', unitAmount: 2400, recurring: { interval: 'month', intervalCount: 1 } },
        },
      }),
    }));
  await page.route('**/auth/v1/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { session: null, user: null }, error: null }),
    }));

  return { served, refused };
}
