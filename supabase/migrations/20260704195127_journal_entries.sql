-- PHIL-P08 — Journal de bord : quelques lignes par jour et par voyageur,
-- visibles de l'équipage. Matière première du futur PDF souvenir.

create table public.journal_entries (
  trip_id uuid not null references public.trips (id) on delete cascade,
  day date not null,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  updated_at timestamptz not null default now(),
  primary key (trip_id, day, author_id)
);

comment on table public.journal_entries is 'Journal de bord du voyage (une entrée par jour et par voyageur).';

alter table public.journal_entries enable row level security;

-- Lecture : l'équipage
create policy "journal_select_members"
  on public.journal_entries for select to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())));

-- Écriture : sa propre entrée, en étant membre du voyage
create policy "journal_insert_own"
  on public.journal_entries for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and private.is_trip_participant(trip_id, (select auth.uid()))
  );

create policy "journal_update_own"
  on public.journal_entries for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy "journal_delete_own"
  on public.journal_entries for delete to authenticated
  using (author_id = (select auth.uid()));
