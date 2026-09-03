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
      coalesce(sum(final_fee) filter (where invoice_type = 'delivery'), 0) as pathao_cost,
      coalesce(sum(-payout) filter (where payout < 0), 0) as return_cost,
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
