-- Medical 3D Lab billing state.
--
-- The browser never writes these tables directly. Netlify Functions use the
-- service-role key after authenticating the user's Supabase access token.

create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null unique,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  stripe_subscription_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  entitlement text not null check (entitlement in ('patient', 'education', 'complete')),
  status text not null,
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_subscriptions_user_id_idx
  on public.billing_subscriptions(user_id);

create index if not exists billing_subscriptions_customer_id_idx
  on public.billing_subscriptions(stripe_customer_id);

alter table public.billing_customers enable row level security;
alter table public.billing_subscriptions enable row level security;

-- Intentionally no browser policies. The service role bypasses RLS, while the
-- anon/authenticated browser roles cannot enumerate billing state directly.
revoke all on public.billing_customers from anon, authenticated;
revoke all on public.billing_subscriptions from anon, authenticated;
