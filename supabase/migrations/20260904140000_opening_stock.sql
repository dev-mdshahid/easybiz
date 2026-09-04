alter table public.businesses
  add column opening_stock numeric(12,2),
  add column opening_stock_on date,
  add column inventory_cost_ratio numeric(4,3);

alter table public.businesses
  add constraint businesses_opening_stock_pair_chk
    check (
      (opening_stock is null and opening_stock_on is null)
      or (opening_stock is not null and opening_stock_on is not null)
    ),
  add constraint businesses_opening_stock_nonneg_chk
    check (opening_stock is null or opening_stock >= 0),
  add constraint businesses_inventory_cost_ratio_chk
    check (
      inventory_cost_ratio is null
      or (inventory_cost_ratio >= 0 and inventory_cost_ratio <= 1)
    );

create table public.inventory_movements (
  id bigint generated always as identity primary key,
  business_id bigint not null references public.businesses (id) on delete cascade,
  occurred_on date not null,
  amount numeric(12,2) not null,
  kind text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint inventory_movements_kind_chk check (kind in ('purchase', 'adjustment')),
  constraint inventory_movements_amount_chk check (
    (kind = 'purchase' and amount > 0)
    or (kind = 'adjustment' and amount <> 0)
  )
);

create index inventory_movements_business_occurred_idx
  on public.inventory_movements (business_id, occurred_on);

alter table public.inventory_movements enable row level security;

revoke all on table public.inventory_movements from anon, authenticated, public;
revoke all on sequence public.inventory_movements_id_seq from anon, authenticated, public;
grant all on table public.inventory_movements to service_role;
grant usage, select on sequence public.inventory_movements_id_seq to service_role;

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
          and m.occurred_on > (select opening_stock_on from biz)
      ), 0) as purchases_since_opening,
      coalesce((
        select sum(m.amount)
        from public.inventory_movements m
        where m.business_id = p_business_id
          and m.kind = 'adjustment'
          and m.occurred_on > (select opening_stock_on from biz)
      ), 0) as adjustments_since_opening
  ),
  cogs as (
    select case
      when (select inventory_cost_ratio from biz) is null then 0::numeric(12,2)
      else round(
        (select inventory_cost_ratio from biz) * coalesce((
          select sum(i.collected_amount)
          from public.pathao_invoices_current i
          where i.business_id = p_business_id
            and i.invoice_type = 'delivery'
            and (timezone('Asia/Dhaka', i.created_at))::date
              > (select opening_stock_on from biz)
        ), 0),
        2
      )
    end as cogs_since_opening
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
      'cogs_since_opening', (select cogs_since_opening from cogs),
      'stock_on_hand', (select opening_stock from biz)
        + (select purchases_since_opening from moves)
        + (select adjustments_since_opening from moves)
        - (select cogs_since_opening from cogs)
    )
  end;
$$;

revoke all on function public.get_stock_position(bigint) from public, anon, authenticated;
grant execute on function public.get_stock_position(bigint) to service_role;
