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
  )
  select case
    when not exists (select 1 from public.businesses where id = p_business_id) then null
    when (select opening_balance from biz) is null then jsonb_build_object(
      'is_set', false,
      'opening_balance', null,
      'opening_balance_on', null,
      'payouts_since_opening', 0,
      'stock_purchases', 0,
      'cash_on_hand', null
    )
    else jsonb_build_object(
      'is_set', true,
      'opening_balance', (select opening_balance from biz),
      'opening_balance_on', (select opening_balance_on from biz),
      'payouts_since_opening', (select payouts_since_opening from payouts),
      'stock_purchases', (select stock_purchases from stock_bought),
      'cash_on_hand', (select opening_balance from biz)
        + (select payouts_since_opening from payouts)
        - (select stock_purchases from stock_bought)
    )
  end;
$$;

revoke all on function public.get_cash_position(bigint) from public, anon, authenticated;
grant execute on function public.get_cash_position(bigint) to service_role;
