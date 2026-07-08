-- PHIL-T01 Phase 4c — Appariement d'appareils par QR (relais éphémère E2EE).
-- Le serveur ne relaie que du PUBLIC (clés éphémères ECDH) et du CHIFFRÉ (la
-- maîtresse emballée par une clé dérivée ECDH) : il ne voit jamais la maîtresse
-- en clair. Chaque appariement est strictement privé (les deux appareils sont le
-- même utilisateur authentifié) et expire vite. Le QR ne porte qu'un token.
-- Après application : `pnpm db:push` puis `pnpm db:types`, et `pnpm verify:rls`.

create table public.device_pairings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  new_public_key jsonb not null,          -- clé publique éphémère de l'appareil neuf
  configured_public_key jsonb,            -- clé publique éphémère de l'appareil configuré
  wrapped_master text,                    -- maîtresse emballée par la clé ECDH partagée (base64)
  wrap_iv text,
  status text not null default 'awaiting' check (status in ('awaiting', 'approved', 'consumed')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

create index device_pairings_user_idx on public.device_pairings (user_id);

alter table public.device_pairings enable row level security;

create policy "device_pairings_select_self" on public.device_pairings
  for select to authenticated using (user_id = (select auth.uid()));

create policy "device_pairings_insert_self" on public.device_pairings
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "device_pairings_update_self" on public.device_pairings
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "device_pairings_delete_self" on public.device_pairings
  for delete to authenticated using (user_id = (select auth.uid()));
