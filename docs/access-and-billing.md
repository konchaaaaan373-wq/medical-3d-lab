# Access & billing — free model, paid use cases

## Product rule

Medical 3D Lab does **not** charge for medical truth itself.

The acquisition surface remains the accurate interactive model. Paid access is attached to a professional **use case** around that model:

| Surface | Access | Purpose |
| --- | --- | --- |
| Core 3D model / Explore / model controls | Free | Understand the mechanism directly |
| Selected disease Story / basic disease explanation | Free | Let a new learner see why the disease behaves that way |
| Patient explanation mode | `patient` entitlement | Consultation-room, jargon-light explanation using the same model |
| Medical education Lesson / Challenge | `education` entitlement | Predict → run → observe → explain |
| Complete | grants `patient` + `education` | Both paid use cases |

The distinction is intentional: **the model stays the source of truth; the paid product is the way the model is taught or presented.**

## Current implementation

- `src/access/policy.js` — pure entitlement vocabulary and subscription-status rules.
- `src/access/auth.js` — small Supabase email/password auth client using the public REST API; no auth framework added.
- `src/access/AccessManager.js` — account state, paywall, Checkout launch, Billing Portal launch and entitlement refresh.
- `src/access/installAccess.js` — attaches paid modes around an already-built scene without changing the medical model.
- `src/data/patientGuides.js` — patient-facing guides for heart failure, COPD, asthma and portal hypertension.
- `src/components/PatientGuidePanel.js` — patient explanation UI.
- `netlify/functions/*` — authenticated entitlement lookup, Stripe Checkout, Stripe Customer Portal and webhook sync.
- `supabase/migrations/001_billing.sql` — server-only billing state.
- `supabase/migrations/002_single_subscription_lifecycle.sql` — DB-level one-non-terminal-subscription guard.
- `supabase/migrations/20260901154950_billing_event_ledger.sql` — server-only Stripe Event ledger and reconciliation marker.
- `.github/workflows/ci.yml` — runs the full medical/model test suite and build on every PR.

### Failure policy

Free models must remain available when auth or billing is unavailable. The browser therefore always starts with the implicit `free` entitlement and starts the 3D scene **without waiting** for the auth/entitlement request. Auth/Stripe failures may prevent paid modes from opening, but may not prevent the model from rendering.

## Why Supabase + Stripe + Netlify Functions

The existing app is a static Vite/Three.js SPA with no server dependency. Netlify deploys JavaScript functions from `netlify/functions` by default, so Checkout and entitlement verification can be added without migrating the application to another framework.

Supabase provides identity and a small server-side billing table. Stripe owns card data, Checkout and subscription lifecycle. The browser never receives a Stripe secret or the Supabase server secret.

## Security boundary

This is application access control, not DRM.

A browser-delivered JavaScript application cannot make its static source code secret. The product gate prevents normal application access to paid modes and verifies the purchase server-side; it is not intended to prevent a determined developer from studying public deployment assets.

What **is** protected server-side:

- account identity;
- subscription status;
- Stripe customer/subscription identifiers;
- creation of Checkout/Portal sessions;
- entitlement decisions returned to the signed-in user.

Do not put patient names, IDs, dates of birth, diagnoses or other patient-identifying data into Medical 3D Lab accounts or billing metadata. Patient explanation mode currently takes **no patient data**; it only changes how the general model is explained.

## Supabase setup

1. Create a dedicated Supabase project for Medical 3D Lab.
2. Enable email/password authentication.
3. Apply `supabase/migrations/001_billing.sql` and `002_single_subscription_lifecycle.sql`.
4. Configure:
   - Project URL → `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - publishable key → `VITE_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_PUBLISHABLE_KEY`
   - server secret key → `SUPABASE_SECRET_KEY` **server only**
5. Configure the production Site URL and allowed redirect URLs in Supabase Auth.
6. Keep email confirmation enabled unless there is a specific reason not to.

Legacy `anon` / `service_role` key environment names remain supported as fallbacks during migration, but new deployments should use publishable/secret keys.

The two billing tables have RLS enabled and no browser policies, and browser roles have their table privileges revoked. Netlify Functions authenticate the Supabase access token and then use the server secret.

The client-only session is stored in browser local storage, matching Supabase's normal client-side session model. Access tokens are short-lived and the refresh token is rotated when the session is refreshed.

## Stripe setup

Create three recurring products/prices in Stripe. Prices are deliberately not hard-coded in the repository; pricing can change without changing medical code.

Suggested product mapping:

- **Patient Explanation** → `STRIPE_PRICE_PATIENT`
- **Medical Education** → `STRIPE_PRICE_EDUCATION`
- **Complete** → `STRIPE_PRICE_COMPLETE`

Then configure:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_PATIENT`
- `STRIPE_PRICE_EDUCATION`
- `STRIPE_PRICE_COMPLETE`

### Price ID is the entitlement source of truth

A subscription's current **Price ID**, not custom metadata, determines `patient`, `education` or `complete`.

Checkout writes `supabase_user_id` into metadata so an initial Stripe event can be joined to the account. It also writes the plan for audit/debugging, but plan metadata is not trusted for access. This matters because Customer Portal can switch the subscription Price without rewriting arbitrary custom metadata.

If a subscription event arrives with a Price ID that is not one of the configured prices, the webhook marks an existing local row `unsupported_price`; the previous paid entitlement is not allowed to remain active.

### Customer Portal configuration

In Stripe Dashboard → Customer Portal:

1. Enable the Customer Portal.
2. Enable **Switch plan**.
3. Allow only the Patient, Education and Complete products/prices used by this app.
4. Enable payment-method updates and cancellation.
5. For v1, use immediate plan switching. End-of-period downgrade scheduling has additional Stripe product/schedule constraints and should be tested separately before enabling.

Stripe supports subscription updates and cancellations in Customer Portal. Plan switching is off by default and must be enabled explicitly.

### Prevent duplicate subscriptions

Use all three protections:

1. **Application/server check:** `create-checkout` refuses a new Checkout while the user has any non-terminal subscription lifecycle (`incomplete`, `trialing`, `active`, `past_due`, `unpaid`, `paused`) and sends them to Billing Portal instead.
2. **Database guard:** a partial unique index permits at most one such lifecycle per Supabase user in local billing state.
3. **Stripe Checkout setting:** enable Stripe's **Limit customers to one subscription** / redirect existing subscribers to Customer Portal. Checkout is given the existing Stripe Customer ID, so Stripe can perform its own duplicate-subscription check.

Do not rely on the client button being disabled as duplicate-charge protection.

### Webhook

Create a Stripe webhook endpoint:

`https://<production-domain>/.netlify/functions/stripe-webhook`

Listen for:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`

Store the signing secret as `STRIPE_WEBHOOK_SECRET`.

The function verifies Stripe's signature against the **raw request body** with a five-minute timestamp tolerance before processing an event. It claims each Stripe Event ID in the server-only `billing_events` ledger, acknowledges completed duplicates without repeating their work, and permits failed or abandoned processing to be retried. The ledger stores identifiers and outcomes, not raw Stripe payloads.

Subscription events are re-read from Stripe before local persistence, so out-of-order webhook delivery cannot overwrite newer Stripe state. Checkout and Customer Portal returns also request one authoritative reconciliation from Stripe. Opening Account performs the same explicit re-check, and a stale local subscription is reconciled before it can block a legitimate repurchase.

## Subscription status policy

Stripe status and Medical 3D Lab access are intentionally separate decisions.

Paid access is granted for:

- `active`
- `trialing`
- `past_due` — a temporary grace period while Stripe retries payment / waits for customer action

Paid access is not granted for:

- `incomplete`
- `incomplete_expired`
- `unpaid`
- `paused`
- `canceled`
- unknown/local fail-closed statuses such as `unsupported_price`

`past_due` grace avoids taking a clinician or learner out of a paid mode for a transient payment failure. Stripe eventually transitions unresolved failures according to the account's Billing retry settings.

## Netlify environment variables

Set the values from `.env.example` in Netlify Project configuration. Secret values must not use a `VITE_` prefix.

The Functions directory does not need a custom `netlify.toml`; Netlify's default is `netlify/functions`.

## Billing lifecycle

1. A free user opens a reviewed/production model without logging in.
2. They press a locked **Patient** or **Lesson** control.
3. Account/paywall opens.
4. User signs in or creates an account.
5. `create-checkout` authenticates the Supabase bearer token server-side, verifies no non-terminal subscription already exists locally or at Stripe, and creates a Stripe Checkout Session.
6. Stripe completes payment and emits subscription events.
7. `stripe-webhook` verifies the raw-body signature, claims the Event ID and stores current Stripe subscription state in Supabase.
8. The webhook derives the plan from the subscription Price ID.
9. `entitlements` converts eligible subscription statuses to `free`, `patient`, and/or `education` grants.
10. Returning from Checkout performs one Stripe reconciliation and then polls server truth briefly so webhook propagation does not leave a just-paid feature visibly locked.
11. Existing subscribers use Billing Portal for upgrades, downgrades, payment recovery and cancellation; returning from Portal reconciles the new state immediately.
12. Webhook delivery remains the normal update path. Reconciliation is a repair path for missed/delayed events and stale local rows.

## Content policy

### Free

Keep at least:

- the accurate baseline physiology model;
- core interactive 3D manipulation;
- enough disease explanation to prove the educational value;
- model scope and evidence/limitations.

Do not degrade the free model into a medically inaccurate teaser.

### Patient explanation

Must:

- use the same reviewed model;
- use the scene's real progression/control semantics — never reinterpret an exercise/demand axis as disease severity;
- minimise jargon;
- avoid diagnosis, prognosis and patient-specific estimates;
- retain a visible "general explanation only" boundary;
- never invent oxygen saturation, probability, treatment effect or other outputs the model does not solve.

### Medical education

May include:

- prediction questions;
- causal Story/Challenge modules;
- advanced interpretation;
- teacher-facing prompts.

The external-physiology / model-integrity / calibration test separation remains unchanged by billing.

## Future scene-level locks

`src/access/policy.js` already separates `scene`, `patient` and `education`. Current accurate models remain free. If a future premium-only disease scene is introduced, the route should be gated **before its dynamic import**, rather than merely hiding its button after the scene loads.

## Stronger content secrecy, if ever needed

The current implementation is a server-verified **application entitlement gate**. Paid UI cannot be used normally without a server-confirmed entitlement, but some teaching copy/code is still delivered in static JavaScript bundles and is therefore inspectable by a determined developer.

If the commercial requirement later becomes "paid teaching content itself must not be present in public assets", move the paid lesson/guide payloads behind authenticated Netlify Functions and only fetch them after entitlement verification. Do not pretend CSS or minification is DRM.
