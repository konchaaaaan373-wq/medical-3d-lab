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

- `src/access/policy.js` — pure entitlement vocabulary and subscription-to-grant rules.
- `src/access/auth.js` — small Supabase email/password auth client using the public REST API; no auth framework added.
- `src/access/AccessManager.js` — account state, paywall, Checkout launch, Billing Portal launch and entitlement refresh.
- `src/access/installAccess.js` — attaches paid modes around an already-built scene without changing the medical model.
- `src/data/patientGuides.js` — patient-facing guides for heart failure, COPD, asthma and portal hypertension.
- `src/components/PatientGuidePanel.js` — patient explanation UI.
- `netlify/functions/*` — authenticated entitlement lookup, Stripe Checkout, Stripe Customer Portal and webhook sync.
- `supabase/migrations/001_billing.sql` — server-only billing state.

### Failure policy

Free models must remain available when auth or billing is unavailable. The browser therefore always starts with the implicit `free` entitlement. Auth/Stripe failures may prevent paid modes from opening, but may not prevent the model from rendering.

## Why Supabase + Stripe + Netlify Functions

The existing app is a static Vite/Three.js SPA with no server dependency. Netlify deploys JavaScript functions from `netlify/functions` by default, so Checkout and entitlement verification can be added without migrating the application to another framework.

Supabase provides identity and a small server-side billing table. Stripe owns card data, Checkout and subscription lifecycle. The browser never receives a Stripe secret or the Supabase service-role key.

## Security boundary

This is application access control, not DRM.

A browser-delivered JavaScript application cannot make its static source code secret. The product gate prevents normal application access to paid modes and verifies the purchase server-side; it is not intended to prevent a determined developer from studying public deployment assets.

What **is** protected server-side:

- account identity;
- subscription status;
- Stripe customer/subscription identifiers;
- creation of Checkout/Portal sessions;
- entitlement decisions returned to the signed-in user.

## Supabase setup

1. Create a Supabase project.
2. Enable email/password authentication.
3. Run `supabase/migrations/001_billing.sql` in the SQL editor or migration runner.
4. Copy:
   - Project URL → `VITE_SUPABASE_URL` and `SUPABASE_URL`
   - anon/publishable key → `VITE_SUPABASE_ANON_KEY` and `SUPABASE_ANON_KEY`
   - service-role key → `SUPABASE_SERVICE_ROLE_KEY` **server only**
5. Configure your production site URL in Supabase Auth.

The two billing tables have RLS enabled and no browser policies. Netlify Functions authenticate the Supabase access token and then use the service role.

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

### Webhook

Create a Stripe webhook endpoint:

`https://<production-domain>/.netlify/functions/stripe-webhook`

Listen for:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Store the signing secret as `STRIPE_WEBHOOK_SECRET`.

The Checkout session copies `supabase_user_id` and `entitlement` into subscription metadata. Subscription webhooks are therefore sufficient to rebuild the entitlement state after cancellation, renewal or plan changes.

## Netlify environment variables

Set the values from `.env.example` in Netlify Project configuration. Secret values must not use a `VITE_` prefix.

The Functions directory does not need a custom `netlify.toml`; Netlify's default is `netlify/functions`.

## Billing lifecycle

1. Free user opens a reviewed/production model without logging in.
2. They press a locked **Patient** or **Lesson** control.
3. Account/paywall opens.
4. User signs in or creates an account.
5. `create-checkout` authenticates the Supabase bearer token server-side and creates a Stripe Checkout Session.
6. Stripe completes the payment and emits subscription events.
7. `stripe-webhook` verifies the raw-body signature and stores subscription state in Supabase.
8. `entitlements` converts active/trialing subscriptions to `free`, `patient`, and/or `education` grants.
9. Returning from Checkout refreshes the account automatically; the model itself never reloads because of an entitlement calculation.
10. Billing Portal handles card changes and cancellation.

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

Do not use client-side CSS alone as the entitlement decision.
