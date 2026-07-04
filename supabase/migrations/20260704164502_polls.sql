-- PHIL-N12 — Sondages éclair du voyage.
create table public.polls (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  question text not null,
  options text[] not null,
  closed_at timestamptz,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint polls_options_check check (array_length(options, 1) between 2 and 5)
);

create table public.poll_votes (
  poll_id uuid not null references public.polls (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  option_index integer not null,
  voted_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);

create index polls_trip_idx on public.polls (trip_id);

alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;

create policy "polls_select_members" on public.polls for select to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())));

create policy "polls_insert_members" on public.polls for insert to authenticated
  with check (
    private.is_trip_participant(trip_id, (select auth.uid()))
    and created_by = (select auth.uid())
  );

-- Clôture (update closed_at) : créateur ou OWNER
create policy "polls_update_creator_or_owner" on public.polls for update to authenticated
  using (
    created_by = (select auth.uid())
    or private.trip_role(trip_id, (select auth.uid())) = 'OWNER'
  );

create policy "polls_delete_creator_or_owner" on public.polls for delete to authenticated
  using (
    created_by = (select auth.uid())
    or private.trip_role(trip_id, (select auth.uid())) = 'OWNER'
  );

create policy "poll_votes_select_members" on public.poll_votes for select to authenticated
  using (exists (
    select 1 from public.polls p
    where p.id = poll_id
      and private.is_trip_participant(p.trip_id, (select auth.uid()))
  ));

-- Vote : pour soi, sondage ouvert uniquement ; modifiable tant que c'est ouvert
create policy "poll_votes_upsert_own_open" on public.poll_votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.polls p
      where p.id = poll_id
        and p.closed_at is null
        and private.is_trip_participant(p.trip_id, (select auth.uid()))
    )
  );

create policy "poll_votes_update_own_open" on public.poll_votes for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.polls p where p.id = poll_id and p.closed_at is null)
  );
