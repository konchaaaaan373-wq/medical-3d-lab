-- Bind every Customer mapping to the Stripe account that owns it. Test/live
-- mode alone is not sufficient provenance: unrelated Stripe accounts can both
-- issue keys with the same mode prefix and both return resource_missing for an
-- object they do not own.

alter table public.billing_customers
  add column if not exists stripe_account_id text;

comment on column public.billing_customers.stripe_account_id is
  'Immutable acct_* identity verified from the server key before Customer absence may be accepted during account deletion.';

alter table public.billing_customers
  drop constraint if exists billing_customers_stripe_account_id_format;

alter table public.billing_customers
  add constraint billing_customers_stripe_account_id_format
  check (
    stripe_account_id is null
    or stripe_account_id ~ '^acct_[A-Za-z0-9]+$'
  );
