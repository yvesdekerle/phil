-- PHIL-Q34 — Cartes santé au coffre : carte Vitale et carte européenne
-- d'assurance maladie (CEAM). Deux valeurs d'enum ajoutées (non utilisées
-- dans cette même transaction : sûr en Postgres 12+).

alter type document_category add value if not exists 'health_card';
alter type document_category add value if not exists 'european_health_card';
