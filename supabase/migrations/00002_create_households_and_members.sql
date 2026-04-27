-- Phase 2 / Migration 00002
-- households + household_members, plus the SECURITY DEFINER helper used by every
-- subsequent table's RLS policies to check household membership without recursing
-- through household_members' own RLS.

create type public.household_role as enum ('co_parent_a', 'co_parent_b');

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.household_role not null,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  unique (household_id, role)
);

create index if not exists household_members_user_id_idx
  on public.household_members (user_id);

-- Helper: bypasses RLS so policies on household_members and child tables can
-- check membership without recursive policy evaluation.
create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = hid
      and hm.user_id = auth.uid()
  );
$$;

revoke all on function public.is_household_member(uuid) from public;
grant execute on function public.is_household_member(uuid) to authenticated;

alter table public.households enable row level security;
alter table public.household_members enable row level security;

-- households: members can read; creation is performed via the join/create flow
-- in Phase 3 (an RPC will be introduced there). For now allow authenticated
-- inserts so seeding & test fixtures work; tightening happens with the RPC.
create policy "households_select_member"
  on public.households
  for select
  to authenticated
  using (public.is_household_member(id));

create policy "households_insert_authenticated"
  on public.households
  for insert
  to authenticated
  with check (true);

create policy "households_update_member"
  on public.households
  for update
  to authenticated
  using (public.is_household_member(id))
  with check (public.is_household_member(id));

-- household_members: a row is visible iff the current user is a member of the
-- same household (which includes their own membership row).
create policy "household_members_select_same_household"
  on public.household_members
  for select
  to authenticated
  using (public.is_household_member(household_id));

-- Self-insert is needed for Phase 3's "join by code" RPC and for seed fixtures.
create policy "household_members_insert_self"
  on public.household_members
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "household_members_delete_self"
  on public.household_members
  for delete
  to authenticated
  using (user_id = auth.uid());
