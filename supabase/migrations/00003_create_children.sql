-- Phase 2 / Migration 00003
-- children: per-household child records; full CRUD restricted to household members.

create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  first_name text not null,
  last_name text,
  date_of_birth date,
  medical_notes text,
  school_info text,
  emergency_contacts jsonb not null default '[]'::jsonb,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists children_household_id_idx
  on public.children (household_id);

-- Keep updated_at in sync on UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger children_set_updated_at
  before update on public.children
  for each row
  execute function public.set_updated_at();

alter table public.children enable row level security;

create policy "children_select_member"
  on public.children
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "children_insert_member"
  on public.children
  for insert
  to authenticated
  with check (public.is_household_member(household_id));

create policy "children_update_member"
  on public.children
  for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "children_delete_member"
  on public.children
  for delete
  to authenticated
  using (public.is_household_member(household_id));
