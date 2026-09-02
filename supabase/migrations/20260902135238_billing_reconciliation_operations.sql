-- Bounded, server-only billing reconciliation queue and run ledger.
--
-- Customer attempts and aggregate run outcomes are retained without storing
-- Stripe payloads or user-facing error messages. This lets an hourly Netlify
-- Scheduled Function repair missed webhooks and expose a privacy-safe health
-- signal without leaking customer or subscription identifiers.

alter table public.billing_customers
  add column if not exists last_reconcile_attempt_at timestamptz,
  add column if not exists reconcile_failure_count integer not null default 0
    check (reconcile_failure_count >= 0),
  add column if not exists last_reconcile_error_code text
    check (last_reconcile_error_code is null or char_length(last_reconcile_error_code) <= 80);

create index if not exists billing_customers_reconcile_queue_idx
  on public.billing_customers(last_reconcile_attempt_at asc nulls first, user_id asc);

create table if not exists public.billing_reconciliation_runs (
  run_id uuid primary key,
  source text not null check (source in ('scheduled', 'manual')),
  status text not null check (status in ('running', 'succeeded', 'partial', 'failed')),
  selected_count integer not null default 0 check (selected_count >= 0),
  succeeded_count integer not null default 0 check (succeeded_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  deferred_count integer not null default 0 check (deferred_count >= 0),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  check (succeeded_count + failed_count + deferred_count <= selected_count),
  check (
    (status = 'running' and completed_at is null)
    or (status <> 'running' and completed_at is not null)
  )
);

create index if not exists billing_reconciliation_runs_started_idx
  on public.billing_reconciliation_runs(started_at desc);

alter table public.billing_reconciliation_runs enable row level security;

-- Billing state is accessed only by Netlify Functions using the secret/service
-- role key. Browser roles have neither table grants nor RLS policies.
revoke all on public.billing_customers from public, anon, authenticated;
revoke all on public.billing_subscriptions from public, anon, authenticated;
revoke all on public.billing_events from public, anon, authenticated;
revoke all on public.billing_reconciliation_runs from public, anon, authenticated;

grant select, insert, update, delete on public.billing_customers to service_role;
grant select, insert, update, delete on public.billing_subscriptions to service_role;
grant select, insert, update, delete on public.billing_events to service_role;
grant select, insert, update, delete on public.billing_reconciliation_runs to service_role;
