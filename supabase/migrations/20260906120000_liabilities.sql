create table public.liabilities (
  id bigint generated always as identity primary key,
  business_id bigint not null references public.businesses (id) on delete cascade,
  lender text not null,
  borrowed_on date not null,
  principal numeric(12,2) not null,
  channel text not null default 'cash',
  note text,
  created_at timestamptz not null default now(),
  constraint liabilities_principal_chk check (principal > 0),
  constraint liabilities_lender_chk check (
    char_length(btrim(lender)) between 1 and 80
  ),
  constraint liabilities_channel_chk check (channel = 'cash')
);

create index liabilities_business_borrowed_idx
  on public.liabilities (business_id, borrowed_on desc, id desc);

create table public.liability_repayments (
  id bigint generated always as identity primary key,
  business_id bigint not null references public.businesses (id) on delete cascade,
  liability_id bigint not null references public.liabilities (id) on delete cascade,
  repaid_on date not null,
  amount numeric(12,2) not null,
  channel text not null default 'cash',
  note text,
  created_at timestamptz not null default now(),
  constraint liability_repayments_amount_chk check (amount > 0),
  constraint liability_repayments_channel_chk check (channel = 'cash')
);

create index liability_repayments_loan_idx
  on public.liability_repayments (liability_id, repaid_on desc, id desc);

create index liability_repayments_business_repaid_idx
  on public.liability_repayments (business_id, repaid_on);

alter table public.liabilities enable row level security;
alter table public.liability_repayments enable row level security;

revoke all on table public.liabilities from anon, authenticated, public;
revoke all on table public.liability_repayments from anon, authenticated, public;
revoke all on sequence public.liabilities_id_seq from anon, authenticated, public;
revoke all on sequence public.liability_repayments_id_seq from anon, authenticated, public;

grant all on table public.liabilities to service_role;
grant all on table public.liability_repayments to service_role;
grant usage, select on sequence public.liabilities_id_seq to service_role;
grant usage, select on sequence public.liability_repayments_id_seq to service_role;

grant select, insert, update, delete on table public.liabilities to authenticated;
grant select, insert, update, delete on table public.liability_repayments to authenticated;
grant usage, select on sequence public.liabilities_id_seq to authenticated;
grant usage, select on sequence public.liability_repayments_id_seq to authenticated;

create policy liabilities_select on public.liabilities
  for select to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy liabilities_insert on public.liabilities
  for insert to authenticated
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy liabilities_update on public.liabilities
  for update to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy liabilities_delete on public.liabilities
  for delete to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

create policy liability_repayments_select on public.liability_repayments
  for select to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy liability_repayments_insert on public.liability_repayments
  for insert to authenticated
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy liability_repayments_update on public.liability_repayments
  for update to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy liability_repayments_delete on public.liability_repayments
  for delete to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

create or replace function public.enforce_liability_repayment()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business_id bigint;
  v_borrowed_on date;
  v_principal numeric(12,2);
  v_repaid numeric(12,2);
  v_id bigint;
begin
  v_id := coalesce(new.liability_id, old.liability_id);

  select business_id, borrowed_on, principal
    into v_business_id, v_borrowed_on, v_principal
  from public.liabilities
  where id = v_id
  for update;

  if not found then
    raise exception 'That loan does not exist.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if new.business_id is distinct from v_business_id then
    raise exception 'Repayment business does not match the loan.';
  end if;

  if new.repaid_on < v_borrowed_on then
    raise exception 'Repayment cannot be before the loan date.';
  end if;

  select coalesce(sum(amount), 0) into v_repaid
  from public.liability_repayments
  where liability_id = v_id
    and id is distinct from new.id;

  if v_repaid + new.amount > v_principal then
    raise exception 'Repayment exceeds remaining principal';
  end if;

  return new;
end;
$$;

create or replace function public.enforce_liability_principal()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_repaid numeric(12,2);
begin
  if tg_op = 'UPDATE' and new.principal is not distinct from old.principal then
    return new;
  end if;

  select coalesce(sum(amount), 0) into v_repaid
  from public.liability_repayments
  where liability_id = new.id;

  if v_repaid > new.principal then
    raise exception 'Principal cannot be less than already repaid.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_liability_repayment() from public, anon, authenticated;
revoke all on function public.enforce_liability_principal() from public, anon, authenticated;

create trigger liability_repayments_enforce
  before insert or update or delete on public.liability_repayments
  for each row
  execute function public.enforce_liability_repayment();

create trigger liabilities_enforce_principal
  before update of principal on public.liabilities
  for each row
  execute function public.enforce_liability_principal();

create view public.liabilities_with_balance
with (security_invoker = true) as
select
  l.id,
  l.business_id,
  l.lender,
  l.borrowed_on,
  l.principal,
  l.channel,
  l.note,
  l.created_at,
  coalesce(r.repaid, 0)::numeric(12,2) as repaid,
  (l.principal - coalesce(r.repaid, 0))::numeric(12,2) as remaining
from public.liabilities l
left join (
  select liability_id, sum(amount) as repaid
  from public.liability_repayments
  group by liability_id
) r on r.liability_id = l.id;

revoke all on table public.liabilities_with_balance from anon, authenticated, public;
grant select on table public.liabilities_with_balance to authenticated, service_role;

create or replace function public.get_cash_position(p_business_id bigint)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  perform public.assert_owns_business(p_business_id);
  return (
    with biz as (
      select opening_balance, opening_balance_on
      from public.businesses
      where id = p_business_id
    ),
    payouts as (
      select coalesce(sum(i.payout), 0) as payouts_since_opening
      from public.pathao_invoices_current i
      cross join biz
      where i.business_id = p_business_id
        and biz.opening_balance_on is not null
        and (timezone('Asia/Dhaka', i.created_at))::date + 2 > biz.opening_balance_on
    ),
    stock_bought as (
      select coalesce(sum(m.amount), 0) as stock_purchases
      from public.inventory_movements m
      cross join biz
      where m.business_id = p_business_id
        and m.kind = 'purchase'
        and biz.opening_balance_on is not null
        and m.occurred_on >= biz.opening_balance_on
    ),
    spent as (
      select coalesce(sum(e.amount), 0) as expenses
      from public.expenses e
      cross join biz
      where e.business_id = p_business_id
        and biz.opening_balance_on is not null
        and e.occurred_on >= biz.opening_balance_on
    ),
    loan_in as (
      select coalesce(sum(l.principal), 0) as loan_proceeds
      from public.liabilities l
      cross join biz
      where l.business_id = p_business_id
        and l.channel = 'cash'
        and biz.opening_balance_on is not null
        and l.borrowed_on >= biz.opening_balance_on
    ),
    loan_out as (
      select coalesce(sum(r.amount), 0) as loan_repayments
      from public.liability_repayments r
      cross join biz
      where r.business_id = p_business_id
        and r.channel = 'cash'
        and biz.opening_balance_on is not null
        and r.repaid_on >= biz.opening_balance_on
    ),
    owed as (
      select
        coalesce((
          select sum(l.principal)
          from public.liabilities l
          where l.business_id = p_business_id
        ), 0)
        - coalesce((
          select sum(r.amount)
          from public.liability_repayments r
          where r.business_id = p_business_id
        ), 0) as liabilities_outstanding
    )
    select case
      when not exists (select 1 from public.businesses where id = p_business_id) then null
      when (select opening_balance from biz) is null then jsonb_build_object(
        'is_set', false,
        'opening_balance', null,
        'opening_balance_on', null,
        'payouts_since_opening', 0,
        'stock_purchases', 0,
        'expenses', 0,
        'loan_proceeds', 0,
        'loan_repayments', 0,
        'liabilities_outstanding', (select liabilities_outstanding from owed),
        'cash_on_hand', null
      )
      else jsonb_build_object(
        'is_set', true,
        'opening_balance', (select opening_balance from biz),
        'opening_balance_on', (select opening_balance_on from biz),
        'payouts_since_opening', (select payouts_since_opening from payouts),
        'stock_purchases', (select stock_purchases from stock_bought),
        'expenses', (select expenses from spent),
        'loan_proceeds', (select loan_proceeds from loan_in),
        'loan_repayments', (select loan_repayments from loan_out),
        'liabilities_outstanding', (select liabilities_outstanding from owed),
        'cash_on_hand', (select opening_balance from biz)
          + (select payouts_since_opening from payouts)
          + (select loan_proceeds from loan_in)
          - (select stock_purchases from stock_bought)
          - (select expenses from spent)
          - (select loan_repayments from loan_out)
      )
    end
  );
end;
$$;

revoke all on function public.get_cash_position(bigint) from public, anon;
grant execute on function public.get_cash_position(bigint) to authenticated, service_role;
