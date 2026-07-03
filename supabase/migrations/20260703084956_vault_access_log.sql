-- PHIL-B07 — Table d'audit des accès au coffre.
-- Écriture : service role uniquement (aucune policy INSERT pour authenticated).
-- Lecture : propriétaire du document (page E08). Jamais de modification.

create type public.vault_action as enum (
  'UPLOAD',
  'VIEW',
  'DOWNLOAD',
  'UPDATE',
  'DELETE',
  'SHARE',
  'UNSHARE'
);

create table public.vault_access_log (
  id uuid primary key default gen_random_uuid(),
  -- set null : l'historique d'audit survit à la suppression du document
  document_id uuid references public.documents (id) on delete set null,
  -- cascade : la purge RGPD d'un compte (C06) emporte ses traces
  accessed_by uuid not null references public.profiles (id) on delete cascade,
  document_owner_id uuid not null references public.profiles (id) on delete cascade,
  action public.vault_action not null,
  accessed_at timestamptz not null default now(),
  ip_address inet,
  user_agent text
);

comment on table public.vault_access_log is 'Audit immuable des opérations sur les documents du coffre. Écrit via service role uniquement.';
comment on column public.vault_access_log.document_owner_id is 'Dénormalisé pour que le propriétaire retrouve les accès même après suppression du document.';

create index vault_access_log_owner_idx on public.vault_access_log (document_owner_id, accessed_at desc);
create index vault_access_log_document_idx on public.vault_access_log (document_id);

alter table public.vault_access_log enable row level security;

-- Le propriétaire des documents consulte l'activité de son coffre (E08).
create policy "vault_access_log_select_owner"
  on public.vault_access_log
  for select
  to authenticated
  using (document_owner_id = (select auth.uid()));

-- Pas de policy INSERT/UPDATE/DELETE : seule la service role écrit, personne ne modifie.
