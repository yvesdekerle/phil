-- PHIL-T01 Phase 0 — Stockage des clés du coffre E2EE.
-- Le serveur ne stocke QUE : la clé publique (pour recevoir des partages), la
-- clé privée CHIFFRÉE et la clé maîtresse CHIFFRÉE (emballées par un secret
-- biométrique PRF ou un code de secours). Il ne peut jamais lire les clés en clair.
-- Après application : `pnpm db:push` puis `pnpm db:types`.

create table public.user_crypto_keys (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  public_key jsonb not null,           -- JWK ECDH P-256 publique (partage)
  wrapped_private_key text not null,   -- privée ECDH chiffrée par la maîtresse
  wrapped_private_iv text not null,
  created_at timestamptz not null default now()
);

-- Clé maîtresse emballée, une entrée par méthode de déverrouillage :
-- 'PRF' (Face ID d'un appareil) ou 'RECOVERY' (code de secours).
create table public.user_master_key_wraps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null,                 -- ex. "iPhone d'Yves", "recovery"
  method text not null check (method in ('PRF', 'RECOVERY')),
  wrapped_key text not null,           -- maîtresse emballée (base64)
  wrap_iv text not null,
  credential_id text,                  -- id de la passkey (méthode PRF)
  prf_salt text,                       -- sel PRF (base64)
  created_at timestamptz not null default now(),
  unique (user_id, label)
);

create index user_master_key_wraps_user_idx on public.user_master_key_wraps (user_id);

alter table public.user_crypto_keys enable row level security;
alter table public.user_master_key_wraps enable row level security;

-- Clé publique : lisible par soi + les co-voyageurs (pour partager) ; écrite par soi.
create policy "user_crypto_keys_select_self_or_cotraveler" on public.user_crypto_keys
  for select to authenticated
  using (user_id = (select auth.uid()) or private.shares_trip_with(user_id));

create policy "user_crypto_keys_insert_self" on public.user_crypto_keys
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "user_crypto_keys_update_self" on public.user_crypto_keys
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Enveloppes de clé maîtresse : strictement privées (personne d'autre, jamais).
create policy "user_master_key_wraps_select_self" on public.user_master_key_wraps
  for select to authenticated using (user_id = (select auth.uid()));

create policy "user_master_key_wraps_insert_self" on public.user_master_key_wraps
  for insert to authenticated with check (user_id = (select auth.uid()));

create policy "user_master_key_wraps_delete_self" on public.user_master_key_wraps
  for delete to authenticated using (user_id = (select auth.uid()));
