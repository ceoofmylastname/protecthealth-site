-- Broker time off: "I'm out Thursday 1 to 4", "I don't take calls Friday lunch".
-- Applied to production Sep 9 2026; this file is the record, not the mechanism.
--
-- ph_agent_scheduling already answers "which hours do I work", as a recurring
-- weekly pattern with one window per day. It cannot answer "not THIS Thursday",
-- and turning Thursday off to protect three hours costs the broker the whole
-- day, every week. This table is the subtraction layer on top of it.
--
-- Two shapes in one table because the consumer treats them identically -- both
-- resolve to busy intervals -- and a second table would mean every reader
-- unions two queries forever.
--   kind 'once'   -> an absolute window. Vacation, a dentist appointment.
--   kind 'weekly' -> a weekday plus a local wall-clock window. Standing lunch.
--
-- Weekly rules store LOCAL time, never an instant. A noon lunch break is noon
-- in March and noon in November; storing a timestamptz would drift an hour at
-- every DST boundary and nobody would know why.

create table if not exists public.ph_time_off (
  id               uuid primary key default gen_random_uuid(),
  agent_id         uuid not null references public.ph_agents(id) on delete cascade,
  kind             text not null default 'once',
  starts_at        timestamptz,
  ends_at          timestamptz,
  all_day          boolean not null default false,
  -- 0 = Sunday, matching both extract(dow) and the keys already used in
  -- ph_agent_scheduling.availability
  weekday          smallint,
  start_time       time,
  end_time         time,
  effective_from   date,
  effective_until  date,
  reason           text,
  created_at       timestamptz not null default now(),

  constraint ph_time_off_kind check (kind in ('once','weekly')),
  constraint ph_time_off_shape check (
    (kind = 'once'
       and starts_at is not null and ends_at is not null and ends_at > starts_at
       and weekday is null and start_time is null and end_time is null)
    or
    (kind = 'weekly'
       and weekday between 0 and 6
       and start_time is not null and end_time is not null and end_time > start_time
       and starts_at is null and ends_at is null)
  )
);

create index if not exists ph_time_off_agent on public.ph_time_off (agent_id, kind);
create index if not exists ph_time_off_window on public.ph_time_off (agent_id, starts_at, ends_at) where kind = 'once';

alter table public.ph_time_off enable row level security;

drop policy if exists ph_time_off_all on public.ph_time_off;
create policy ph_time_off_all on public.ph_time_off
  for all
  using  (public.ph_is_admin() or agent_id = public.ph_agent_id())
  with check (public.ph_is_admin() or agent_id = public.ph_agent_id());

-- The agent's own timezone, which is what a weekly rule's wall clock means.
create or replace function public.ph_agent_tz(p_agent uuid)
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select nullif(btrim(timezone), '') from ph_agent_scheduling where agent_id = p_agent),
    'America/Los_Angeles'
  );
$$;

-- Every busy interval a time-off rule produces inside a window, both kinds
-- expanded. One source of truth: ph-book subtracts these from open slots and
-- checks them again before writing, and the month calendar in /app asks this
-- for the visible range rather than expanding weekly rules itself.
--
-- generate_series(date, date, interval) resolves to the TIMESTAMPTZ overload,
-- which made `d` a timestamptz: `d + start_time` then produced a timestamptz so
-- AT TIME ZONE ran backwards, and extract(dow from d) read the weekday in the
-- session timezone. A Friday noon lunch came out as Thursday 8pm. Forcing the
-- bounds to ::timestamp picks the timestamp overload and ::date makes both the
-- arithmetic and the weekday unambiguous. Do not "simplify" those casts away.
create or replace function public.ph_time_off_busy(p_agent uuid, p_from timestamptz, p_to timestamptz)
returns table (busy_start timestamptz, busy_end timestamptz, reason text)
language sql
stable
security definer
set search_path to 'public'
as $$
  with tz as (select public.ph_agent_tz(p_agent) as z)
  select t.starts_at, t.ends_at, t.reason
    from ph_time_off t
   where t.agent_id = p_agent and t.kind = 'once'
     and t.ends_at > p_from and t.starts_at < p_to
  union all
  select ((g.d::date + t.start_time) at time zone tz.z),
         ((g.d::date + t.end_time)   at time zone tz.z),
         t.reason
    from ph_time_off t
    cross join tz
    cross join lateral generate_series(
      (greatest((p_from at time zone tz.z)::date - 1, coalesce(t.effective_from, '-infinity'::date)))::timestamp,
      (least(  (p_to   at time zone tz.z)::date + 1, coalesce(t.effective_until, 'infinity'::date)))::timestamp,
      interval '1 day'
    ) as g(d)
   where t.agent_id = p_agent and t.kind = 'weekly'
     and extract(dow from g.d::date) = t.weekday
     and ((g.d::date + t.end_time)   at time zone tz.z) > p_from
     and ((g.d::date + t.start_time) at time zone tz.z) < p_to;
$$;

-- A block may not be laid over a live appointment.
--
-- Enforced here rather than in the app because the app is not the only writer:
-- this holds for the dashboard, the edge function and anyone with the API key.
-- The message names the client and the time, because "conflict" tells a broker
-- nothing they can act on.
create or replace function public.ph_time_off_guard()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  z        text := public.ph_agent_tz(new.agent_id);
  win_from timestamptz;
  win_to   timestamptz;
  clash    record;
begin
  if new.kind = 'once' then
    win_from := new.starts_at;
    win_to   := new.ends_at;
  else
    -- A weekly rule is unbounded, so bound the check: from when it starts, out
    -- 90 days or to its end date.
    win_from := greatest(now(), coalesce(new.effective_from::timestamptz, now()));
    win_to   := least(now() + interval '90 days',
                      coalesce((new.effective_until + 1)::timestamptz, now() + interval '90 days'));
    if win_to <= win_from then return new; end if;
  end if;

  select a.invitee_name, a.start_at
    into clash
    from ph_appointments a
    join public.ph_time_off_busy(new.agent_id, win_from, win_to) b
      on a.start_at < b.busy_end and a.end_at > b.busy_start
   where a.agent_id = new.agent_id
     and a.status = 'booked'
     and a.start_at >= win_from
   order by a.start_at
   limit 1;

  -- The NEW row is not visible to ph_time_off_busy on INSERT, so its own
  -- intervals are checked directly rather than through the expander.
  if clash.start_at is null then
    if new.kind = 'once' then
      select a.invitee_name, a.start_at into clash
        from ph_appointments a
       where a.agent_id = new.agent_id and a.status = 'booked'
         and a.start_at < new.ends_at and a.end_at > new.starts_at
       order by a.start_at limit 1;
    else
      select a.invitee_name, a.start_at into clash
        from ph_appointments a
       where a.agent_id = new.agent_id and a.status = 'booked'
         and a.start_at >= win_from and a.start_at < win_to
         and extract(dow from (a.start_at at time zone z)) = new.weekday
         and (a.start_at at time zone z)::time < new.end_time
         and (a.end_at   at time zone z)::time > new.start_time
       order by a.start_at limit 1;
    end if;
  end if;

  if clash.start_at is not null then
    raise exception 'BLOCKED_BY_APPOINTMENT: % at %',
      coalesce(clash.invitee_name, 'a client'),
      to_char(clash.start_at at time zone z, 'FMDay FMMon FMDD at FMHH12:MI AM')
      using errcode = 'check_violation';
  end if;

  return new;
end $$;

drop trigger if exists ph_time_off_guard_trg on public.ph_time_off;
create trigger ph_time_off_guard_trg
  before insert or update on public.ph_time_off
  for each row execute function public.ph_time_off_guard();

-- ph-book sends 'reschedule' and 'cancellation' directly and checks the pause
-- itself, so this is here so a future queued path cannot get it wrong.
create or replace function public.ph_email_kind_is_client_facing(p_kind text)
returns boolean
language sql
immutable
as $$
  select p_kind in ('confirmation','reminder_24h','reminder_1h','reminder_10m','review_request','welcome','reschedule','cancellation');
$$;
