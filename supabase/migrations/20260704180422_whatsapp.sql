-- PHIL-O06 — WhatsApp : contact sur le profil + lien du groupe sur le voyage.
-- profiles.whatsapp : numéro de téléphone ("+33 6…") ou @username WhatsApp.
--   Visible des co-voyageurs uniquement (policy cotravelers existante).
-- trips.whatsapp_group_url : lien d'invitation chat.whatsapp.com du groupe.

alter table public.profiles
  add column whatsapp text check (char_length(whatsapp) <= 50);

alter table public.trips
  add column whatsapp_group_url text check (
    whatsapp_group_url is null
    or whatsapp_group_url like 'https://chat.whatsapp.com/%'
  );

comment on column public.profiles.whatsapp is 'Numéro de téléphone ou @username WhatsApp (affiché aux co-voyageurs).';
comment on column public.trips.whatsapp_group_url is 'Lien d''invitation du groupe WhatsApp du voyage.';
