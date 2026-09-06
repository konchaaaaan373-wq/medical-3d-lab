-- Serialise deletion and billing-identity writes on one per-user transaction
-- lock. An EXISTS check alone cannot see an uncommitted marker from a
-- concurrent transaction; taking the same advisory lock before inserting the
-- marker and before checking it establishes an ordering between both writes.

create or replace function public.lock_billing_account_deletion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  return new;
end;
$$;

revoke all on function public.lock_billing_account_deletion() from public, anon, authenticated;
grant execute on function public.lock_billing_account_deletion() to service_role;

drop trigger if exists billing_account_deletions_lock_user
  on public.billing_account_deletions;

create trigger billing_account_deletions_lock_user
before insert on public.billing_account_deletions
for each row execute function public.lock_billing_account_deletion();

create or replace function public.block_checkout_during_account_deletion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Reconciliation updates only operational columns. They neither create nor
  -- reassign a Customer, so allow them while a failed deletion is waiting for
  -- retry; otherwise one marked row could starve the whole hourly queue.
  if tg_table_name = 'billing_customers'
     and tg_op = 'UPDATE'
     and new.user_id is not distinct from old.user_id
     and new.stripe_mode is not distinct from old.stripe_mode
     and new.stripe_customer_id is not distinct from old.stripe_customer_id then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  if exists (
    select 1
    from public.billing_account_deletions
    where user_id = new.user_id
  ) then
    raise exception using
      errcode = '55000',
      message = 'Account deletion is in progress.';
  end if;
  return new;
end;
$$;

revoke all on function public.block_checkout_during_account_deletion() from public, anon, authenticated;
grant execute on function public.block_checkout_during_account_deletion() to service_role;
