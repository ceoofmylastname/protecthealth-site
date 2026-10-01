-- Room & workspace booking (replaces the GHL "InsureSpace Hub" service menu).
--
-- One global calendar per room. Every broker sees the same availability, and
-- the database, not the browser, is what makes a double booking impossible:
-- ph_room_bookings_no_overlap is an exclusion constraint over the booked range
-- (including the room's cleanup buffer), so two brokers racing for the same
-- hour can never both win, no matter which client wrote the row.
--
-- All wall-clock rules (open hours, blackout days) are Las Vegas time and are
-- evaluated in the database against America/Los_Angeles, so DST never moves a
-- booking window.

create extension if not exists btree_gist with schema extensions;

-- ---------- rooms ----------
create table if not exists public.ph_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'room' check (kind in ('room','workspace')),
  description text,
  photo_url text,
  capacity int check (capacity is null or capacity > 0),
  buffer_minutes int not null default 0 check (buffer_minutes between 0 and 120),
  sort_order int not null default 0,
  is_active boolean not null default true,
  ghl_calendar_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Weekly open hours, one window per weekday (0 = Sunday). No row = closed.
create table if not exists public.ph_room_hours (
  room_id uuid not null references public.ph_rooms(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  opens time not null,
  closes time not null,
  primary key (room_id, weekday),
  check (closes > opens)
);

-- Blackouts. room_id null = every room (office closed). All-day blackouts may
-- span several days; a timed blackout is a single day's window.
create table if not exists public.ph_room_blackouts (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.ph_rooms(id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  start_time time,
  end_time time,
  reason text,
  during tstzrange,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check ((start_time is null) = (end_time is null)),
  check (start_time is null or (ends_on = starts_on and end_time > start_time))
);
create index if not exists ph_room_blackouts_during on public.ph_room_blackouts using gist (during);

create or replace function public.ph_room_blackouts_fill() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.start_time is null then
    new.during := tstzrange(
      (new.starts_on::timestamp) at time zone 'America/Los_Angeles',
      ((new.ends_on + 1)::timestamp) at time zone 'America/Los_Angeles', '[)');
  else
    new.during := tstzrange(
      (new.starts_on + new.start_time) at time zone 'America/Los_Angeles',
      (new.starts_on + new.end_time) at time zone 'America/Los_Angeles', '[)');
  end if;
  return new;
end $$;
drop trigger if exists ph_room_blackouts_fill on public.ph_room_blackouts;
create trigger ph_room_blackouts_fill before insert or update on public.ph_room_blackouts
  for each row execute function public.ph_room_blackouts_fill();

-- Global booking rules. One row.
create table if not exists public.ph_room_settings (
  id int primary key default 1 check (id = 1),
  step_minutes int not null default 30 check (step_minutes in (15, 30, 60)),
  max_hours numeric not null default 9 check (max_hours > 0 and max_hours <= 24),
  max_days_ahead int not null default 90 check (max_days_ahead between 1 and 365),
  notify_email text,
  updated_at timestamptz not null default now()
);
insert into public.ph_room_settings (id) values (1) on conflict do nothing;

-- ---------- bookings ----------
create table if not exists public.ph_room_bookings (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.ph_rooms(id),
  agent_id uuid not null references public.ph_agents(id),
  start_at timestamptz not null,
  end_at timestamptz not null,
  buffer_minutes int not null default 0,
  during tstzrange,
  status text not null default 'booked' check (status in ('booked','cancelled')),
  notes text,
  source text not null default 'crm' check (source in ('crm','admin','ghl_import')),
  ghl_event_id text unique,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason text,
  check (end_at > start_at)
);

-- THE no-double-booking guarantee. Cancelled rows drop out of the constraint,
-- so cancelling frees the slot the instant it commits.
alter table public.ph_room_bookings drop constraint if exists ph_room_bookings_no_overlap;
alter table public.ph_room_bookings add constraint ph_room_bookings_no_overlap
  exclude using gist (room_id with =, during with &&) where (status = 'booked');

create index if not exists ph_room_bookings_agent on public.ph_room_bookings (agent_id, start_at);
create index if not exists ph_room_bookings_start on public.ph_room_bookings (start_at);

-- Every rule a broker must follow lives here, because the CRM writes this table
-- straight from the browser. Admins (and server-side writes, auth.uid() null)
-- may override hours, blackouts, length and lead-time rules. Nobody can
-- override the overlap constraint.
create or replace function public.ph_room_bookings_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_admin boolean := public.ph_is_admin();
  v_me uuid := public.ph_agent_id();
  v_sys boolean := auth.uid() is null;
  v_set public.ph_room_settings;
  v_room public.ph_rooms;
  v_hours public.ph_room_hours;
  v_ls timestamp; v_le timestamp;
  v_bo record;
begin
  if not v_sys and not v_admin then
    if v_me is null then raise exception 'NOT_A_BROKER: Only brokers can book rooms.'; end if;
    if tg_op = 'INSERT' and new.agent_id is distinct from v_me then
      raise exception 'NOT_YOURS: You can only book rooms for yourself.';
    end if;
    if tg_op = 'UPDATE' and (old.agent_id is distinct from v_me or new.agent_id is distinct from old.agent_id) then
      raise exception 'NOT_YOURS: You can only change your own bookings.';
    end if;
    if tg_op = 'INSERT' then new.source := 'crm'; end if;
  end if;

  if tg_op = 'UPDATE' and old.status = 'cancelled' and new.status = 'booked' and not (v_admin or v_sys) then
    raise exception 'CANCELLED: This booking was cancelled. Book the time again instead.';
  end if;

  if new.status = 'cancelled' and (tg_op = 'INSERT' or old.status = 'booked') then
    new.cancelled_at := now();
    new.cancelled_by := auth.uid();
  end if;

  select * into v_room from public.ph_rooms where id = new.room_id;
  if not found then raise exception 'NO_ROOM: That room does not exist.'; end if;

  -- Buffer is copied from the room when the time or room changes, so editing a
  -- room's buffer later never retro-breaks existing bookings.
  if tg_op = 'INSERT' or new.room_id <> old.room_id or new.start_at <> old.start_at or new.end_at <> old.end_at then
    new.buffer_minutes := coalesce(v_room.buffer_minutes, 0);
  end if;
  new.during := tstzrange(new.start_at, new.end_at + make_interval(mins => new.buffer_minutes), '[)');
  new.updated_at := now();

  if new.status <> 'booked' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'booked' and new.room_id = old.room_id
     and new.start_at = old.start_at and new.end_at = old.end_at then
    return new; -- notes-only edit
  end if;
  if v_admin or v_sys then return new; end if;

  select * into v_set from public.ph_room_settings where id = 1;
  if not v_room.is_active then raise exception 'ROOM_INACTIVE: % is not taking bookings right now.', v_room.name; end if;
  if new.start_at < now() - interval '5 minutes' then raise exception 'IN_PAST: That time has already passed.'; end if;
  if new.start_at > now() + make_interval(days => v_set.max_days_ahead) then
    raise exception 'TOO_FAR: Rooms can be booked up to % days ahead.', v_set.max_days_ahead;
  end if;
  if new.end_at - new.start_at > make_interval(secs => (v_set.max_hours * 3600)::int) then
    raise exception 'TOO_LONG: A single booking can be at most % hours.', trim(to_char(v_set.max_hours, 'FM990.##'));
  end if;

  v_ls := new.start_at at time zone 'America/Los_Angeles';
  v_le := new.end_at at time zone 'America/Los_Angeles';
  if v_ls::date <> (v_le - interval '1 second')::date then
    raise exception 'ONE_DAY: A booking has to start and end on the same day.';
  end if;
  select * into v_hours from public.ph_room_hours where room_id = new.room_id and weekday = extract(dow from v_ls)::int;
  if not found then raise exception 'CLOSED: % is closed that day.', v_room.name; end if;
  if v_ls::time < v_hours.opens or (v_le - v_ls::date) > (v_hours.closes - time '00:00') then
    raise exception 'OUTSIDE_HOURS: % is open % to % that day.', v_room.name,
      trim(to_char(date '2000-01-01' + v_hours.opens, 'FMHH12:MI AM')), trim(to_char(date '2000-01-01' + v_hours.closes, 'FMHH12:MI AM'));
  end if;

  select b.reason into v_bo from public.ph_room_blackouts b
   where (b.room_id is null or b.room_id = new.room_id)
     and b.during && tstzrange(new.start_at, new.end_at, '[)')
   limit 1;
  if found then
    raise exception 'BLACKED_OUT: % is unavailable then%.', v_room.name,
      case when coalesce(btrim(v_bo.reason), '') <> '' then ' (' || v_bo.reason || ')' else '' end;
  end if;
  return new;
end $$;

drop trigger if exists ph_room_bookings_guard on public.ph_room_bookings;
create trigger ph_room_bookings_guard before insert or update on public.ph_room_bookings
  for each row execute function public.ph_room_bookings_guard();

-- ---------- admin notifications ----------
create table if not exists public.ph_admin_notifications (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null,
  body text,
  booking_id uuid references public.ph_room_bookings(id) on delete set null,
  actor_name text,
  created_at timestamptz not null default now(),
  read_by uuid[] not null default '{}',
  emailed_at timestamptz,
  email_error text
);
create index if not exists ph_admin_notifications_created on public.ph_admin_notifications (created_at desc);

create or replace function public.ph_room_bookings_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_kind text; v_room text; v_agent text; v_actor text; v_when text; v_title text; v_body text;
  v_ls timestamp; v_le timestamp;
begin
  if tg_op = 'INSERT' then
    if new.source = 'ghl_import' or new.status <> 'booked' then return new; end if;
    v_kind := 'room_booked';
  elsif old.status = 'booked' and new.status = 'cancelled' then
    v_kind := 'room_cancelled';
  elsif new.status = 'booked' and (new.start_at <> old.start_at or new.end_at <> old.end_at or new.room_id <> old.room_id or old.status <> 'booked') then
    v_kind := 'room_changed';
  else
    return new;
  end if;

  select name into v_room from public.ph_rooms where id = new.room_id;
  select full_name into v_agent from public.ph_agents where id = new.agent_id;
  select coalesce(
           (select full_name from public.ph_agents where auth_user_id = auth.uid() limit 1),
           (select split_part(email, '@', 1) from public.ph_admins where auth_user_id = auth.uid() limit 1),
           'The system') into v_actor;

  v_ls := new.start_at at time zone 'America/Los_Angeles';
  v_le := new.end_at at time zone 'America/Los_Angeles';
  v_when := trim(to_char(v_ls, 'FMDay, FMMon FMDD')) || ', ' || trim(to_char(v_ls, 'FMHH12:MI AM')) || ' – ' || trim(to_char(v_le, 'FMHH12:MI AM'));

  v_title := case v_kind
    when 'room_booked' then v_agent || ' booked ' || v_room
    when 'room_cancelled' then v_room || ' booking cancelled'
    else v_room || ' booking changed' end;
  v_body := v_when || case when v_kind <> 'room_booked' then ' · ' || v_agent else '' end
            || case when v_actor is not null and v_actor <> coalesce(v_agent, '') then ' · by ' || v_actor else '' end;

  insert into public.ph_admin_notifications (kind, title, body, booking_id, actor_name)
  values (v_kind, v_title, v_body, new.id, v_actor);
  return new;
end $$;

drop trigger if exists ph_room_bookings_zz_notify on public.ph_room_bookings;
create trigger ph_room_bookings_zz_notify after insert or update on public.ph_room_bookings
  for each row execute function public.ph_room_bookings_notify();

-- Email goes out through ph-rooms, fired per notification. Idempotent on
-- ph_admin_notifications.emailed_at, so a retry never double-sends.
create or replace function public.ph_admin_notifications_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://hrzonmnswzwridwqbspb.supabase.co/functions/v1/ph-rooms',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyem9ubW5zd3p3cmlkd3Fic3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MTQ0NDcsImV4cCI6MjA2MzI5MDQ0N30.tGq9b0awwwTUBlwjCbOnlRDqUOV2NtQEUkBrU3gcbSo',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyem9ubW5zd3p3cmlkd3Fic3BiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MTQ0NDcsImV4cCI6MjA2MzI5MDQ0N30.tGq9b0awwwTUBlwjCbOnlRDqUOV2NtQEUkBrU3gcbSo'),
    body := jsonb_build_object('action', 'notify', 'id', new.id));
  return new;
end $$;
drop trigger if exists ph_admin_notifications_email on public.ph_admin_notifications;
create trigger ph_admin_notifications_email after insert on public.ph_admin_notifications
  for each row when (new.kind like 'room_%') execute function public.ph_admin_notifications_email();

-- ---------- reads ----------
-- What every broker sees: who holds each room and when. Names are shown on
-- purpose (an office board, not a client calendar). Notes stay private to the
-- booker and admins.
create or replace function public.ph_room_busy(p_from timestamptz, p_to timestamptz)
returns table (id uuid, room_id uuid, start_at timestamptz, end_at timestamptz, buffer_minutes int,
               agent_id uuid, agent_name text, is_mine boolean, notes text)
language sql stable security definer set search_path = public as $$
  select b.id, b.room_id, b.start_at, b.end_at, b.buffer_minutes, b.agent_id, a.full_name,
         b.agent_id = public.ph_agent_id(),
         case when b.agent_id = public.ph_agent_id() or public.ph_is_admin() then b.notes end
  from public.ph_room_bookings b
  join public.ph_agents a on a.id = b.agent_id
  where b.status = 'booked'
    and b.start_at < p_to and b.end_at > p_from
    and (public.ph_agent_id() is not null or public.ph_is_admin())
  order by b.start_at;
$$;
grant execute on function public.ph_room_busy(timestamptz, timestamptz) to authenticated;

-- Blackouts expanded for a window, for both calendars.
create or replace function public.ph_room_blackouts_in(p_from timestamptz, p_to timestamptz)
returns table (id uuid, room_id uuid, start_at timestamptz, end_at timestamptz, reason text, all_day boolean)
language sql stable security definer set search_path = public as $$
  select b.id, b.room_id, lower(b.during), upper(b.during), b.reason, b.start_time is null
  from public.ph_room_blackouts b
  where b.during && tstzrange(p_from, p_to, '[)')
    and (public.ph_agent_id() is not null or public.ph_is_admin())
  order by lower(b.during);
$$;
grant execute on function public.ph_room_blackouts_in(timestamptz, timestamptz) to authenticated;

-- ---------- RLS ----------
alter table public.ph_rooms enable row level security;
alter table public.ph_room_hours enable row level security;
alter table public.ph_room_blackouts enable row level security;
alter table public.ph_room_settings enable row level security;
alter table public.ph_room_bookings enable row level security;
alter table public.ph_admin_notifications enable row level security;

do $$ declare t text; begin
  foreach t in array array['ph_rooms','ph_room_hours','ph_room_blackouts','ph_room_settings'] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.ph_is_admin()) with check (public.ph_is_admin())', t || '_admin', t);
  end loop;
end $$;

drop policy if exists ph_room_bookings_read on public.ph_room_bookings;
create policy ph_room_bookings_read on public.ph_room_bookings for select to authenticated
  using (public.ph_is_admin() or agent_id = public.ph_agent_id());
drop policy if exists ph_room_bookings_insert on public.ph_room_bookings;
create policy ph_room_bookings_insert on public.ph_room_bookings for insert to authenticated
  with check (public.ph_is_admin() or agent_id = public.ph_agent_id());
drop policy if exists ph_room_bookings_update on public.ph_room_bookings;
create policy ph_room_bookings_update on public.ph_room_bookings for update to authenticated
  using (public.ph_is_admin() or agent_id = public.ph_agent_id())
  with check (public.ph_is_admin() or agent_id = public.ph_agent_id());
drop policy if exists ph_room_bookings_delete on public.ph_room_bookings;
create policy ph_room_bookings_delete on public.ph_room_bookings for delete to authenticated
  using (public.ph_is_admin());

drop policy if exists ph_admin_notifications_admin on public.ph_admin_notifications;
create policy ph_admin_notifications_admin on public.ph_admin_notifications for all to authenticated
  using (public.ph_is_admin()) with check (public.ph_is_admin());

-- ---------- photos ----------
insert into storage.buckets (id, name, public) values ('room-photos', 'room-photos', true)
  on conflict (id) do nothing;
drop policy if exists room_photos_admin_write on storage.objects;
create policy room_photos_admin_write on storage.objects for all to authenticated
  using (bucket_id = 'room-photos' and public.ph_is_admin())
  with check (bucket_id = 'room-photos' and public.ph_is_admin());

-- ---------- seed: the three live rooms from GHL, verbatim ----------
insert into public.ph_rooms (name, kind, description, photo_url, capacity, buffer_minutes, sort_order, ghl_calendar_id) values
 ('Meeting Room 1', 'room',
  'Discover the ProtectHealth Meeting 1 Room, a compact and efficient space designed for focused discussions and strategic planning. Ideal for small team huddles, one-on-one client consultations, or private brainstorming sessions, this room offers a quiet, professional environment equipped with essential technology to facilitate productive encounters. Book the ProtectHealth Strategy Suite for your next intimate meeting and harness the power of effective, close-knit collaboration.',
  'https://msgsndr-private.storage.googleapis.com/calendar-widget-logo/f898c174-ea33-439c-bc3b-e138320321c6.png', 5, 15, 1, 'ppioT8FH1uLGQnp9zfkv'),
 ('Meeting Room 2', 'room',
  'Welcome to Meeting Room 2 at ProtectHealth, our largest meeting space designed for expansive discussions and collaborative sessions. Perfect for team meetings, client presentations, or training workshops, this room is equipped with state-of-the-art technology and comfortable seating to ensure productivity and professionalism. Book The Summit Room and elevate your meetings to new heights!',
  'https://msgsndr-private.storage.googleapis.com/calendar-widget-logo/d0f535eb-0b86-4b27-9501-fca43d0ae1be.jpg', 10, 15, 2, 'lBnXNAL6ITzFC5yM2c2m'),
 ('Workspace 3', 'workspace',
  'Welcome to Workspace 3, your private sanctuary designed for optimal productivity and focus. This intimate space is perfect for anyone needing to escape the bustle and concentrate on work, make confidential calls, or simply require a quiet spot for deep thinking. Equipped with high-speed internet, ergonomic furniture, and a serene setting, Workspace 3 ensures you can work efficiently and comfortably. Whether you’re drafting proposals, conducting virtual meetings, or catching up on emails, this space is tailored to meet all your professional needs in a distraction-free environment. Book Workspace 3 today and transform your workday into an experience of pure productivity.',
  'https://msgsndr-private.storage.googleapis.com/calendar-widget-logo/5ee58d6e-a81e-4765-9e97-2731b51d5b65.png', 2, 0, 3, 'uTuuvUu6twg2b9lRi269')
on conflict (ghl_calendar_id) do nothing;

-- Monday–Friday, 8:00 AM – 5:00 PM, matching the GHL calendars.
insert into public.ph_room_hours (room_id, weekday, opens, closes)
select r.id, d, '08:00', '17:00' from public.ph_rooms r cross join generate_series(1, 5) d
where r.ghl_calendar_id in ('ppioT8FH1uLGQnp9zfkv','lBnXNAL6ITzFC5yM2c2m','uTuuvUu6twg2b9lRi269')
on conflict do nothing;
