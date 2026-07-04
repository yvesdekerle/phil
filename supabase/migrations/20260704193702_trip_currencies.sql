-- PHIL-P01 — Devises du voyage : principale (affichée en gros) et
-- secondaire (affichée en petit dessous). Les montants restent stockés dans
-- leur devise d'origine ; la conversion se fait à l'affichage (open.er-api.com,
-- taux quotidiens, gratuit sans clé).

alter table public.trips
  add column currency_primary text not null default 'EUR'
    check (char_length(currency_primary) = 3),
  add column currency_secondary text
    check (currency_secondary is null or char_length(currency_secondary) = 3);

comment on column public.trips.currency_primary is 'Devise principale du budget (ISO 4217).';
comment on column public.trips.currency_secondary is 'Devise secondaire affichée en dessous (optionnelle).';
