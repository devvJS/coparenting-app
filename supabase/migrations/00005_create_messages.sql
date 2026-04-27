-- Phase 2 / Migration 00005
-- messages: per-household direct messaging between co-parents.
-- Realtime is enabled by adding the table to the supabase_realtime publication.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete restrict,
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_household_created_idx
  on public.messages (household_id, created_at desc);
create index if not exists messages_unread_idx
  on public.messages (household_id, read_at)
  where read_at is null;

alter table public.messages enable row level security;

create policy "messages_select_member"
  on public.messages
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "messages_insert_member"
  on public.messages
  for insert
  to authenticated
  with check (
    public.is_household_member(household_id)
    and sender_id = auth.uid()
  );

-- Update is allowed to flip read_at (or any field on a household member's
-- message). Constraining the diff happens client-side in Phase 5.
create policy "messages_update_member"
  on public.messages
  for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- Senders can delete their own messages.
create policy "messages_delete_own"
  on public.messages
  for delete
  to authenticated
  using (
    public.is_household_member(household_id)
    and sender_id = auth.uid()
  );

-- Enable Realtime for this table. The supabase_realtime publication is created
-- automatically by Supabase; if it does not exist yet (e.g. in some local
-- bootstraps), fall back to creating it.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

alter publication supabase_realtime add table public.messages;
