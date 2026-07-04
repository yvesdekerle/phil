-- PHIL-Q23 — Le lien du groupe accepte WhatsApp OU Messenger.

alter table public.trips
  drop constraint if exists trips_whatsapp_group_url_check;

alter table public.trips
  add constraint trips_whatsapp_group_url_check check (
    whatsapp_group_url is null
    or whatsapp_group_url like 'https://chat.whatsapp.com/%'
    or whatsapp_group_url like 'https://m.me/%'
    or whatsapp_group_url like 'https://www.messenger.com/%'
    or whatsapp_group_url like 'https://messenger.com/%'
  );

comment on column public.trips.whatsapp_group_url is 'Lien du groupe de discussion (WhatsApp chat.whatsapp.com ou Messenger m.me).';
