-- PHIL-R19b — Anglais-first : la langue par défaut d'un nouveau profil passe de
-- 'fr' à 'en' (colonne + trigger `handle_new_user`). Aligne la base sur
-- `defaultLocale = "en"` côté app.
--
-- Les profils EXISTANTS ne sont pas touchés : chacun garde la langue déjà posée
-- (bascule possible via le sélecteur de langue). Après application :
-- `pnpm db:push` puis `pnpm db:types` (le type de `locale` reste `text`, régen
-- non strictement nécessaire mais recommandée pour rester synchro).

alter table public.profiles
  alter column locale set default 'en';

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
    coalesce(new.raw_user_meta_data ->> 'locale', 'en'),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'Europe/Paris')
  );
  return new;
end;
$$;
