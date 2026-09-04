-- Order-sensitive billing facts are independent. Stripe events are not
-- ordered, so each stream keeps its last authoritative event time.

alter table public.billing_subscriptions
  add column if not exists payment_state_event_at timestamptz,
  add column if not exists full_refund_at timestamptz,
  add column if not exists refund_state_event_at timestamptz,
  add column if not exists dispute_opened_at timestamptz,
  add column if not exists dispute_state_event_at timestamptz;

-- Preserve any suspension written between the preceding migration and this
-- one. New code reads the independent fields; the legacy pair remains during
-- rollout for backward compatibility with already-built clients.
update public.billing_subscriptions
set
  full_refund_at = case
    when access_suspended_reason = 'full_refund'
      then coalesce(access_suspended_at, updated_at)
    else full_refund_at
  end,
  refund_state_event_at = case
    when access_suspended_reason = 'full_refund'
      then coalesce(access_suspended_at, updated_at)
    else refund_state_event_at
  end,
  dispute_opened_at = case
    when access_suspended_reason = 'dispute'
      then coalesce(access_suspended_at, updated_at)
    else dispute_opened_at
  end,
  dispute_state_event_at = case
    when access_suspended_reason = 'dispute'
      then coalesce(access_suspended_at, updated_at)
    else dispute_state_event_at
  end
where access_suspended_reason is not null;
