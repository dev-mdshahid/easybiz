create table public.expenses (
  id bigint generated always as identity primary key,
  business_id bigint not null references public.businesses (id) on delete cascade,
  occurred_on date not null,
  amount numeric(12,2) not null,
  category text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint expenses_amount_chk check (amount > 0),
  constraint expenses_category_chk check (
    category in (
      'packaging',
      'marketing',
      'rent',
      'salary',
      'transport',
      'utilities',
      'other'
    )
  )
);

create index expenses_business_occurred_idx
  on public.expenses (business_id, occurred_on desc, id desc);

alter table public.expenses enable row level security;

revoke all on table public.expenses from anon, authenticated, public;
revoke all on sequence public.expenses_id_seq from anon, authenticated, public;
grant all on table public.expenses to service_role;
grant usage, select on sequence public.expenses_id_seq to service_role;

create or replace function public.get_cash_position(p_business_id bigint)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
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
      'cash_on_hand', null
    )
    else jsonb_build_object(
      'is_set', true,
      'opening_balance', (select opening_balance from biz),
      'opening_balance_on', (select opening_balance_on from biz),
      'payouts_since_opening', (select payouts_since_opening from payouts),
      'stock_purchases', (select stock_purchases from stock_bought),
      'expenses', (select expenses from spent),
      'cash_on_hand', (select opening_balance from biz)
        + (select payouts_since_opening from payouts)
        - (select stock_purchases from stock_bought)
        - (select expenses from spent)
    )
  end;
$$;

revoke all on function public.get_cash_position(bigint) from public, anon, authenticated;
grant execute on function public.get_cash_position(bigint) to service_role;
