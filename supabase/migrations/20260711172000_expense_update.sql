-- PHIL-V07e — Modifier une dépense (« on doit pouvoir modifier une dépense
-- et la voir (répartition) »). Même cercle que la suppression : créateur,
-- payeur ou capitaine. Les règlements (is_settlement) restent non éditables.

-- 1. UPDATE sur expenses — le cercle de la suppression, et la ligne modifiée
--    doit rester dans le voyage avec un payeur participant.
create policy "expenses_update_creator_payer_owner" on public.expenses for update to authenticated
  using (
    created_by = (select auth.uid())
    or paid_by = (select auth.uid())
    or private.trip_role(trip_id, (select auth.uid())) = 'OWNER'
  )
  with check (
    private.is_trip_participant(trip_id, (select auth.uid()))
    and private.is_trip_participant(trip_id, paid_by)
  );

-- 2. Ré-écrire la répartition suppose de réinsérer les bénéficiaires : le
--    payeur et le capitaine doivent pouvoir le faire aussi (avant : créateur
--    seul, aligné maintenant sur le cercle du DELETE).
drop policy "expense_beneficiaries_insert_members" on public.expense_beneficiaries;
create policy "expense_beneficiaries_insert_members" on public.expense_beneficiaries
  for insert to authenticated
  with check (exists (
    select 1 from public.expenses e
    where e.id = expense_id
      and (e.created_by = (select auth.uid()) or e.paid_by = (select auth.uid())
           or private.trip_role(e.trip_id, (select auth.uid())) = 'OWNER')
  ));

-- 3. RPC transactionnelle (même esprit que create_expense_with_beneficiaries,
--    PHIL-Q49) : mise à jour + remplacement des bénéficiaires, tout ou rien.
--    security invoker : la RLS s'applique comme pour un UPDATE direct.
create or replace function public.update_expense_with_beneficiaries(
  p_expense_id uuid,
  p_title text,
  p_amount numeric,
  p_currency text,
  p_paid_by uuid,
  p_category text,
  p_event_id uuid,
  p_spent_on date,
  p_split_mode text,
  p_beneficiaries jsonb
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

grant execute on function public.update_expense_with_beneficiaries(
  uuid, text, numeric, text, uuid, text, uuid, date, text, jsonb
) to authenticated;
