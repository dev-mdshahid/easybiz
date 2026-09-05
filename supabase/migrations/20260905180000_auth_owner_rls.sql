-- Per-account ownership: businesses belong to auth.users.
-- Existing rows stay owner_id null until mdshahidulridoy@gmail.com signs up.

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

alter table public.businesses
  add column if not exists owner_id uuid references auth.users (id) on delete cascade;

create index if not exists businesses_owner_id_idx on public.businesses (owner_id);

create or replace function private.claim_legacy_businesses()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is not null
     and lower(new.email) = 'mdshahidulridoy@gmail.com' then
    update public.businesses
    set owner_id = new.id
    where owner_id is null;
  end if;
  return new;
end;
$$;

revoke all on function private.claim_legacy_businesses() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_claim_businesses on auth.users;

create trigger on_auth_user_created_claim_businesses
  after insert on auth.users
  for each row
  execute function private.claim_legacy_businesses();

-- RLS: authenticated users only see and mutate their own businesses.

drop policy if exists businesses_select on public.businesses;
drop policy if exists businesses_insert on public.businesses;
drop policy if exists businesses_update on public.businesses;
drop policy if exists businesses_delete on public.businesses;

create policy businesses_select on public.businesses
  for select to authenticated
  using (owner_id = (select auth.uid()));

create policy businesses_insert on public.businesses
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy businesses_update on public.businesses
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy businesses_delete on public.businesses
  for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Child tables keyed by business_id.

drop policy if exists csv_uploads_select on public.csv_uploads;
create policy csv_uploads_select on public.csv_uploads
  for select to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy csv_uploads_insert on public.csv_uploads
  for insert to authenticated
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy csv_uploads_update on public.csv_uploads
  for update to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy csv_uploads_delete on public.csv_uploads
  for delete to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

drop policy if exists pathao_invoices_select on public.pathao_invoices;
create policy pathao_invoices_select on public.pathao_invoices
  for select to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy pathao_invoices_insert on public.pathao_invoices
  for insert to authenticated
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy pathao_invoices_update on public.pathao_invoices
  for update to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy pathao_invoices_delete on public.pathao_invoices
  for delete to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

drop policy if exists inventory_movements_select on public.inventory_movements;
create policy inventory_movements_select on public.inventory_movements
  for select to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy inventory_movements_insert on public.inventory_movements
  for insert to authenticated
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy inventory_movements_update on public.inventory_movements
  for update to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy inventory_movements_delete on public.inventory_movements
  for delete to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

drop policy if exists products_select on public.products;
create policy products_select on public.products
  for select to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy products_insert on public.products
  for insert to authenticated
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy products_update on public.products
  for update to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy products_delete on public.products
  for delete to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

drop policy if exists expenses_select on public.expenses;
create policy expenses_select on public.expenses
  for select to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy expenses_update on public.expenses
  for update to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy expenses_delete on public.expenses
  for delete to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

drop policy if exists business_settings_select on public.business_settings;
create policy business_settings_select on public.business_settings
  for select to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy business_settings_insert on public.business_settings
  for insert to authenticated
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy business_settings_update on public.business_settings
  for update to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy business_settings_delete on public.business_settings
  for delete to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

drop policy if exists expected_order_intakes_select on public.expected_order_intakes;
create policy expected_order_intakes_select on public.expected_order_intakes
  for select to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy expected_order_intakes_insert on public.expected_order_intakes
  for insert to authenticated
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy expected_order_intakes_update on public.expected_order_intakes
  for update to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy expected_order_intakes_delete on public.expected_order_intakes
  for delete to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

drop policy if exists expected_orders_select on public.expected_orders;
create policy expected_orders_select on public.expected_orders
  for select to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy expected_orders_insert on public.expected_orders
  for insert to authenticated
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy expected_orders_update on public.expected_orders
  for update to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy expected_orders_delete on public.expected_orders
  for delete to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));

drop policy if exists product_cost_lines_select on public.product_cost_lines;
create policy product_cost_lines_select on public.product_cost_lines
  for select to authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_cost_lines.product_id
        and p.business_id in (
          select b.id from public.businesses b where b.owner_id = (select auth.uid())
        )
    )
  );
create policy product_cost_lines_insert on public.product_cost_lines
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.products p
      where p.id = product_cost_lines.product_id
        and p.business_id in (
          select b.id from public.businesses b where b.owner_id = (select auth.uid())
        )
    )
  );
create policy product_cost_lines_update on public.product_cost_lines
  for update to authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_cost_lines.product_id
        and p.business_id in (
          select b.id from public.businesses b where b.owner_id = (select auth.uid())
        )
    )
  )
  with check (
    exists (
      select 1
      from public.products p
      where p.id = product_cost_lines.product_id
        and p.business_id in (
          select b.id from public.businesses b where b.owner_id = (select auth.uid())
        )
    )
  );
create policy product_cost_lines_delete on public.product_cost_lines
  for delete to authenticated
  using (
    exists (
      select 1
      from public.products p
      where p.id = product_cost_lines.product_id
        and p.business_id in (
          select b.id from public.businesses b where b.owner_id = (select auth.uid())
        )
    )
  );

grant select, insert, update, delete on table public.businesses to authenticated;
grant select, insert, update, delete on table public.csv_uploads to authenticated;
grant select, insert, update, delete on table public.pathao_invoices to authenticated;
grant select, insert, update, delete on table public.inventory_movements to authenticated;
grant select, insert, update, delete on table public.products to authenticated;
grant select, insert, update, delete on table public.product_cost_lines to authenticated;
grant select, insert, update, delete on table public.expenses to authenticated;
grant select, insert, update, delete on table public.business_settings to authenticated;
grant select, insert, update, delete on table public.expected_order_intakes to authenticated;
grant select, insert, update, delete on table public.expected_orders to authenticated;

grant select on table public.pathao_invoices_current to authenticated;

grant usage, select on sequence public.businesses_id_seq to authenticated;
grant usage, select on sequence public.csv_uploads_id_seq to authenticated;
grant usage, select on sequence public.pathao_invoices_id_seq to authenticated;
grant usage, select on sequence public.inventory_movements_id_seq to authenticated;
grant usage, select on sequence public.products_id_seq to authenticated;
grant usage, select on sequence public.product_cost_lines_id_seq to authenticated;
grant usage, select on sequence public.expenses_id_seq to authenticated;
grant usage, select on sequence public.expected_order_intakes_id_seq to authenticated;
grant usage, select on sequence public.expected_orders_id_seq to authenticated;

grant execute on function public.get_dashboard_stats(bigint, timestamptz, timestamptz) to authenticated;
grant execute on function public.get_cash_position(bigint) to authenticated;
grant execute on function public.get_stock_position(bigint) to authenticated;
grant execute on function public.delete_csv_upload(bigint, bigint) to authenticated;
grant execute on function public.commit_expected_order_intake(bigint, bigint, text, jsonb, jsonb, jsonb) to authenticated;
