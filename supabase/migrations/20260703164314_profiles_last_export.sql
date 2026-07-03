-- PHIL-C07 — horodatage du dernier export RGPD (limite 1/24h)
alter table public.profiles add column last_export_at timestamptz;
