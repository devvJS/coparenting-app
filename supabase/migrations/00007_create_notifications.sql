-- Phase 2 / Migration 00007
-- notifications: per-user inbox; users only ever see/update their own rows.
-- household_id is denormalized for filtering and for cascade cleanup.

create type public.notification_type as enum (
  'event_reminder',
  'handoff',
  'message',
  'document',
  'child_update',
  'system'
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid not null references public.households(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  reference_id uuid,
  reference_type text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read = false;
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_delete_own"
  on public.notifications
  for delete
  to authenticated
  using (user_id = auth.uid());

-- Inserts are normally performed by server-side jobs / triggers using the
-- service role (which bypasses RLS). Allow a household member to write a
-- notification targeted at themselves so client-side flows (e.g. dismissing
-- and reissuing) are possible without the service key.
create policy "notifications_insert_self_household"
  on public.notifications
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_household_member(household_id)
  );
