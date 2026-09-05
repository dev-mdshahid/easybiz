create or replace function public.commit_expected_order_intake(
  p_business_id bigint,
  p_intake_id bigint,
  p_model text,
  p_raw jsonb,
  p_orders jsonb,
  p_updates jsonb default '[]'::jsonb
)
returns setof public.expected_orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_intake_id bigint;
  v_ids bigint[] := '{}'::bigint[];
  v_inserted bigint[] := '{}'::bigint[];
  v_id bigint;
  v_update jsonb;
begin
  if p_orders is null or jsonb_typeof(p_orders) <> 'array' then
    raise exception 'Orders payload must be a JSON array.';
  end if;
  if p_updates is not null and jsonb_typeof(p_updates) <> 'array' then
    raise exception 'Updates payload must be a JSON array.';
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

  if jsonb_array_length(p_orders) > 0 then
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
        nullif(src->>'product_id', '')::bigint,
        coalesce(nullif(src->>'item_type', ''), 'parcel'),
        coalesce(src->>'store_name', ''),
        '',
        coalesce(src->>'recipient_name', ''),
        coalesce(src->>'recipient_phone', ''),
        coalesce(src->>'recipient_address', ''),
        coalesce(src->>'recipient_address_raw', ''),
        coalesce(src->>'recipient_city', ''),
        coalesce(src->>'recipient_zone', ''),
        coalesce(src->>'recipient_area', ''),
        coalesce((src->>'amount_to_collect')::numeric, 0),
        coalesce((src->>'item_quantity')::integer, 1),
        coalesce((src->>'item_weight')::numeric, 0.5),
        coalesce(src->>'item_desc', ''),
        coalesce(src->>'special_instruction', ''),
        coalesce(nullif(src->>'status', ''), 'needs_review'),
        coalesce(src->'warnings', '[]'::jsonb),
        src->'extraction'
      from jsonb_array_elements(p_orders) as src
      returning id
    )
    select coalesce(array_agg(id), '{}'::bigint[])
    into v_inserted
    from inserted;

    update public.expected_orders
    set merchant_order_id = 'EB-' || id::text
    where id = any (v_inserted)
      and business_id = p_business_id
      and (merchant_order_id is null or merchant_order_id = '');

    v_ids := v_inserted;
  end if;

  if p_updates is not null and jsonb_array_length(p_updates) > 0 then
    for v_update in select value from jsonb_array_elements(p_updates) as t(value)
    loop
      update public.expected_orders
      set
        product_id = nullif(v_update->>'product_id', '')::bigint,
        item_type = coalesce(nullif(v_update->>'item_type', ''), item_type),
        store_name = coalesce(v_update->>'store_name', store_name),
        recipient_name = coalesce(v_update->>'recipient_name', recipient_name),
        recipient_phone = coalesce(v_update->>'recipient_phone', recipient_phone),
        recipient_address = coalesce(v_update->>'recipient_address', recipient_address),
        recipient_address_raw = coalesce(v_update->>'recipient_address_raw', recipient_address_raw),
        recipient_city = coalesce(v_update->>'recipient_city', recipient_city),
        recipient_zone = coalesce(v_update->>'recipient_zone', recipient_zone),
        recipient_area = coalesce(v_update->>'recipient_area', recipient_area),
        amount_to_collect = coalesce((v_update->>'amount_to_collect')::numeric, amount_to_collect),
        item_quantity = coalesce((v_update->>'item_quantity')::integer, item_quantity),
        item_weight = coalesce((v_update->>'item_weight')::numeric, item_weight),
        item_desc = coalesce(v_update->>'item_desc', item_desc),
        special_instruction = coalesce(v_update->>'special_instruction', special_instruction),
        status = coalesce(nullif(v_update->>'status', ''), status),
        warnings = coalesce(v_update->'warnings', warnings),
        extraction = coalesce(v_update->'extraction', extraction),
        updated_at = now()
      where id = (v_update->>'id')::bigint
        and business_id = p_business_id
        and status not in ('created', 'discarded')
      returning id into v_id;

      if v_id is not null then
        v_ids := array_append(v_ids, v_id);
      end if;
    end loop;
  end if;

  if coalesce(array_length(v_ids, 1), 0) = 0 then
    return;
  end if;

  return query
  select *
  from public.expected_orders
  where id = any (v_ids)
    and business_id = p_business_id
  order by id;
end;
$$;
