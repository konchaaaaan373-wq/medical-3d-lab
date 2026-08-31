-- Medical education progress across devices.
--
-- No patient data belongs here. The browser never reads/writes this table
-- directly; Netlify Functions authenticate the Supabase user and use the
-- server secret for application-managed access.

create table if not exists public.education_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  scene_id text not null check (char_length(scene_id) between 1 and 80),
  module_id text not null check (char_length(module_id) between 1 and 80),
  step_index integer not null default 0 check (step_index between 0 and 10000),
  completed boolean not null default false,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, scene_id, module_id)
);

create index if not exists education_progress_updated_at_idx
  on public.education_progress(user_id, updated_at desc);

alter table public.education_progress enable row level security;

revoke all on public.education_progress from anon, authenticated;
