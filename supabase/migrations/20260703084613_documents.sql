-- PHIL-B03 — Table documents (coffre personnel + documents de voyage).
-- RLS activée sans policies (deny all) jusqu'à PHIL-B10.

create type public.document_scope as enum ('VAULT', 'TRIP');

create type public.document_category as enum (
  'passport',
  'id_card',
  'driving_license',
  'ticket',
  'voucher',
  'lodging',
  'insurance',
  'other'
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  scope public.document_scope not null,
  trip_id uuid references public.trips (id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  storage_path text not null unique,
  category public.document_category not null default 'other',
  expires_at date,
  metadata jsonb not null default '{}'::jsonb,
  uploaded_at timestamptz not null default now(),
  deleted_at timestamptz,
  -- Un document TRIP appartient à un voyage ; un document VAULT n'en référence
  -- jamais directement (le partage passe par document_shares).
  constraint documents_scope_trip_check check (
    (scope = 'TRIP' and trip_id is not null)
    or (scope = 'VAULT' and trip_id is null)
  )
);

comment on table public.documents is 'Fichiers uploadés : coffre privé (VAULT) ou partagés voyage (TRIP). Soft delete via deleted_at.';

create index documents_owner_id_scope_idx on public.documents (owner_id, scope);
create index documents_trip_id_idx on public.documents (trip_id);

alter table public.documents enable row level security;

-- FK différée depuis PHIL-B05 : event_documents référence désormais documents.
alter table public.event_documents
  add constraint event_documents_document_id_fkey
  foreign key (document_id) references public.documents (id) on delete cascade;
