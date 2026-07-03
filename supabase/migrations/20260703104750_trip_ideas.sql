-- PHIL-B06 — Tables trip_ideas et idea_votes, avec leurs policies RLS
-- (différées depuis B11 pour trip_ideas ; idea_votes découvert pour H03).

create type public.idea_status as enum ('POOL', 'SCHEDULED', 'DISMISSED');

create table public.trip_ideas (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null,
  description text,
  external_url text,
  location_name text,
  location_lat double precision,
  location_lng double precision,
  estimated_duration_minutes integer,
  estimated_cost numeric(12, 2),
  cost_currency text,
  tags text[] not null default '{}',
  status public.idea_status not null default 'POOL',
  scheduled_event_id uuid references public.trip_events (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

comment on table public.trip_ideas is 'Pool d''idées d''activités par voyage, convertibles en événements (H04).';

create index trip_ideas_trip_id_status_idx on public.trip_ideas (trip_id, status);

-- Une voix par participant et par idée (H03)
create table public.idea_votes (
  idea_id uuid not null references public.trip_ideas (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

create or replace function private.idea_trip_id(p_idea_id uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select trip_id from public.trip_ideas where id = p_idea_id;
$$;

grant execute on function private.idea_trip_id(uuid) to authenticated;

alter table public.trip_ideas enable row level security;
alter table public.idea_votes enable row level security;

-- ============ trip_ideas (policies B11) ============

create policy "trip_ideas_select_participant"
  on public.trip_ideas
  for select
  to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())));

create policy "trip_ideas_insert_owner_editor"
  on public.trip_ideas
  for insert
  to authenticated
  with check (
    private.trip_role(trip_id, (select auth.uid())) in ('OWNER', 'EDITOR')
    and created_by = (select auth.uid())
  );

create policy "trip_ideas_update_owner_editor"
  on public.trip_ideas
  for update
  to authenticated
  using (private.trip_role(trip_id, (select auth.uid())) in ('OWNER', 'EDITOR'))
  with check (private.trip_role(trip_id, (select auth.uid())) in ('OWNER', 'EDITOR'));

create policy "trip_ideas_delete_owner_or_creator"
  on public.trip_ideas
  for delete
  to authenticated
  using (
    private.trip_role(trip_id, (select auth.uid())) = 'OWNER'
    or created_by = (select auth.uid())
  );

-- ============ idea_votes ============
-- Tout participant vote (VIEWER compris) : c'est l'outil de décision du groupe.

create policy "idea_votes_select_participant"
  on public.idea_votes
  for select
  to authenticated
  using (private.is_trip_participant(private.idea_trip_id(idea_id), (select auth.uid())));

create policy "idea_votes_insert_own"
  on public.idea_votes
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and private.is_trip_participant(private.idea_trip_id(idea_id), (select auth.uid()))
  );

create policy "idea_votes_delete_own"
  on public.idea_votes
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
