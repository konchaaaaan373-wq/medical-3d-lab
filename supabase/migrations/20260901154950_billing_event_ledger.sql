-- Server-only Stripe delivery ledger and reconciliation marker.
--
-- The ledger stores event identifiers and processing outcomes only. It does not
-- retain raw Stripe payloads, card data, or customer email addresses.

alter table public.billing_customers
  add column if not exists last_reconciled_at timestamptz;

create table if not exists public.billing_events (
  stripe_event_id text primary key,
  event_type text not null,
  stripe_object_id text,
  livemode boolean not null default false,
  status text not null check (status in ('processing', 'processed', 'ignored', 'failed')),
  attempt_count integer not null default 1 check (attempt_count > 0),
  result_code text,
  first_received_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists billing_events_status_attempt_idx
  on public.billing_events(status, last_attempt_at);

alter table public.billing_events enable row level security;

-- Supabase no longer guarantees that new public tables receive Data API grants.
-- Make the intended boundary explicit: only trusted server requests may use the
-- table, and browser roles have neither grants nor RLS policies.
revoke all on public.billing_events from public, anon, authenticated;
grant select, insert, update, delete on public.billing_events to service_role;
