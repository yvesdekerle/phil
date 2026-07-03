-- PHIL-C04 — Table user_passkeys : credentials WebAuthn pour le verrou du coffre.
-- Écriture via service role uniquement (l'enregistrement est vérifié côté serveur).

create table public.user_passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  counter bigint not null default 0,
  device_name text,
  transports text[] not null default '{}',
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

comment on table public.user_passkeys is 'Credentials WebAuthn (Face ID / Touch ID) pour déverrouiller le coffre.';

create index user_passkeys_user_id_idx on public.user_passkeys (user_id);

alter table public.user_passkeys enable row level security;

-- Chacun voit et révoque ses propres passkeys ; la création passe par le
-- serveur (service role) après vérification cryptographique.
create policy "user_passkeys_select_own"
  on public.user_passkeys
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "user_passkeys_delete_own"
  on public.user_passkeys
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
