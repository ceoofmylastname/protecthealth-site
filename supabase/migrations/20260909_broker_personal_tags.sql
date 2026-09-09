-- Brokers can define their own tags. Applied to production Sep 9 2026; this
-- file is the record, not the mechanism.
--
-- One table, not two. ph_contacts.tags is a text[] of NAMES, so a personal tag
-- and an office tag are the same thing to a contact row; splitting them into a
-- second table would buy nothing and force every reader to union two queries.
-- agent_id null means the office list every broker sees. agent_id set means
-- that broker's own, invisible to the other 56.

alter table public.ph_tags
  add column if not exists agent_id uuid references public.ph_agents(id) on delete cascade;

comment on column public.ph_tags.agent_id is
  'null = office-wide tag, admin-managed. set = private to that broker, invisible to everyone else.';

-- The old global unique-on-name has to go: two brokers may each want a "Hot"
-- tag of their own, and under one shared constraint the second one to try is
-- simply told no for a reason they cannot see. Uniqueness becomes per-scope,
-- partial on is_active so a retired name can be reused.
alter table public.ph_tags drop constraint if exists ph_tags_name_key;
create unique index if not exists ph_tags_office_name
  on public.ph_tags (lower(name)) where agent_id is null and is_active;
create unique index if not exists ph_tags_personal_name
  on public.ph_tags (agent_id, lower(name)) where agent_id is not null and is_active;

-- Read was `true`. It has to narrow, or "private to me" is a UI filter rather
-- than a fact: a broker could still read every other broker's tags straight off
-- the API. Admins keep the whole picture.
drop policy if exists ph_tags_read on public.ph_tags;
create policy ph_tags_read on public.ph_tags
  for select using (agent_id is null or public.ph_is_admin() or agent_id = public.ph_agent_id());

-- Write was admin-only. A broker may now create, rename and retire their OWN
-- tags and nothing else. The `agent_id is not null` half is what stops a broker
-- inserting an office tag by leaving the column blank.
drop policy if exists ph_tags_write on public.ph_tags;
create policy ph_tags_write on public.ph_tags
  for all
  using  (public.ph_is_admin() or (agent_id is not null and agent_id = public.ph_agent_id()))
  with check (public.ph_is_admin() or (agent_id is not null and agent_id = public.ph_agent_id()));
