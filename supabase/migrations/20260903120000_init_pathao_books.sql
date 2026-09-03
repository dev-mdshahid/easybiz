-- Shazelle Pathao Books v1 schema

create table public.csv_uploads (
  id bigint generated always as identity primary key,
  filename text not null,
  file_sha256 text not null,
  row_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  error_count integer not null default 0,
  status text not null,
  error_message text,
  created_at timestamptz not null default now(),
  constraint csv_uploads_status_check check (status in ('completed', 'failed'))
);

create table public.pathao_invoices (
  id bigint generated always as identity primary key,
  consignment_id text not null,
  created_at timestamptz not null,
  invoice_type text not null,
  collected_amount numeric(12,2) not null,
  recipient_name text not null default '',
  recipient_phone text not null default '',
  collectable_amount numeric(12,2) not null,
  cod_fee numeric(12,2) not null default 0,
  delivery_fee numeric(12,2) not null default 0,
  final_fee numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  additional_charge numeric(12,2) not null default 0,
  compensation_cost numeric(12,2) not null default 0,
  promo_discount numeric(12,2) not null default 0,
  payout numeric(12,2) not null,
  merchant_order_id text not null default '',
  store_name text not null default '',
  upload_id bigint references public.csv_uploads (id) on delete set null,
  imported_at timestamptz not null default now(),
  constraint pathao_invoices_consignment_id_key unique (consignment_id),
  constraint pathao_invoices_invoice_type_check check (invoice_type in ('delivery', 'return'))
);

create index pathao_invoices_created_at_idx on public.pathao_invoices (created_at);
create index pathao_invoices_invoice_type_idx on public.pathao_invoices (invoice_type);
create index pathao_invoices_merchant_order_id_idx on public.pathao_invoices (merchant_order_id);
create index pathao_invoices_upload_id_idx on public.pathao_invoices (upload_id);
create index csv_uploads_created_at_idx on public.csv_uploads (created_at desc);

alter table public.csv_uploads enable row level security;
alter table public.pathao_invoices enable row level security;

revoke all on table public.csv_uploads from anon, authenticated, public;
revoke all on table public.pathao_invoices from anon, authenticated, public;
revoke all on sequence public.csv_uploads_id_seq from anon, authenticated, public;
revoke all on sequence public.pathao_invoices_id_seq from anon, authenticated, public;

create or replace function public.get_dashboard_stats(
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
    where (p_from is null or created_at >= p_from)
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

revoke all on function public.get_dashboard_stats(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.get_dashboard_stats(timestamptz, timestamptz) to service_role;
