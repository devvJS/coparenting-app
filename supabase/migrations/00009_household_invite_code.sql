-- Phase 3 / Migration 00009
-- Add a 6-character invite_code to households and an RPC that lets a second
-- co-parent join an existing household by pasting that code.

alter table public.households
  add column if not exists invite_code text;

create unique index if not exists households_invite_code_key
  on public.households (invite_code)
  where invite_code is not null;

-- join_household_by_code: validates the code, ensures the household has an
-- open seat (max 2 members per the household_role enum), and inserts a
-- household_members row for the calling user as 'co_parent_b'. Returns the
-- household id on success; raises on invalid/full/duplicate.
create or replace function public.join_household_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_household uuid;
  member_count int;
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if code is null or length(trim(code)) = 0 then
    raise exception 'Invite code required' using errcode = '22023';
  end if;

  select id into target_household
  from public.households
  where invite_code = upper(trim(code));

  if target_household is null then
    raise exception 'Invalid invite code' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.household_members
    where household_id = target_household and user_id = uid
  ) then
    raise exception 'Already a member of this household' using errcode = '23505';
  end if;

  select count(*) into member_count
  from public.household_members
  where household_id = target_household;

  if member_count >= 2 then
    raise exception 'Household is full' using errcode = '23514';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (target_household, uid, 'co_parent_b');

  return target_household;
end;
$$;

revoke all on function public.join_household_by_code(text) from public;
grant execute on function public.join_household_by_code(text) to authenticated;
