create table if not exists public.assignments (
  id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 500),
  due_date date not null,
  due_time time without time zone not null,
  reminder text not null default '60',
  type text,
  color text,
  color_hex text,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.assignments enable row level security;

drop policy if exists "Users can read their own assignments" on public.assignments;
create policy "Users can read their own assignments"
  on public.assignments for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own assignments" on public.assignments;
create policy "Users can create their own assignments"
  on public.assignments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own assignments" on public.assignments;
create policy "Users can update their own assignments"
  on public.assignments for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create index if not exists assignments_user_due_idx
  on public.assignments (user_id, due_date, due_time);

grant select, insert, update on public.assignments to authenticated;
