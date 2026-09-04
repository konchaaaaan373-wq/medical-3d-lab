-- Keep Stripe idempotency keys bound to one exact Checkout request identity.
-- Existing in-flight rows remain non-reusable until their original lease
-- expires because NULL never equals a new request fingerprint.
alter table public.billing_checkout_attempts
  add column if not exists request_fingerprint text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'billing_checkout_attempts_request_fingerprint_format'
      and conrelid = 'public.billing_checkout_attempts'::regclass
  ) then
    alter table public.billing_checkout_attempts
      add constraint billing_checkout_attempts_request_fingerprint_format
      check (request_fingerprint is null or request_fingerprint ~ '^[0-9a-f]{64}$');
  end if;
end
$$;

comment on column public.billing_checkout_attempts.request_fingerprint is
  'SHA-256 of non-attempt-specific Stripe Checkout parameters; contains no raw customer or price identifiers.';
