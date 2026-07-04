-- PHIL-N09 — Budget partagé : dépenses et bénéficiaires.
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  event_id uuid references public.trip_events (id) on delete set null,
  title text not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'EUR',
  paid_by uuid not null references public.profiles (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Bénéficiaires matérialisés à la création : les soldes restent stables
-- même si l'équipage évolue ensuite.
create table public.expense_beneficiaries (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (expense_id, user_id)
);

create index expenses_trip_idx on public.expenses (trip_id);

alter table public.expenses enable row level security;
alter table public.expense_beneficiaries enable row level security;

create policy "expenses_select_members" on public.expenses for select to authenticated
  using (private.is_trip_participant(trip_id, (select auth.uid())));

create policy "expenses_insert_members" on public.expenses for insert to authenticated
  with check (
    private.is_trip_participant(trip_id, (select auth.uid()))
    and created_by = (select auth.uid())
    and private.is_trip_participant(trip_id, paid_by)
  );

create policy "expenses_delete_creator_payer_owner" on public.expenses for delete to authenticated
  using (
    created_by = (select auth.uid())
    or paid_by = (select auth.uid())
    or private.trip_role(trip_id, (select auth.uid())) = 'OWNER'
  );

create policy "expense_beneficiaries_select_members" on public.expense_beneficiaries
  for select to authenticated
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_id
      and private.is_trip_participant(e.trip_id, (select auth.uid()))
  ));

create policy "expense_beneficiaries_insert_members" on public.expense_beneficiaries
  for insert to authenticated
  with check (exists (
    select 1 from public.expenses e
    where e.id = expense_id
      and e.created_by = (select auth.uid())
  ));

create policy "expense_beneficiaries_delete_with_expense" on public.expense_beneficiaries
  for delete to authenticated
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_id
      and (e.created_by = (select auth.uid()) or e.paid_by = (select auth.uid())
           or private.trip_role(e.trip_id, (select auth.uid())) = 'OWNER')
  ));
