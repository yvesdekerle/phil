-- PHIL-B05 — Tables trip_events et event_documents.
-- RLS activée sans policies (deny all) jusqu'à PHIL-B11.

create type public.event_type as enum ('TRANSPORT', 'LODGING', 'ACTIVITY');

create table public.trip_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  type public.event_type not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null,
  location_name text,
  location_address text,
  location_lat double precision,
  location_lng double precision,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint trip_events_dates_check check (ends_at is null or ends_at >= starts_at)
);

comment on table public.trip_events is 'Événements du calendrier voyage (transport, hébergement, activité). Horaires en UTC + timezone IANA.';

-- Requête type : événements d'un voyage triés chronologiquement
create index trip_events_trip_id_starts_at_idx on public.trip_events (trip_id, starts_at);

-- Liaison événement <-> document. La FK vers documents(id) sera ajoutée par la
-- migration PHIL-B03 (la table documents n'existe pas encore à ce stade).
create table public.event_documents (
  event_id uuid not null references public.trip_events (id) on delete cascade,
  document_id uuid not null,
  primary key (event_id, document_id)
);

alter table public.trip_events enable row level security;
alter table public.event_documents enable row level security;
