-- PHIL-B04 — Table document_shares : partage explicite d'un document du coffre
-- (scope=VAULT) vers un voyage. RLS activée sans policies jusqu'à PHIL-B10.

create table public.document_shares (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  shared_at timestamptz not null default now(),
  shared_by uuid not null references public.profiles (id),
  constraint document_shares_unique unique (document_id, trip_id)
);

comment on table public.document_shares is 'Partage explicite d''un document du coffre vers un voyage. Retirer la ligne retire l''accès.';

create index document_shares_trip_id_idx on public.document_shares (trip_id);

alter table public.document_shares enable row level security;
