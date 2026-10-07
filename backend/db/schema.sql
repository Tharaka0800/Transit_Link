-- Run once in the Supabase SQL editor before starting the incident API.
-- Re-running is safe for the table created by this file; it does not migrate
-- an unrelated existing table with a different shape.
create table if not exists public.incident_alerts (
  id uuid primary key default gen_random_uuid(),
  bus_id varchar not null check (length(btrim(bus_id)) > 0),
  route varchar not null check (length(btrim(route)) > 0),
  delay_time varchar not null check (length(btrim(delay_time)) > 0),
  status varchar not null check (status in ('URGENT', 'WARNING', 'RESOLVED')),
  created_at timestamptz not null default now()
);

create index if not exists incident_alerts_created_at_idx
  on public.incident_alerts (created_at desc, id desc);

-- Only the Node backend accesses this table with a server-side secret key.
-- The app's existing JWT authentication is enforced by Express/Socket.IO.
alter table public.incident_alerts enable row level security;
revoke all on table public.incident_alerts from anon, authenticated;
grant select, insert, update, delete on table public.incident_alerts to service_role;

-- No automatic demo seeding: a deleted final incident stays deleted.
