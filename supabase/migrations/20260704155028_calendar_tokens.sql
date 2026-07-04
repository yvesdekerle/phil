-- PHIL-N02 — jeton de flux iCal par participant (URL d'abonnement agenda).
alter table public.trip_participants
  add column calendar_token uuid not null default gen_random_uuid();

create unique index trip_participants_calendar_token_idx
  on public.trip_participants (calendar_token);
