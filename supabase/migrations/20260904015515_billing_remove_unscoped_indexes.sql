-- Composite mode-aware indexes supersede the original global billing indexes.
-- Checkout attempt expiry is always checked after the (user_id, stripe_mode)
-- primary-key lookup, so a standalone expiry index would only add write cost.

drop index if exists public.billing_customers_reconcile_queue_idx;
drop index if exists public.billing_subscriptions_user_id_idx;
drop index if exists public.billing_subscriptions_customer_id_idx;
drop index if exists public.billing_events_status_attempt_idx;
drop index if exists public.billing_reconciliation_runs_started_idx;
drop index if exists public.billing_checkout_attempts_expiry_idx;
