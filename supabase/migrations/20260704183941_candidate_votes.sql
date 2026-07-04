-- PHIL-L02 — Avis qualitatifs pondérés sur les hébergements candidats.
-- Inspiré des colonnes "Vaut le coup ?" du spreadsheet Islande :
--   +2 "Vaut le coup" · +1 "Optionnel" · -1 "Plutôt non"
-- + commentaire libre optionnel. Un avis par personne et par candidat,
-- modifiable. Score du candidat = somme des avis.

create or replace function private.candidate_trip_id(candidate uuid)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select trip_id from public.lodging_candidates where id = candidate;
$$;

create table public.candidate_votes (
  candidate_id uuid not null references public.lodging_candidates (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating in (-1, 1, 2)),
  comment text check (comment is null or char_length(comment) <= 300),
  updated_at timestamptz not null default now(),
  primary key (candidate_id, user_id)
);

comment on table public.candidate_votes is 'Avis pondérés (+2/+1/-1) et commentaires sur les hébergements candidats.';

alter table public.candidate_votes enable row level security;

-- Lecture : l'équipage du voyage du candidat
create policy "candidate_votes_select_members"
  on public.candidate_votes for select to authenticated
  using (
    private.is_trip_participant(private.candidate_trip_id(candidate_id), (select auth.uid()))
  );

-- Vote : un membre, en son nom
create policy "candidate_votes_insert_members"
  on public.candidate_votes for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.is_trip_participant(private.candidate_trip_id(candidate_id), (select auth.uid()))
  );

-- Modification / retrait : son propre avis uniquement
create policy "candidate_votes_update_own"
  on public.candidate_votes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "candidate_votes_delete_own"
  on public.candidate_votes for delete to authenticated
  using (user_id = (select auth.uid()));
