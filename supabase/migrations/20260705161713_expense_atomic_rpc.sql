-- PHIL-Q49 — Écriture atomique d'une dépense + ses bénéficiaires.
-- Avant : deux INSERT séparés côté app avec un DELETE compensatoire manuel ;
-- si le compensatoire échouait, une dépense orpheline (sans bénéficiaire)
-- faussait les soldes. Une fonction plpgsql est transactionnelle par nature.
-- security invoker : la RLS s'applique comme pour un INSERT direct.

create or replace function public.create_expense_with_beneficiaries(
  p_trip_id uuid,
  p_title text,
  p_amount numeric,
  p_currency text,
  p_paid_by uuid,
  p_category text,
  p_event_id uuid,
  p_spent_on date,
  p_split_mode text,
  p_is_settlement boolean,
  p_beneficiaries jsonb
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
  v_ben jsonb;
begin
  insert into public.expenses (
    id, trip_id, title, amount, currency, paid_by, category,
    event_id, spent_on, split_mode, is_settlement, created_by
  ) values (
    v_id, p_trip_id, p_title, p_amount, p_currency, p_paid_by, p_category,
    p_event_id, p_spent_on, coalesce(p_split_mode, 'equal'),
    coalesce(p_is_settlement, false), (select auth.uid())
  );

  for v_ben in select value from jsonb_array_elements(p_beneficiaries)
  loop
    insert into public.expense_beneficiaries (expense_id, user_id, share)
    values (
      v_id,
      (v_ben->>'user_id')::uuid,
      case when v_ben->>'share' is null then null else (v_ben->>'share')::numeric end
    );
  end loop;

  return v_id;
end;
$$;

grant execute on function public.create_expense_with_beneficiaries(
  uuid, text, numeric, text, uuid, text, uuid, date, text, boolean, jsonb
) to authenticated;
