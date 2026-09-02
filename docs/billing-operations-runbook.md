# Billing operations runbook

This is the shortest operational path from a deployed build to a trustworthy paid service. The application now performs normal Stripe webhook synchronisation plus an hourly, bounded repair pass. No customer IDs, subscription IDs, emails, or provider error messages are returned by the public health endpoint.

## What runs automatically

- `scheduled-billing-reconcile` runs at minute 17 of every hour on the published Netlify deploy.
- Each run takes the least-recently-attempted customers first and processes 3 by default (configurable up to 10 with `BILLING_RECONCILE_BATCH_SIZE`).
- A failed customer is moved behind the rest of the queue, so one bad record cannot block everyone else.
- Successful/ignored webhook ledger rows and reconciliation-run rows older than 90 days are removed automatically. Failed webhook rows remain available for investigation. Only a complete successful pass over every known customer supersedes older Checkout/subscription failures for the current health signal; invoice failures stay degraded until Stripe successfully redelivers or an operator safely replays the event.
- `/api/billing-health` reports only aggregate health and returns HTTP 503 when configuration, webhook processing, or scheduled reconciliation is degraded. Netlify rate-limits it per visitor before a request reaches Supabase.
- A normal in-progress hourly run keeps the previous successful health result; a run still marked `running` after five minutes is treated as degraded.
- The next invocation automatically marks any five-minute-old abandoned run as failed before starting, so a successful retry restores health without a database edit.

Netlify Scheduled Functions have a 30-second execution limit. Do not raise the batch above 10. At larger scale, keep the batch small and run a separate background queue rather than increasing this limit.

## One-command check

After the first scheduled run has completed:

```bash
npm run billing:check -- https://YOUR_PRODUCTION_DOMAIN
```

All three rows must be `ok: true`. A fresh deployment can show `Billing repair` as pending until the first hourly run. To test immediately, open Netlify → **Functions** → **scheduled-billing-reconcile** → **Run now**, then rerun the command.

## If Billing repair is degraded

1. Open Netlify → **Functions** → **scheduled-billing-reconcile** → **Logs**.
2. Confirm all required variables from `.env.example` are scoped to **Functions** and redeploy after any change.
3. In Supabase, inspect only these server-side fields:
   - `billing_customers.reconcile_failure_count`
   - `billing_customers.last_reconcile_error_code`
   - the latest `billing_reconciliation_runs` row
   - failed or stale-processing `billing_events` rows
4. Correct the provider/configuration problem and use **Run now** once. A successful retry resets the customer failure marker and turns health green.
5. For a failed invoice event, use Stripe Dashboard → Webhooks → the failed event → **Resend** after correcting the problem. Customer reconciliation cannot replay invoice-specific alerts, so the event itself must finish successfully.

The repair job deliberately does not require the browser publishable key or webhook signing secret, so it continues while the normal webhook path is impaired. Billing Portal likewise uses an operation-specific gate: existing customers retain cancellation and payment-method access during unrelated webhook or Price configuration incidents.

Error codes are deliberately bounded:

| Code | Action |
| --- | --- |
| `configuration` | Check missing Netlify Function variables and redeploy. |
| `stripe_authorization` | Check restricted-key permissions and mode. |
| `stripe_rate_limit` | Leave the batch small; retry on the next hourly run. |
| `stripe_unavailable` | Check Stripe status and let the next run retry. |
| `supabase` | Check Supabase status, table grants, and the applied migrations. |
| `stripe_state_churn` | Inspect rapid Portal/subscription changes and rerun after they settle. |
| `unknown` | Inspect the Netlify log; raw provider errors are never persisted in Supabase. |

## Required Stripe restricted-key permissions

Use a separate `rk_test_…` key for Deploy Previews and `rk_live_…` for Production. This integration needs only:

- Customers: Write (create, read, delete for account deletion)
- Checkout Sessions: Write
- Billing Portal Sessions: Write
- Prices: Read
- Subscriptions: Read

Test the restricted key in a sandbox first. Never put Stripe or Supabase server secrets in source code, `VITE_*` variables, screenshots, support messages, or logs.

## Still intentionally manual before charging

1. Complete the sandbox lifecycle matrix in `docs/deploy-preview-billing-test.md`, especially renewal, payment failure/recovery, pause/resume, cancellation, and repurchase.
2. Obtain current clinical sign-off for the professional content. The server commerce gate remains closed until then.
3. Confirm pricing, refund/cancellation policy, support contact, Terms, Privacy, and legally required commerce disclosure.
4. Confirm tax obligations with a qualified adviser. Configure product tax codes and registrations first; enable Stripe automatic tax only after an applicable registration shows as collecting.
5. Create live Products/Prices, a live Portal configuration, a live webhook endpoint, and Production-scoped Netlify variables. Test and live webhook signing secrets are different.
