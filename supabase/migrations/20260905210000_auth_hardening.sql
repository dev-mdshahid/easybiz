-- Claim only confirmed emails; restrict owner deletes; hide settings secrets;
-- RPC ownership guards; product_id must belong to the business.

create or replace function private.claim_legacy_businesses()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is null then
    return new;
  end if;
  if new.email is not null
     and lower(new.email) = 'mdshahidulridoy@gmail.com' then
    update public.businesses
    set owner_id = new.id
    where owner_id is null;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_claim_businesses on auth.users;
drop trigger if exists on_auth_user_claim_businesses on auth.users;

create trigger on_auth_user_claim_businesses
  after insert or update of email, email_confirmed_at on auth.users
  for each row
  execute function private.claim_legacy_businesses();

alter table public.businesses
  drop constraint if exists businesses_owner_id_fkey;

alter table public.businesses
  add constraint businesses_owner_id_fkey
  foreign key (owner_id) references auth.users (id) on delete restrict;

revoke select on table public.business_settings from authenticated, anon;

grant select (
  business_id,
  ai_provider,
  ai_base_url,
  ai_model,
  default_store_name,
  default_item_type,
  default_item_weight,
  screenshot_batch_size,
  pathao_environment,
  pathao_client_id,
  pathao_username,
  pathao_store_id,
  pathao_store_name,
  pathao_delivery_type,
  pathao_connected_at,
  pathao_token_expires_at,
  updated_at
) on table public.business_settings to authenticated;

create or replace function public.assert_owns_business(p_business_id bigint)
returns void
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  if current_user = 'service_role' then
    return;
  end if;
  if not exists (
    select 1
    from public.businesses
    where id = p_business_id
      and owner_id = (select auth.uid())
  ) then
    raise exception 'Not authorized';
  end if;
end;
$$;

revoke all on function public.assert_owns_business(bigint) from public, anon;
grant execute on function public.assert_owns_business(bigint) to authenticated, service_role;

create or replace function public.get_dashboard_stats(
  p_business_id bigint,
  p_from timestamp with time zone default null,
  p_to timestamp with time zone default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  perform public.assert_owns_business(p_business_id);
  return (
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
    from agg
  );
end;
$$;

create or replace function public.get_cash_position(p_business_id bigint)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  perform public.assert_owns_business(p_business_id);
  return (
    with biz as (
      select opening_balance, opening_balance_on
      from public.businesses
      where id = p_business_id
    ),
    payouts as (
      select coalesce(sum(i.payout), 0) as payouts_since_opening
      from public.pathao_invoices_current i
      cross join biz
      where i.business_id = p_business_id
        and biz.opening_balance_on is not null
        and (timezone('Asia/Dhaka', i.created_at))::date + 2 > biz.opening_balance_on
    ),
    stock_bought as (
      select coalesce(sum(m.amount), 0) as stock_purchases
      from public.inventory_movements m
      cross join biz
      where m.business_id = p_business_id
        and m.kind = 'purchase'
        and biz.opening_balance_on is not null
        and m.occurred_on >= biz.opening_balance_on
    ),
    spent as (
      select coalesce(sum(e.amount), 0) as expenses
      from public.expenses e
      cross join biz
      where e.business_id = p_business_id
        and biz.opening_balance_on is not null
        and e.occurred_on >= biz.opening_balance_on
    )
    select case
      when not exists (select 1 from public.businesses where id = p_business_id) then null
      when (select opening_balance from biz) is null then jsonb_build_object(
        'is_set', false,
        'opening_balance', null,
        'opening_balance_on', null,
        'payouts_since_opening', 0,
        'stock_purchases', 0,
        'expenses', 0,
        'cash_on_hand', null
      )
      else jsonb_build_object(
        'is_set', true,
        'opening_balance', (select opening_balance from biz),
        'opening_balance_on', (select opening_balance_on from biz),
        'payouts_since_opening', (select payouts_since_opening from payouts),
        'stock_purchases', (select stock_purchases from stock_bought),
        'expenses', (select expenses from spent),
        'cash_on_hand', (select opening_balance from biz)
          + (select payouts_since_opening from payouts)
          - (select stock_purchases from stock_bought)
          - (select expenses from spent)
      )
    end
  );
end;
$$;

create or replace function public.get_stock_position(p_business_id bigint)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
begin
  perform public.assert_owns_business(p_business_id);
  return (
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
    end
  );
end;
$$;

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
  perform public.assert_owns_business(p_business_id);

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
  perform public.assert_owns_business(p_business_id);

  if p_orders is null or jsonb_typeof(p_orders) <> 'array' then
    raise exception 'Orders payload must be a JSON array.';
  end if;
  if p_updates is not null and jsonb_typeof(p_updates) <> 'array' then
    raise exception 'Updates payload must be a JSON array.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_orders) as src
    where nullif(src->>'product_id', '') is not null
      and not exists (
        select 1
        from public.products p
        where p.id = (src->>'product_id')::bigint
          and p.business_id = p_business_id
      )
  ) then
    raise exception 'Product does not belong to this business.';
  end if;

  if p_updates is not null and exists (
    select 1
    from jsonb_array_elements(p_updates) as src
    where nullif(src->>'product_id', '') is not null
      and not exists (
        select 1
        from public.products p
        where p.id = (src->>'product_id')::bigint
          and p.business_id = p_business_id
      )
  ) then
    raise exception 'Product does not belong to this business.';
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

grant execute on function public.get_dashboard_stats(bigint, timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.get_cash_position(bigint) to authenticated, service_role;
grant execute on function public.get_stock_position(bigint) to authenticated, service_role;
grant execute on function public.delete_csv_upload(bigint, bigint) to authenticated, service_role;
grant execute on function public.commit_expected_order_intake(bigint, bigint, text, jsonb, jsonb, jsonb) to authenticated, service_role;
