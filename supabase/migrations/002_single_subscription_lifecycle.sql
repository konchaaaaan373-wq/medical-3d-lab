-- Keep local billing state aligned with the product rule: one non-terminal
-- Stripe subscription lifecycle per user. Terminal subscriptions remain in
-- history and do not block a later resubscribe.

create unique index if not exists billing_subscriptions_one_nonterminal_per_user_idx
  on public.billing_subscriptions(user_id)
  where status in ('incomplete','trialing','active','past_due','unpaid','paused');
