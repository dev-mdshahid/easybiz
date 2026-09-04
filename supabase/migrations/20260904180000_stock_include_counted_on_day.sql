create or replace function public.get_stock_position(p_business_id bigint)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with biz as (
    select opening_stock, opening_stock_on, inventory_cost_ratio
    from public.businesses
    where id = p_business_id
  ),
  moves as (
    select
      coalesce((
        select sum(m.amount)
        from public.inventory_movements m
        where m.business_id = p_business_id
          and m.kind = 'purchase'
          and m.occurred_on >= (select opening_stock_on from biz)
      ), 0) as purchases_since_opening,
      coalesce((
        select sum(m.amount)
        from public.inventory_movements m
        where m.business_id = p_business_id
          and m.kind = 'adjustment'
          and m.occurred_on >= (select opening_stock_on from biz)
      ), 0) as adjustments_since_opening
  )
  select case
    when not exists (select 1 from public.businesses where id = p_business_id) then null
    when (select opening_stock from biz) is null then jsonb_build_object(
      'is_set', false,
      'opening_stock', null,
      'opening_stock_on', null,
      'inventory_cost_ratio', (select inventory_cost_ratio from biz),
      'purchases_since_opening', 0,
      'adjustments_since_opening', 0,
      'cogs_since_opening', 0,
      'stock_on_hand', null
    )
    else jsonb_build_object(
      'is_set', true,
      'opening_stock', (select opening_stock from biz),
      'opening_stock_on', (select opening_stock_on from biz),
      'inventory_cost_ratio', (select inventory_cost_ratio from biz),
      'purchases_since_opening', (select purchases_since_opening from moves),
      'adjustments_since_opening', (select adjustments_since_opening from moves),
      'cogs_since_opening', 0,
      'stock_on_hand', (select opening_stock from biz)
        + (select purchases_since_opening from moves)
        + (select adjustments_since_opening from moves)
    )
  end;
$$;

revoke all on function public.get_stock_position(bigint) from public, anon, authenticated;
grant execute on function public.get_stock_position(bigint) to service_role;
