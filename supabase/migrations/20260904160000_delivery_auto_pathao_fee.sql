alter table public.product_cost_lines
  add column source text not null default 'manual';

alter table public.product_cost_lines
  add constraint product_cost_lines_source_chk
    check (source in ('manual', 'auto'));

alter table public.product_cost_lines
  add constraint product_cost_lines_auto_delivery_chk
    check (source <> 'auto' or slot = 'delivery');

alter table public.product_cost_lines
  add constraint product_cost_lines_auto_value_chk
    check (source <> 'auto' or value is null);
