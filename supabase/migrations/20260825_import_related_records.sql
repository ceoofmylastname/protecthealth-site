-- CSV import: related records + email safety
-- Aug 25 2026
--
-- Two things the importer needs from the database.
--
-- 1. A bulk import must never mail anybody.
--    ph_contacts_active_client_ins fires ph_active_client_http() on every row
--    inserted with disposition = 'Active Client', which POSTs to the
--    ph-client-emails edge function. Importing a book of 2,000 existing clients
--    would have sent 2,000 welcome/review emails. The UPDATE twin has the same
--    problem the moment a file promotes a batch of leads to Active Client.
--
--    `imported_at` is the flag both triggers now read. The importer stamps it
--    on every contact row it writes, on create AND on update. Nothing else in
--    the product touches the column, so:
--      * insert from a file  -> imported_at is set          -> no email
--      * insert from the UI  -> imported_at is null         -> email as before
--      * update from a file  -> imported_at changes         -> no email
--      * update from the UI  -> imported_at unchanged       -> email as before
--
--    It is also just useful: `where imported_at is not null` is "everything
--    that came in from a spreadsheet".
--
-- 2. A policy needs a natural key so re-running the same file does not stack up
--    duplicate policies. contact + line + policy number is that key. It is a
--    partial unique index rather than a constraint because a policy with no
--    number is legitimate and there can be more than one of those on a line.

begin;

-- ---------------------------------------------------------------- 1. the flag
alter table public.ph_contacts
  add column if not exists imported_at timestamptz;

comment on column public.ph_contacts.imported_at is
  'Set by the CSV importer on every row it writes. Gates the Active Client email triggers so a bulk import never mails a client. Null = this row was last touched by a human in the UI.';

create index if not exists ph_contacts_imported_at_idx
  on public.ph_contacts (imported_at) where imported_at is not null;

-- ------------------------------------------------- 2. gate the email triggers
drop trigger if exists ph_contacts_active_client_ins on public.ph_contacts;
create trigger ph_contacts_active_client_ins
  after insert on public.ph_contacts
  for each row
  when (new.disposition = 'Active Client' and new.imported_at is null)
  execute function public.ph_active_client_http();

drop trigger if exists ph_contacts_active_client_upd on public.ph_contacts;
create trigger ph_contacts_active_client_upd
  after update of disposition on public.ph_contacts
  for each row
  when (
    new.disposition = 'Active Client'
    and old.disposition is distinct from 'Active Client'
    -- An import bumps imported_at in the same statement that moves the
    -- disposition. A human in the CRM never touches it, so the two are equal
    -- and the email still goes out exactly as it did before.
    and new.imported_at is not distinct from old.imported_at
  )
  execute function public.ph_active_client_http();

-- ------------------------------------------------ 3. policy de-duplication key
-- Existing rows are left alone; if the book already holds two identical
-- (contact, line, number) policies this index will refuse to build. That is the
-- right failure: fix the duplicate first.
create unique index if not exists ph_policies_contact_line_number_uidx
  on public.ph_policies (contact_id, line, policy_number)
  where policy_number is not null;

commit;

-- Rollback
-- ---------
-- begin;
--   drop index if exists public.ph_policies_contact_line_number_uidx;
--   drop trigger if exists ph_contacts_active_client_ins on public.ph_contacts;
--   create trigger ph_contacts_active_client_ins after insert on public.ph_contacts
--     for each row when (new.disposition = 'Active Client')
--     execute function public.ph_active_client_http();
--   drop trigger if exists ph_contacts_active_client_upd on public.ph_contacts;
--   create trigger ph_contacts_active_client_upd after update of disposition on public.ph_contacts
--     for each row when (new.disposition = 'Active Client' and old.disposition is distinct from 'Active Client')
--     execute function public.ph_active_client_http();
--   drop index if exists public.ph_contacts_imported_at_idx;
--   alter table public.ph_contacts drop column if exists imported_at;
-- commit;
