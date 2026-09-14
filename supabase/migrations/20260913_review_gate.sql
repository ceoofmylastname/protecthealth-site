-- Review gate for /partners/review
-- Codes are stored hashed with a pepper held in the edge function's secrets.
-- Nothing in this table reveals a code.

create table if not exists public.ph_review_codes (
  id           uuid primary key default gen_random_uuid(),
  code_hash    text not null unique,
  label        text not null,               -- who this code belongs to, e.g. "Sean"
  active       boolean not null default true,
  expires_at   timestamptz,                 -- null = no expiry
  uses         integer not null default 0,
  last_used_at timestamptz,
  created_at   timestamptz not null default now()
);

create table if not exists public.ph_review_attempts (
  ip           text primary key,
  window_start timestamptz not null,
  count        integer not null default 0
);

-- Service role only. No anon or authenticated access to either table.
alter table public.ph_review_codes    enable row level security;
alter table public.ph_review_attempts enable row level security;
revoke all on public.ph_review_codes    from anon, authenticated;
revoke all on public.ph_review_attempts from anon, authenticated;

-- Private bucket for review creative. Signed URLs only, issued by the function.
insert into storage.buckets (id, name, public)
values ('review-assets', 'review-assets', false)
on conflict (id) do nothing;

-- Helper to insert a code without ever storing it in plain text.
-- Usage (psql, with the same pepper the function uses):
--   select public.ph_review_code_add('483920', 'Sean', 'PEPPER_VALUE', null);
create or replace function public.ph_review_code_add(
  p_code text, p_label text, p_pepper text, p_expires timestamptz default null
) returns uuid
language plpgsql security definer as $$
declare v_id uuid;
begin
  if p_code !~ '^[0-9]{6}$' then raise exception 'code must be six digits'; end if;
  insert into public.ph_review_codes (code_hash, label, expires_at)
  values (encode(digest(p_pepper || ':' || p_code, 'sha256'), 'hex'), p_label, p_expires)
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.ph_review_code_add(text, text, text, timestamptz) from public, anon, authenticated;
