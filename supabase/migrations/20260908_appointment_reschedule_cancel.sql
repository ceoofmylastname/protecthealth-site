-- Reschedule / cancel support on native appointments. Applied to production
-- Sep 8 2026; this file is the record, not the mechanism.
--
-- Cancelling is a status change, never a delete: the partial unique index
-- ph_appointments_no_double only covers status='booked', so flipping the row to
-- 'cancelled' frees the slot immediately while the history stays readable, and
-- ph-reminders (which filters on status='booked') stops reminding about it on
-- its very next sweep with no extra code.
--
-- Rescheduling moves the SAME row rather than writing a new one, so the
-- appointment keeps its id and every ph_email_log entry already pointing at it.
-- previous_start_at + reschedule_count are what let a broker see the time moved
-- rather than guessing from an email trail.

alter table public.ph_appointments
  add column if not exists cancelled_at      timestamptz,
  add column if not exists cancel_reason     text,
  add column if not exists cancelled_by      uuid references public.ph_agents(id),
  add column if not exists rescheduled_at    timestamptz,
  add column if not exists previous_start_at timestamptz,
  add column if not exists reschedule_count  integer not null default 0;

-- The queue-side classifier that decides which kinds a paused agent's clients
-- are shielded from. ph-book sends these two directly and checks the pause
-- itself, so this is here so a future queued path cannot get it wrong.
create or replace function public.ph_email_kind_is_client_facing(p_kind text)
returns boolean
language sql
immutable
as $function$
  select p_kind in ('confirmation','reminder_24h','reminder_1h','reminder_10m','review_request','welcome','reschedule','cancellation');
$function$;
