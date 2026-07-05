-- PHIL-Q49 — `default null` sur les paramètres optionnels (événement lié, date
-- de dépense) : la génération de types Supabase les rend alors optionnels,
-- ce qui évite un cast côté TypeScript pour les règlements (sans événement/date).

create or replace function public.create_expense_with_beneficiaries(
  p_trip_id uuid,
  p_title text,
  p_amount numeric,
  p_currency text,
  p_paid_by uuid,
  p_category text,
  p_beneficiaries jsonb,
  p_event_id uuid default null,
  p_spent_on date default null,
  p_split_mode text default 'equal',
  p_is_settlement boolean default false
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

-- L'ancienne signature (tous paramètres positionnels) est remplacée.
drop function if exists public.create_expense_with_beneficiaries(
  uuid, text, numeric, text, uuid, text, uuid, date, text, boolean, jsonb
);

grant execute on function public.create_expense_with_beneficiaries(
  uuid, text, numeric, text, uuid, text, jsonb, uuid, date, text, boolean
) to authenticated;
