-- ProtectHealth leads table
-- Run in the Supabase SQL editor (or via migration) before going live.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  source text not null,            -- 'ichra' | 'employers' | 'general' | 'quote'
  name text,
  business text,
  email text,
  phone text,
  interest text,
  profile text,                    -- ICHRA form: Realtor / 1099 / self-employed / owner
  structure text,                  -- ICHRA form: sole prop / LLC / S-corp
  coverage text,                   -- ICHRA form: current coverage situation
  priority text,                   -- ICHRA form: what matters most
  industry text,                   -- employers form
  employees text,                  -- employers form
  friction text,                   -- employers form
  payroll text,                    -- employers form
  notes text
);

alter table public.leads enable row level security;

-- Anonymous site visitors may INSERT leads, never read them.
create policy "anon can insert leads"
  on public.leads for insert
  to anon
  with check (true);

-- No select policy for anon: reads happen from the dashboard / service role only.
