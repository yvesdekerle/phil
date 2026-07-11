-- PHIL-V07e — `default null` sur l'événement lié (même précédent que
-- expense_rpc_nullable_params pour la RPC de création) : la génération de
-- types Supabase rend le paramètre optionnel côté TypeScript.

create or replace function public.update_expense_with_beneficiaries(
  p_expense_id uuid,
  p_title text,
  p_amount numeric,
  p_currency text,
  p_paid_by uuid,
  p_category text,
  p_spent_on date,
  p_beneficiaries jsonb,
  p_event_id uuid default null,
  p_split_mode text default 'equal'
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_ben jsonb;
begin
  -- Le DELETE d'abord : ses policies jugent la ligne AVANT modification
  -- (sinon un payeur qui se retire du rôle perdrait la main à mi-chemin).
  delete from public.expense_beneficiaries where expense_id = p_expense_id;

  update public.expenses set
    title = p_title,
    amount = p_amount,
    currency = p_currency,
    paid_by = p_paid_by,
    category = p_category,
    event_id = p_event_id,
    spent_on = p_spent_on,
    split_mode = coalesce(p_split_mode, 'equal')
  where id = p_expense_id and is_settlement = false;
  if not found then
    raise exception 'expense_not_found_or_not_allowed';
  end if;

  for v_ben in select value from jsonb_array_elements(p_beneficiaries)
  loop
    insert into public.expense_beneficiaries (expense_id, user_id, share)
    values (
      p_expense_id,
      (v_ben->>'user_id')::uuid,
      case when v_ben->>'share' is null then null else (v_ben->>'share')::numeric end
    );
  end loop;
end;
$$;

-- L'ancienne signature (tous paramètres positionnels) est remplacée.
drop function if exists public.update_expense_with_beneficiaries(
  uuid, text, numeric, text, uuid, text, uuid, date, text, jsonb
);

grant execute on function public.update_expense_with_beneficiaries(
  uuid, text, numeric, text, uuid, text, date, jsonb, uuid, text
) to authenticated;
