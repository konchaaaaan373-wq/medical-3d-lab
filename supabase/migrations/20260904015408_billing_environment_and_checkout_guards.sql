-- Environment-scoped billing identity, atomic Checkout attempts, and bounded
-- payment-failure grace.
--
-- This migration is intentionally applied before live billing is enabled. The
-- only pre-existing Medical 3D Lab billing records are sandbox records, so they
-- are backfilled as `test`. From this point on every server write supplies the
-- Stripe mode explicitly and every read is scoped to that mode.

alter table public.billing_customers
  add column if not exists stripe_mode text not null default 'test'
    check (stripe_mode in ('test', 'live'));

alter table public.billing_subscriptions
  add column if not exists stripe_mode text not null default 'test'
    check (stripe_mode in ('test', 'live')),
  add column if not exists payment_failed_at timestamptz,
  add column if not exists grace_until timestamptz,
  add column if not exists access_suspended_reason text
    check (
      access_suspended_reason is null
      or access_suspended_reason in ('full_refund', 'dispute')
    ),
  add column if not exists access_suspended_at timestamptz;

alter table public.billing_reconciliation_runs
  add column if not exists stripe_mode text not null default 'test'
    check (stripe_mode in ('test', 'live'));

-- Stripe object identifiers live in separate test/live namespaces. They must
-- never be treated as a global application identity.
alter table public.billing_customers
  drop constraint if exists billing_customers_pkey,
  drop constraint if exists billing_customers_stripe_customer_id_key,
  drop constraint if exists billing_customers_customer_mode_key;

alter table public.billing_customers
  add constraint billing_customers_pkey primary key (user_id, stripe_mode),
  add constraint billing_customers_customer_mode_key unique (stripe_customer_id, stripe_mode);

alter table public.billing_subscriptions
  drop constraint if exists billing_subscriptions_pkey;

alter table public.billing_subscriptions
  add constraint billing_subscriptions_pkey primary key (stripe_subscription_id, stripe_mode);

drop index if exists public.billing_subscriptions_one_nonterminal_per_user_idx;
create unique index billing_subscriptions_one_nonterminal_per_user_mode_idx
  on public.billing_subscriptions(user_id, stripe_mode)
  where status in ('incomplete','trialing','active','past_due','unpaid','paused');

alter table public.billing_events
  drop constraint if exists billing_events_pkey;

alter table public.billing_events
  add constraint billing_events_pkey primary key (stripe_event_id, livemode);

create index if not exists billing_customers_mode_reconcile_queue_idx
  on public.billing_customers(stripe_mode, last_reconcile_attempt_at asc nulls first, user_id asc);

create index if not exists billing_subscriptions_mode_user_idx
  on public.billing_subscriptions(stripe_mode, user_id);

create index if not exists billing_events_mode_status_attempt_idx
  on public.billing_events(livemode, status, last_attempt_at);

create index if not exists billing_reconciliation_runs_mode_started_idx
  on public.billing_reconciliation_runs(stripe_mode, started_at desc);

create table if not exists public.billing_checkout_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_mode text not null check (stripe_mode in ('test', 'live')),
  attempt_id uuid not null unique,
  plan text not null check (plan in ('patient', 'education', 'complete')),
  return_hash text not null,
  status text not null check (status in ('acquired', 'session_created', 'completed', 'failed')),
  checkout_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (user_id, stripe_mode)
);

create index if not exists billing_checkout_attempts_expiry_idx
  on public.billing_checkout_attempts(expires_at);

alter table public.billing_checkout_attempts enable row level security;

-- All billing state remains server-only. Explicit grants and RLS are separate
-- boundaries; browser roles receive neither.
revoke all on public.billing_customers from public, anon, authenticated;
revoke all on public.billing_subscriptions from public, anon, authenticated;
revoke all on public.billing_events from public, anon, authenticated;
revoke all on public.billing_reconciliation_runs from public, anon, authenticated;
revoke all on public.billing_checkout_attempts from public, anon, authenticated;

grant select, insert, update, delete on public.billing_customers to service_role;
grant select, insert, update, delete on public.billing_subscriptions to service_role;
grant select, insert, update, delete on public.billing_events to service_role;
grant select, insert, update, delete on public.billing_reconciliation_runs to service_role;
grant select, insert, update, delete on public.billing_checkout_attempts to service_role;
