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
3. Apply the billing migrations in order:
   - `supabase/migrations/001_billing.sql`
   - `supabase/migrations/002_single_subscription_lifecycle.sql`
   - `supabase/migrations/20260901154950_billing_event_ledger.sql`
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

### Granting needs an owner; revoking does not

Every write that grants access resolves the Supabase user first, and refuses if
it cannot: writing `active` for a subscription whose owner cannot be established
is how one customer's payment becomes another's access.

**Revocation is the opposite, and must not inherit that rule.** A subscription
that has stopped entitling has to stop entitling whether or not the local
mapping can say whose it was — the row is addressed by
`stripe_subscription_id`, and refusing to touch it does not fail safe, it leaves
whatever the row already said, which was `active`.

Two failures made that concrete, and both returned **200** to Stripe, which is
an instruction never to send the event again:

- `subscriptionById` returns `null` on a 404 and throws on everything else, so
  the `try/catch` written to fall back to the signed event object caught every
  case except the ordinary one — Stripe no longer serving a deleted
  subscription. That left a null subscription, which resolved no owner, synced
  nothing and revoked nothing.
- With no `billing_customers` row and no `metadata.supabase_user_id`, the
  handler returned `ignored: deleted_user` — when no user had been deleted —
  and wrote nothing.

Either way a customer who cancelled kept paid access indefinitely, and nothing
recorded that it had happened. `revokeSubscriptionLocally` now writes the
non-entitling status by subscription ID alone, and refuses any status that
grants access so it cannot be reused as a general writer.
`tests/billing-webhook.test.js` holds both directions.

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


---

## Legal readiness — why checkout can refuse

A seller of a digital service in Japan must publish, before it takes money, its
legal name, the person responsible, an address, contact details, the price,
when payment is taken, when the service is provided and how to cancel
(特定商取引法 §11).

Those first four are facts about a business, not about this repository, and
**none of them is invented here**. `src/data/operator.js` ships them as `null`,
with a comment saying why: a disclosure carrying a plausible-looking
placeholder is worse than an absent one, because it reads as a statement.

The consequence is deliberate and enforced in code rather than on a checklist:

| Module | Responsibility |
| --- | --- |
| `src/data/operator.js` | The seller's identity, and which required entries are still missing |
| `src/data/legal.js` | The four documents as data, plus the disclosure rows |
| `src/data/legalRoutes.js` | Just the slugs — the router and catalogue need them and must not pull the prose into the entry chunk |
| `src/access/legalReadiness.js` | `canSell()` and the reason it says no — about the **seller** |
| `src/access/commerceReadiness.js` | Whether a plan is backed by a clinically current scene — about the **content** |
| `src/app/Legal.js` | The pages, plain DOM, readable with no renderer |

Two independent gates, and both are repeated server-side in
`create-checkout.js`: hiding a purchase button is not a boundary, so a stale
client or a hand-written request meets the same refusal.

`AccessManager` asks `canSell()` rather than checking `billingConfigured`
alone. With the disclosure incomplete the product still works, the account
still works and the plans are still described — the button simply does not take
money, and the panel says which of the two reasons applies with a link to the
disclosure page.

Two claims in the privacy policy are checked against the implementation by
`tests/legal.test.js` rather than trusted: that nothing is transmitted before
consent, and that no identifier survives a page load. A privacy policy is a
factual claim about software; when it drifts from the software it stops being a
policy and becomes a misstatement.

**To go live:** fill in `src/data/operator.js`. `npm test` then passes with the
disclosure complete, and checkout stops refusing.


---

## Billing operations — the ledger, reconciliation and alerts

### Why state tables are not enough

`billing_customers` and `billing_subscriptions` hold the present. Three
questions they cannot answer:

1. **"Have I already applied this event?"** Stripe retries a webhook until it
   receives a 2xx, and a handler can succeed with the response lost on the way
   back. Without a durable record, the answer is a guess.
2. **"What happened to this subscription?"** A billing dispute is about the
   past. The state tables have overwritten it.
3. **"Did the event that should have fixed this ever arrive?"** Drift between
   local state and Stripe is only actionable with that answer.

### The ledger

`billing_events` is append-only and keyed on Stripe's own event id.
`claimBillingEvent` / `finishBillingEvent` in `netlify/lib/billing.js` implement
a claim-then-finish protocol with an attempt count and a reclaim window, so two
workers cannot process one delivery and a worker that dies mid-flight does not
strand the event.

**There is deliberately no payload column.** A Stripe event carries the
customer's email and address, and this product has no reason to hold a second
copy of them.

Three properties the webhook keeps:

- **Every exit records an outcome.** A path that returns without finishing its
  claim leaves the event `processing` until the reclaim window opens, which
  turns a success into a retry.
- **A failure is recorded as `failed`, not left unrecorded**, so a retry can
  tell "never seen" from "tried and broke". It still returns 500, so Stripe
  retries, and it raises a `webhook_failed` alert.
- **Renewal and payment failure are handled rather than dropped.** Entitlement
  already follows the subscription events; the invoice events
  (`netlify/lib/invoices.js`) carry the two facts those cannot — that a renewal
  happened at all, and that a payment is failing with a known number of attempts
  left. Neither writes state.

### Reconciliation, at two scopes

Webhooks are the fast path and not a guarantee, and every kind of loss leaves
entitlement wrong in a way no single request notices, because nothing re-asks.
Two things re-ask, and they answer different questions:

| | Scope | Runs | Answers |
| --- | --- | --- | --- |
| `reconcileBillingForUser` | One user | On their own request path — after Checkout returns, when entitlements are read | "Is *this* user's state right, now that they are here?" |
| `billing-reconcile.js` | The account | On a schedule | "Is anyone in a bad state that nobody has looked at?" |

The first cannot see a user who never comes back, and has nobody to tell. The
second is the sweep, and it classifies what it finds
(`netlify/lib/reconcile.js`) rather than only repairing:

| Drift | Severity | Action |
| --- | --- | --- |
| `status`, `entitlement`, `period` | error / warning | Repaired from Stripe |
| `missing_locally` — a live Stripe subscription with no row | error | Repaired. Somebody is paying with no access |
| `missing_in_stripe` — a live row Stripe has never heard of | error | **Escalated.** One empty read is not enough evidence to destroy the record of a payment |
| `unsupported_price` | error | **Escalated.** Somebody changed a subscription in the dashboard to something we do not sell |

To find `missing_locally` the sweep has to ask Stripe what *Stripe* has, not
only about the subscriptions it already knows of. It lists up to
`MAX_LISTED_PAGES` × 100 subscriptions per run and says so if it hits the
ceiling.

Both sides read the period through `subscriptionPeriodEnd` and write through
`syncSubscription` — the same helpers the webhook uses. A comparison that reads
Stripe differently from the writer invents drift; a repair that writes
differently leaves the row in two shapes.

The direction is fixed: **Stripe is the truth about a subscription**, local
state is a cache of it. Reconciliation only ever writes the cache.

Authorisation is a shared secret compared in constant time, because there is no
user: it is an operations endpoint. With `BILLING_RECONCILE_TOKEN` unset it
refuses every request rather than defaulting to open. `?dry=1` reports drift
without repairing it.

### Alerts

`netlify/lib/alerts.js`. What is worth waking somebody for is written as data
in `ALERT_RULES`, so the policy is reviewable and testable:

| Kind | Level |
| --- | --- |
| `webhook_failed`, `webhook_digest_mismatch` | critical |
| `reconcile_drift`, `unsupported_price` | error |
| `deleted_user_event`, `reconcile_clean` | info |

An alert leaves the deployment, so every string in one passes through the
product's own redaction layer (`src/telemetry/redact.js`) — reused rather than
reimplemented, because two redactors drift and the weaker one is the one that
leaks. Delivery never throws: an alerting channel that is down must not turn a
recoverable billing failure into an unhandled one.

A clean reconciliation reports too, as a heartbeat. Silence should not be
mistaken for health.

### Configuration

| Variable | Effect when unset |
| --- | --- |
| `BILLING_RECONCILE_TOKEN` | The reconciliation endpoint refuses every request |
| `OPS_ALERT_WEBHOOK` | Alerts are logged and not delivered |
| `DEPLOY_ENV` | Alerts are labelled `unknown` |
