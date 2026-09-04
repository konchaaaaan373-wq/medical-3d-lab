-- Environment identity is never implicit after the one-time sandbox backfill.
-- Omitting it must fail instead of silently writing live data into test scope.

alter table public.billing_customers
  alter column stripe_mode drop default;

alter table public.billing_subscriptions
  alter column stripe_mode drop default;

alter table public.billing_reconciliation_runs
  alter column stripe_mode drop default;

alter table public.billing_events
  alter column livemode drop default;
