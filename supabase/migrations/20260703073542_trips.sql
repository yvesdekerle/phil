-- PHIL-B02 — Tables trips et trip_participants.
-- RLS activée mais AUCUNE policy ici : tout accès est refusé jusqu'à PHIL-B09.
-- Aucune utilisation côté front avant B09.

create type public.trip_role as enum ('OWNER', 'EDITOR', 'VIEWER');

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination text not null,
  start_date date not null,
  end_date date not null,
  cover_image_url text,
  default_timezone text not null default 'Europe/Paris',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint trips_dates_check check (end_date >= start_date)
);

comment on table public.trips is 'Voyages. Visibles uniquement des participants (policies en B09).';

create table public.trip_participants (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.trip_role not null default 'EDITOR',
  joined_at timestamptz not null default now(),
  invited_by uuid references public.profiles (id),
  primary key (trip_id, user_id)
);

comment on table public.trip_participants is 'Appartenance à un voyage avec rôle OWNER / EDITOR / VIEWER.';

-- Lister rapidement les voyages d'un user
create index trip_participants_user_id_idx on public.trip_participants (user_id);

-- RLS verrouillée par défaut (policies en PHIL-B09)
alter table public.trips enable row level security;
alter table public.trip_participants enable row level security;

-- Le créateur d'un voyage en devient automatiquement OWNER.
-- Security definer : évite le problème d'œuf-et-poule avec les policies
-- de trip_participants (on ne peut pas être participant avant d'exister).
create or replace function public.handle_new_trip()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.trip_participants (trip_id, user_id, role)
  values (new.id, new.created_by, 'OWNER');
  return new;
end;
$$;

create trigger on_trip_created
  after insert on public.trips
  for each row
  execute function public.handle_new_trip();
