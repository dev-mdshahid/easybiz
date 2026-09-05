create or replace function public.commit_expected_order_intake(
  p_business_id bigint,
  p_intake_id bigint,
  p_model text,
  p_raw jsonb,
  p_orders jsonb
)
returns setof public.expected_orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_intake_id bigint;
  v_ids bigint[];
begin
  if p_orders is null or jsonb_typeof(p_orders) <> 'array' then
    raise exception 'Orders payload must be a JSON array.';
  end if;

  update public.expected_order_intakes
  set
    model = p_model,
    raw_ai_response = p_raw,
    error_message = null
  where id = p_intake_id
    and business_id = p_business_id
  returning id into v_intake_id;

  if v_intake_id is null then
    raise exception 'That extraction batch was not found.';
  end if;

  if jsonb_array_length(p_orders) = 0 then
    return;
  end if;

  with inserted as (
    insert into public.expected_orders (
      business_id,
      intake_id,
      product_id,
      item_type,
      store_name,
      merchant_order_id,
      recipient_name,
      recipient_phone,
      recipient_address,
      recipient_address_raw,
      recipient_city,
      recipient_zone,
      recipient_area,
      amount_to_collect,
      item_quantity,
      item_weight,
      item_desc,
      special_instruction,
      status,
      warnings,
      extraction
    )
    select
      p_business_id,
      p_intake_id,
      nullif(elem->>'product_id', '')::bigint,
      coalesce(nullif(elem->>'item_type', ''), 'parcel'),
      coalesce(elem->>'store_name', ''),
      '',
      coalesce(elem->>'recipient_name', ''),
      coalesce(elem->>'recipient_phone', ''),
      coalesce(elem->>'recipient_address', ''),
      coalesce(elem->>'recipient_address_raw', ''),
      coalesce(elem->>'recipient_city', ''),
      coalesce(elem->>'recipient_zone', ''),
      coalesce(elem->>'recipient_area', ''),
      coalesce((elem->>'amount_to_collect')::numeric, 0),
      coalesce((elem->>'item_quantity')::integer, 1),
      coalesce((elem->>'item_weight')::numeric, 0.5),
      coalesce(elem->>'item_desc', ''),
      coalesce(elem->>'special_instruction', ''),
      coalesce(nullif(elem->>'status', ''), 'needs_review'),
      coalesce(elem->'warnings', '[]'::jsonb),
      elem->'extraction'
    from jsonb_array_elements(p_orders) as elem
    returning id
  )
  select coalesce(array_agg(id), '{}'::bigint[])
  into v_ids
  from inserted;

  update public.expected_orders
  set merchant_order_id = 'EB-' || id::text
  where id = any (v_ids)
    and business_id = p_business_id
    and (merchant_order_id is null or merchant_order_id = '');

  return query
  select *
  from public.expected_orders
  where id = any (v_ids)
    and business_id = p_business_id
  order by id;
end;
$$;
