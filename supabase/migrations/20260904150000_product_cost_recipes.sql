create table public.products (
  id bigint generated always as identity primary key,
  business_id bigint not null references public.businesses (id) on delete cascade,
  name text not null,
  selling_price numeric(12,2),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  constraint products_name_not_blank_chk check (length(trim(name)) > 0),
  constraint products_selling_price_nonneg_chk
    check (selling_price is null or selling_price >= 0)
);

create unique index products_one_default_per_business
  on public.products (business_id)
  where is_default;

create index products_business_id_idx on public.products (business_id);

create table public.product_cost_lines (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  slot text not null,
  label text not null,
  mode text not null,
  value numeric(12,2),
  sort_order integer not null,
  constraint product_cost_lines_slot_chk check (
    slot in ('product_cost', 'delivery', 'packaging', 'marketing', 'profit', 'custom')
  ),
  constraint product_cost_lines_mode_chk check (mode in ('fixed', 'percent')),
  constraint product_cost_lines_label_chk check (length(trim(label)) > 0),
  constraint product_cost_lines_value_chk check (
    value is null
    or (
      (mode = 'fixed' and value >= 0)
      or (mode = 'percent' and value >= 0 and value <= 100)
    )
  )
);

create unique index product_cost_lines_builtin_slot_key
  on public.product_cost_lines (product_id, slot)
  where slot <> 'custom';

create index product_cost_lines_product_id_idx
  on public.product_cost_lines (product_id, sort_order);

alter table public.products enable row level security;
alter table public.product_cost_lines enable row level security;

revoke all on table public.products from anon, authenticated, public;
revoke all on table public.product_cost_lines from anon, authenticated, public;
revoke all on sequence public.products_id_seq from anon, authenticated, public;
revoke all on sequence public.product_cost_lines_id_seq from anon, authenticated, public;
grant all on table public.products to service_role;
grant all on table public.product_cost_lines to service_role;
grant usage, select on sequence public.products_id_seq to service_role;
grant usage, select on sequence public.product_cost_lines_id_seq to service_role;

insert into public.products (business_id, name, is_default)
select b.id, 'Standard order', true
from public.businesses b
where not exists (
  select 1 from public.products p where p.business_id = b.id
);

insert into public.product_cost_lines (product_id, slot, label, mode, value, sort_order)
select
  p.id,
  v.slot,
  v.label,
  'percent',
  case
    when v.slot = 'product_cost' then (
      select round(b.inventory_cost_ratio * 100, 2)
      from public.businesses b
      where b.id = p.business_id
        and b.inventory_cost_ratio is not null
    )
    else null
  end,
  v.sort_order
from public.products p
cross join (
  values
    ('product_cost', 'Product cost', 10),
    ('delivery', 'Delivery', 20),
    ('packaging', 'Packaging', 30),
    ('marketing', 'Marketing', 40),
    ('profit', 'Profit', 50)
) as v(slot, label, sort_order)
where not exists (
  select 1 from public.product_cost_lines l where l.product_id = p.id
);

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
