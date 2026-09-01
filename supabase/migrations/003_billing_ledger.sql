-- An append-only record of every billing event this deployment has seen.
--
-- Three things it makes possible that the current state tables cannot:
--
--   * Idempotency with evidence. Stripe retries a webhook until it gets a 2xx,
--     and network failures mean a handler can succeed and still be retried. The
--     event id is the primary key, so a replay is recognised rather than
--     re-applied, and the reason a replay was skipped is on the record.
--   * Answering "what happened to this subscription" after the fact. The state
--     tables hold the present; a billing dispute is about the past.
--   * Reconciliation. A drift between local state and Stripe is only actionable
--     if one can see whether the event that should have fixed it ever arrived.
--
-- Deliberately no payload column. A Stripe event carries the customer's email
-- and address, and this product has no reason to hold a second copy of those:
-- a digest is enough to prove the same event body was seen twice, and Stripe
-- remains the place where the event itself lives.

create table if not exists public.billing_events (
  -- Stripe's own event id. The primary key is the idempotency mechanism.
  stripe_event_id text primary key,
  type text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  user_id uuid references auth.users(id) on delete set null,
  -- sha256 of the raw request body. Detects a replay whose contents differ,
  -- which should be impossible and is worth an alert if it ever is not.
  payload_digest text not null,
  -- applied | ignored_deleted_user | unsupported_price | duplicate | failed
  outcome text not null,
  error text,
  -- Stripe's own created timestamp, so out-of-order delivery is visible.
  event_created_at timestamptz,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists billing_events_received_at_idx
  on public.billing_events(received_at desc);

create index if not exists billing_events_subscription_idx
  on public.billing_events(stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists billing_events_user_idx
  on public.billing_events(user_id)
  where user_id is not null;

-- Failures are what an operator actually pages on.
create index if not exists billing_events_failed_idx
  on public.billing_events(received_at desc)
  where outcome = 'failed';

-- A user_id is set to null when the account is deleted, above, rather than the
-- row being removed: the ledger must survive the account it describes, or a
-- refund dispute after a deletion has nothing behind it.

alter table public.billing_events enable row level security;

-- Same rule as the other billing tables: the browser never reads these. The
-- service role bypasses RLS; anon/authenticated cannot enumerate them at all.
revoke all on public.billing_events from anon, authenticated;
