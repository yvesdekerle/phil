-- PHIL-U04 — Idées « façon Yallah » : swipe d'activités par voyage.
-- Après application : `pnpm db:push` puis `pnpm db:types` (régénère types/database.ts),
-- ensuite l'UI de swipe + les server actions peuvent être branchées en type-safe.
--
-- Modèle relationnel (vs Yallah/Firestore « 1 doc de votes par user ») : une ligne
-- par (activité, utilisateur) → débloque l'AGRÉGATION DE CONSENSUS que Yallah n'a
-- jamais faite (vue `activity_vote_summary` ci-dessous). Verdicts alignés sur
-- src/types/verdict.ts de Yallah : YES (oui), NO (non), MAYBE (whynot), SUPER (top).

-- Activités proposées au swipe, scopées à un voyage. Collaboratif comme les idées.
create table public.trip_activities (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  category text check (category is null or char_length(category) <= 120),
  tags text[] not null default '{}',
  location text check (location is null or char_length(location) <= 200),
  lat double precision,
  lng double precision,
  -- Prix/durée en texte libre (comme Yallah : « ~25–35 €/pers », « ~3–4h »).
  price_text text check (price_text is null or char_length(price_text) <= 60),
  duration_text text check (duration_text is null or char_length(duration_text) <= 60),
  rating smallint check (rating is null or rating between 0 and 5),
  photo_urls text[] not null default '{}',
  -- 'manual' (saisi par un membre) | 'seed' (généré depuis la destination, phase 2)
  source text not null default 'manual' check (source in ('manual', 'seed', 'external')),
  external_ref text,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Un vote par (activité, utilisateur) : upsert sur la contrainte unique.
create table public.activity_votes (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.trip_activities (id) on delete cascade,
  -- trip_id dénormalisé : les policies et index votes s'appuient dessus sans
  -- re-joindre trip_activities à chaque ligne (RLS s'exécute par ligne).
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  verdict text not null check (verdict in ('YES', 'NO', 'MAYBE', 'SUPER')),
  -- true si un SUPER a été rétrogradé en YES faute de quota (5 max par voyage).
  quota_hit boolean not null default false,
  created_at timestamptz not null default now(),
  unique (activity_id, user_id)
);

create index trip_activities_trip_idx on public.trip_activities (trip_id);
create index activity_votes_trip_idx on public.activity_votes (trip_id);
create index activity_votes_activity_idx on public.activity_votes (activity_id);

alter table public.trip_activities enable row level security;
alter table public.activity_votes enable row level security;

-- Activités : lues par tout participant, créées/éditées par tout participant
-- (anti-usurpation à l'insert), supprimées par le créateur ou l'OWNER.
create policy "trip_activities_select_members" on public.trip_activities for select to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())));

create policy "trip_activities_insert_members" on public.trip_activities for insert to authenticated
  with check (
    private.is_trip_participant(trip_id, (select auth.uid()))
    and created_by = (select auth.uid())
  );

create policy "trip_activities_update_members" on public.trip_activities for update to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())))
  with check (private.is_trip_participant(trip_id, (select auth.uid())));

create policy "trip_activities_delete_creator_or_owner" on public.trip_activities for delete to authenticated
  using (
    created_by = (select auth.uid())
    or private.trip_role(trip_id, (select auth.uid())) = 'OWNER'
  );

-- Votes : TOUT participant LIT tous les votes du voyage (indispensable au
-- consensus), mais chacun n'écrit QUE ses propres votes.
create policy "activity_votes_select_members" on public.activity_votes for select to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())));

create policy "activity_votes_write_own" on public.activity_votes for all to authenticated
  using (
    user_id = (select auth.uid())
    and private.is_trip_participant(trip_id, (select auth.uid()))
  )
  with check (
    user_id = (select auth.uid())
    and private.is_trip_participant(trip_id, (select auth.uid()))
  );

-- Consensus agrégé (ce que Yallah ne fait pas). `security_invoker` : la vue
-- s'exécute avec les droits de l'appelant, donc les policies SELECT de
-- activity_votes s'appliquent (un membre ne voit que les votes de ses voyages).
create view public.activity_vote_summary
with (security_invoker = true) as
select
  activity_id,
  trip_id,
  count(*) filter (where verdict = 'SUPER') as supers,
  count(*) filter (where verdict = 'YES') as likes,
  count(*) filter (where verdict = 'MAYBE') as maybes,
  count(*) filter (where verdict = 'NO') as nos,
  -- Score pondéré (SUPER = 2, YES = 1, NO = -1) façon groupVotes.ts de Yallah.
  count(*) filter (where verdict = 'SUPER') * 2
  + count(*) filter (where verdict = 'YES')
  - count(*) filter (where verdict = 'NO') as score
from public.activity_votes
group by activity_id, trip_id;

-- Temps réel (comme les autres tables collaboratives) : le deck et l'écran
-- consensus se mettent à jour quand l'équipage swipe.
alter publication supabase_realtime add table public.trip_activities;
alter publication supabase_realtime add table public.activity_votes;

-- ⚠️ Audit D16 / R18 : `trip_activities.created_by` porte de la donnée de groupe
-- → l'ajouter à la réattribution « Voyageur parti » (reassignGroupDataToGhost
-- dans lib/account/deletion.ts). Les `activity_votes` sont personnels → purgés
-- avec le compte par la cascade (comme poll_votes), rien à réattribuer.
