create table public.businesses (
  id bigint generated always as identity primary key,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.businesses enable row level security;

revoke all on table public.businesses from anon, authenticated, public;
revoke all on sequence public.businesses_id_seq from anon, authenticated, public;

alter table public.csv_uploads add column business_id bigint;
alter table public.pathao_invoices add column business_id bigint;

do $$
declare
  bid bigint;
begin
  insert into public.businesses (name) values ('Shazelle') returning id into bid;
  update public.pathao_invoices set business_id = bid;
  update public.csv_uploads set business_id = bid;
end $$;

alter table public.csv_uploads
  alter column business_id set not null,
  add constraint csv_uploads_business_id_fkey
    foreign key (business_id) references public.businesses (id);

alter table public.pathao_invoices
  alter column business_id set not null,
  add constraint pathao_invoices_business_id_fkey
    foreign key (business_id) references public.businesses (id);

create index csv_uploads_business_id_idx on public.csv_uploads (business_id);
create index pathao_invoices_business_id_idx on public.pathao_invoices (business_id);
create index pathao_invoices_business_created_at_idx on public.pathao_invoices (business_id, created_at);

alter table public.pathao_invoices drop constraint pathao_invoices_consignment_id_key;
alter table public.pathao_invoices
  add constraint pathao_invoices_business_consignment_key unique (business_id, consignment_id);

drop function if exists public.get_dashboard_stats(timestamptz, timestamptz);

create or replace function public.get_dashboard_stats(
  p_business_id bigint,
  p_from timestamptz default null,
  p_to timestamptz default null
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with filtered as (
    select *
    from public.pathao_invoices
    where business_id = p_business_id
      and (p_from is null or created_at >= p_from)
      and (p_to is null or created_at < p_to)
  ),
  agg as (
    select
      count(*) filter (where invoice_type = 'delivery') as delivery_count,
      count(*) filter (where invoice_type = 'return') as return_count,
      coalesce(sum(collected_amount) filter (where invoice_type = 'delivery'), 0) as revenue,
      coalesce(sum(final_fee), 0) as pathao_cost,
      coalesce(sum(payout), 0) as profit,
      coalesce(sum(collectable_amount - collected_amount) filter (where collectable_amount > collected_amount), 0) as uncollected,
      coalesce(sum(-payout) filter (where payout < 0), 0) as owed_to_pathao
    from filtered
  )
  select jsonb_build_object(
    'delivery_count', delivery_count,
    'return_count', return_count,
    'revenue', revenue,
    'pathao_cost', pathao_cost,
    'profit', profit,
    'uncollected', uncollected,
    'owed_to_pathao', owed_to_pathao,
    'liabilities', uncollected + owed_to_pathao,
    'average_collected', case
      when delivery_count = 0 then 0
      else round(revenue / delivery_count, 2)
    end
  )
  from agg;
$$;

revoke all on function public.get_dashboard_stats(bigint, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.get_dashboard_stats(bigint, timestamptz, timestamptz) to service_role;
