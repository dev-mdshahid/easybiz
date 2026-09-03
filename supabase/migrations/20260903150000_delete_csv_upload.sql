-- Invoice provenance: one row per (upload, consignment). Deleting a CSV
-- drops only that file's lines; the current view falls back to the previous file.

delete from public.pathao_invoices where upload_id is null;

alter table public.pathao_invoices
  drop constraint pathao_invoices_business_consignment_key,
  drop constraint pathao_invoices_upload_id_fkey;

alter table public.pathao_invoices
  alter column upload_id set not null;

alter table public.pathao_invoices
  add constraint pathao_invoices_upload_consignment_key
    unique (upload_id, consignment_id),
  add constraint pathao_invoices_upload_id_fkey
    foreign key (upload_id) references public.csv_uploads (id) on delete cascade;

create index pathao_invoices_current_lookup_idx
  on public.pathao_invoices (business_id, consignment_id, imported_at desc, id desc);

drop index if exists public.pathao_invoices_upload_id_idx;

create or replace view public.pathao_invoices_current
with (security_invoker = true) as
select distinct on (business_id, consignment_id)
  *
from public.pathao_invoices
order by business_id, consignment_id, imported_at desc, id desc;

revoke all on table public.pathao_invoices_current from anon, authenticated, public;
grant select on table public.pathao_invoices_current to service_role;

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
    from public.pathao_invoices_current
    where business_id = p_business_id
      and (p_from is null or created_at >= p_from)
      and (p_to is null or created_at < p_to)
  ),
  agg as (
    select
      count(*) filter (where invoice_type = 'delivery') as delivery_count,
      count(*) filter (where invoice_type = 'return') as return_count,
      coalesce(sum(collected_amount) filter (where invoice_type = 'delivery'), 0) as revenue,
      coalesce(sum(final_fee) filter (where invoice_type = 'delivery'), 0) as pathao_cost,
      coalesce(sum(final_fee) filter (where invoice_type = 'return'), 0) as return_cost,
      coalesce(sum(payout), 0) as profit
    from filtered
  )
  select jsonb_build_object(
    'delivery_count', delivery_count,
    'return_count', return_count,
    'revenue', revenue,
    'pathao_cost', pathao_cost,
    'return_cost', return_cost,
    'profit', profit,
    'average_collected', case
      when delivery_count = 0 then 0
      else round(revenue / delivery_count, 2)
    end
  )
  from agg;
$$;

revoke all on function public.get_dashboard_stats(bigint, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.get_dashboard_stats(bigint, timestamptz, timestamptz) to service_role;

create or replace function public.delete_csv_upload(
  p_upload_id bigint,
  p_business_id bigint
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_filename text;
  v_removed integer := 0;
  v_reverted integer := 0;
  v_kept integer := 0;
begin
  select filename
  into v_filename
  from public.csv_uploads
  where id = p_upload_id
    and business_id = p_business_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'message', 'That upload was already deleted.'
    );
  end if;

  select
    count(*) filter (where newer_count = 0 and older_count = 0),
    count(*) filter (where newer_count = 0 and older_count > 0),
    count(*) filter (where newer_count > 0)
  into v_removed, v_reverted, v_kept
  from (
    select
      mine.consignment_id,
      count(other.id) filter (
        where other.imported_at > mine.imported_at
           or (other.imported_at = mine.imported_at and other.id > mine.id)
      ) as newer_count,
      count(other.id) filter (
        where other.imported_at < mine.imported_at
           or (other.imported_at = mine.imported_at and other.id < mine.id)
      ) as older_count
    from public.pathao_invoices as mine
    left join public.pathao_invoices as other
      on other.business_id = mine.business_id
     and other.consignment_id = mine.consignment_id
     and other.upload_id <> mine.upload_id
    where mine.upload_id = p_upload_id
    group by mine.consignment_id
  ) as outcomes;

  delete from public.csv_uploads
  where id = p_upload_id
    and business_id = p_business_id;

  return jsonb_build_object(
    'ok', true,
    'filename', v_filename,
    'removed_count', v_removed,
    'reverted_count', v_reverted,
    'kept_count', v_kept
  );
end;
$$;

revoke all on function public.delete_csv_upload(bigint, bigint) from public, anon, authenticated;
grant execute on function public.delete_csv_upload(bigint, bigint) to service_role;
