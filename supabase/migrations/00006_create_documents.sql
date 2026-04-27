-- Phase 2 / Migration 00006
-- documents table + Storage bucket "documents" with member-only access policies.
-- Files are stored under <household_id>/... so the first folder of the object
-- name encodes the household membership scope.

create type public.document_category as enum (
  'legal',
  'medical',
  'school',
  'other'
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  child_id uuid references public.children(id) on delete set null,
  title text not null,
  description text,
  file_path text not null,
  file_type text,
  category public.document_category not null default 'other',
  created_at timestamptz not null default now()
);

create index if not exists documents_household_created_idx
  on public.documents (household_id, created_at desc);
create index if not exists documents_child_idx
  on public.documents (child_id);
create index if not exists documents_category_idx
  on public.documents (household_id, category);

alter table public.documents enable row level security;

create policy "documents_select_member"
  on public.documents
  for select
  to authenticated
  using (public.is_household_member(household_id));

create policy "documents_insert_member"
  on public.documents
  for insert
  to authenticated
  with check (
    public.is_household_member(household_id)
    and uploaded_by = auth.uid()
  );

create policy "documents_update_member"
  on public.documents
  for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "documents_delete_member"
  on public.documents
  for delete
  to authenticated
  using (public.is_household_member(household_id));

-- Storage bucket -------------------------------------------------------------
-- Private bucket; access is gated by the storage.objects RLS policies below.
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Path convention: <household_id>/<filename>. The first folder segment of the
-- object name is treated as the household_id and matched against
-- household_members. is_household_member() handles the auth.uid() lookup.
create policy "documents_storage_select_member"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documents'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );

create policy "documents_storage_insert_member"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
    and owner = auth.uid()
  );

create policy "documents_storage_update_member"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'documents'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'documents'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );

create policy "documents_storage_delete_member"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and public.is_household_member(((storage.foldername(name))[1])::uuid)
  );
