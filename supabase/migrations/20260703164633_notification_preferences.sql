-- PHIL-K04 — préférences de notification par type d'email
alter table public.profiles
  add column notification_preferences jsonb not null
  default '{"invitations": true, "expiry_alerts": true, "event_reminders": true}'::jsonb;
