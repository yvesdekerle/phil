-- PHIL-B01 — Table profiles : extension de auth.users avec les préférences.
-- RLS : un user ne voit et ne modifie que son propre profil.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  locale text not null default 'fr',
  timezone text not null default 'Europe/Paris',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Préférences et identité affichée des utilisateurs (étend auth.users).';

-- RLS
alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Pas de policy INSERT/DELETE : la création passe par le trigger (security definer),
-- la suppression suit auth.users (on delete cascade).

-- updated_at automatique
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, locale, timezone)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name'
    ),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    coalesce(new.raw_user_meta_data ->> 'locale', 'fr'),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'Europe/Paris')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill des utilisateurs existants (préférences posées par PHIL-C03 dans user_metadata)
insert into public.profiles (id, display_name, avatar_url, locale, timezone)
select
  id,
  coalesce(
    raw_user_meta_data ->> 'display_name',
    raw_user_meta_data ->> 'full_name',
    raw_user_meta_data ->> 'name'
  ),
  coalesce(raw_user_meta_data ->> 'avatar_url', raw_user_meta_data ->> 'picture'),
  coalesce(raw_user_meta_data ->> 'locale', 'fr'),
  coalesce(raw_user_meta_data ->> 'timezone', 'Europe/Paris')
from auth.users
on conflict (id) do nothing;
