-- Serialise destructive account deletion against new Stripe Checkout work.
--
-- The marker is written before the deletion endpoint inspects the live billing
-- identity. A database trigger then rejects both new and reacquired Checkout
-- attempts for that user. Customer ownership is covered by the following
-- migration so already-applied versions of this migration remain immutable.

create table if not exists public.billing_account_deletions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null default now()
);

comment on table public.billing_account_deletions is
  'Server-only marker that blocks new Checkout work while an account is being permanently deleted.';

alter table public.billing_account_deletions enable row level security;

revoke all on public.billing_account_deletions from public, anon, authenticated;
grant select, insert, update, delete on public.billing_account_deletions to service_role;

create or replace function public.block_checkout_during_account_deletion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
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

drop trigger if exists billing_checkout_attempts_block_account_deletion
  on public.billing_checkout_attempts;

create trigger billing_checkout_attempts_block_account_deletion
before insert or update on public.billing_checkout_attempts
for each row execute function public.block_checkout_during_account_deletion();
