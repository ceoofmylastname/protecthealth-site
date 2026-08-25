-- Documents on a contact record
-- Aug 25 2026
--
-- Applied to production Aug 25 2026 as migrations `contact_files` and
-- `contact_files_uploader_name`. Checked in so the schema is readable from the
-- repo.
--
-- Ownership is the same rule as ph_notes: an admin, or the broker the contact
-- is assigned to. Bytes live in the PRIVATE 'contact-files' bucket, keyed
-- <contact_id>/<uuid>-<filename>, so the storage policy can check ownership
-- against the first path segment. Nothing is ever served from a public URL —
-- the panel mints a 5-minute signed link on every open.

create table if not exists public.ph_contact_files (
  id               uuid primary key default gen_random_uuid(),
  contact_id       text not null,
  folder           text not null default 'Other',
  name             text not null,
  path             text not null unique,
  mime             text,
  size_bytes       bigint,
  uploaded_by      uuid default auth.uid(),
  -- Denormalised on purpose. The alternative is a join against ph_agents on
  -- every record open, and a broker reading another broker's roster row is
  -- exactly what the access model is careful about.
  uploaded_by_name text,
  created_at       timestamptz not null default now()
);

create index if not exists ph_contact_files_contact_idx
  on public.ph_contact_files (contact_id, created_at desc);

alter table public.ph_contact_files enable row level security;

drop policy if exists ph_contact_files_read   on public.ph_contact_files;
drop policy if exists ph_contact_files_insert on public.ph_contact_files;
drop policy if exists ph_contact_files_update on public.ph_contact_files;
drop policy if exists ph_contact_files_delete on public.ph_contact_files;

create policy ph_contact_files_read on public.ph_contact_files for select
  using (public.ph_is_admin() or exists (
    select 1 from public.ph_contacts c
    where c.ghl_contact_id = ph_contact_files.contact_id and c.agent_id = public.ph_agent_id()));

create policy ph_contact_files_insert on public.ph_contact_files for insert
  with check (public.ph_is_admin() or exists (
    select 1 from public.ph_contacts c
    where c.ghl_contact_id = ph_contact_files.contact_id and c.agent_id = public.ph_agent_id()));

create policy ph_contact_files_update on public.ph_contact_files for update
  using (public.ph_is_admin() or exists (
    select 1 from public.ph_contacts c
    where c.ghl_contact_id = ph_contact_files.contact_id and c.agent_id = public.ph_agent_id()))
  with check (public.ph_is_admin() or exists (
    select 1 from public.ph_contacts c
    where c.ghl_contact_id = ph_contact_files.contact_id and c.agent_id = public.ph_agent_id()));

create policy ph_contact_files_delete on public.ph_contact_files for delete
  using (public.ph_is_admin() or exists (
    select 1 from public.ph_contacts c
    where c.ghl_contact_id = ph_contact_files.contact_id and c.agent_id = public.ph_agent_id()));

grant select, insert, update, delete on public.ph_contact_files to authenticated;

insert into storage.buckets (id, name, public, file_size_limit)
values ('contact-files', 'Contact documents', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists ph_contact_files_obj_read   on storage.objects;
drop policy if exists ph_contact_files_obj_insert on storage.objects;
drop policy if exists ph_contact_files_obj_update on storage.objects;
drop policy if exists ph_contact_files_obj_delete on storage.objects;

create policy ph_contact_files_obj_read on storage.objects for select
  using (bucket_id = 'contact-files' and (public.ph_is_admin() or exists (
    select 1 from public.ph_contacts c
    where c.ghl_contact_id = (storage.foldername(name))[1] and c.agent_id = public.ph_agent_id())));

create policy ph_contact_files_obj_insert on storage.objects for insert
  with check (bucket_id = 'contact-files' and (public.ph_is_admin() or exists (
    select 1 from public.ph_contacts c
    where c.ghl_contact_id = (storage.foldername(name))[1] and c.agent_id = public.ph_agent_id())));

create policy ph_contact_files_obj_update on storage.objects for update
  using (bucket_id = 'contact-files' and (public.ph_is_admin() or exists (
    select 1 from public.ph_contacts c
    where c.ghl_contact_id = (storage.foldername(name))[1] and c.agent_id = public.ph_agent_id())));

create policy ph_contact_files_obj_delete on storage.objects for delete
  using (bucket_id = 'contact-files' and (public.ph_is_admin() or exists (
    select 1 from public.ph_contacts c
    where c.ghl_contact_id = (storage.foldername(name))[1] and c.agent_id = public.ph_agent_id())));
