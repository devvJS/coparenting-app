-- Phase 2 / Migration 00004
-- events, custody_schedules, handoffs — all scoped to household membership.

create type public.event_type as enum (
  'general',
  'appointment',
  'school',
  'activity',
  'medical',
  'milestone',
  'custody'
);

create type public.handoff_status as enum (
  'pending',
  'confirmed',
  'completed',
  'missed'
);

-- events ---------------------------------------------------------------------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz,
  event_type public.event_type not null default 'general',
  child_id uuid references public.children(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint events_end_after_start check (end_time is null or end_time >= start_time)
);

create index if not exists events_household_start_idx
  on public.events (household_id, start_time);
create index if not exists events_child_id_idx
  on public.events (child_id);

alter table public.events enable row level security;

create policy "events_select_member"
  on public.events
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "events_insert_member"
  on public.events
  for insert
  to authenticated
  with check (
    public.is_household_member(household_id)
    and created_by = auth.uid()
  );

create policy "events_update_member"
  on public.events
  for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "events_delete_member"
  on public.events
  for delete
  to authenticated
  using (public.is_household_member(household_id));

-- custody_schedules ----------------------------------------------------------

create table if not exists public.custody_schedules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  parent_id uuid not null references auth.users(id) on delete restrict,
  start_date date not null,
  end_date date not null,
  recurrence_rule text,
  created_at timestamptz not null default now(),
  constraint custody_schedules_dates_ordered check (end_date >= start_date)
);

create index if not exists custody_schedules_household_idx
  on public.custody_schedules (household_id, start_date, end_date);
create index if not exists custody_schedules_child_idx
  on public.custody_schedules (child_id);

alter table public.custody_schedules enable row level security;

create policy "custody_schedules_select_member"
  on public.custody_schedules
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "custody_schedules_insert_member"
  on public.custody_schedules
  for insert
  to authenticated
  with check (public.is_household_member(household_id));

create policy "custody_schedules_update_member"
  on public.custody_schedules
  for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "custody_schedules_delete_member"
  on public.custody_schedules
  for delete
  to authenticated
  using (public.is_household_member(household_id));

-- handoffs -------------------------------------------------------------------

create table if not exists public.handoffs (
  id uuid primary key default gen_random_uuid(),
  custody_schedule_id uuid not null references public.custody_schedules(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  from_parent uuid not null references auth.users(id) on delete restrict,
  to_parent uuid not null references auth.users(id) on delete restrict,
  scheduled_at timestamptz not null,
  status public.handoff_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  constraint handoffs_distinct_parents check (from_parent <> to_parent)
);

create index if not exists handoffs_household_scheduled_idx
  on public.handoffs (household_id, scheduled_at);
create index if not exists handoffs_custody_schedule_idx
  on public.handoffs (custody_schedule_id);

alter table public.handoffs enable row level security;

create policy "handoffs_select_member"
  on public.handoffs
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "handoffs_insert_member"
  on public.handoffs
  for insert
  to authenticated
  with check (public.is_household_member(household_id));

create policy "handoffs_update_member"
  on public.handoffs
  for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "handoffs_delete_member"
  on public.handoffs
  for delete
  to authenticated
  using (public.is_household_member(household_id));
