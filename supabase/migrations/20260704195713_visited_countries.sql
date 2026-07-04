-- PHIL-P13 — Pays visités (carte du monde de l'Explorateur).
-- Donnée strictement personnelle : chacun coche ses pays (clic sur la carte),
-- avec suggestion automatique depuis les destinations des voyages passés.
-- code = ADM0_A3 Natural Earth (proche ISO 3166-1 alpha-3).

create table public.visited_countries (
  user_id uuid not null references public.profiles (id) on delete cascade,
  country_code text not null check (char_length(country_code) = 3),
  visited_at timestamptz not null default now(),
  primary key (user_id, country_code)
);

comment on table public.visited_countries is 'Pays visités par l''utilisateur (carte Explorateur).';

alter table public.visited_countries enable row level security;

create policy "visited_countries_select_own"
  on public.visited_countries for select to authenticated
  using (user_id = (select auth.uid()));

create policy "visited_countries_insert_own"
  on public.visited_countries for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "visited_countries_delete_own"
  on public.visited_countries for delete to authenticated
  using (user_id = (select auth.uid()));
