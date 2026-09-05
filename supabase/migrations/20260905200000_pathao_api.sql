alter table public.business_settings
  add column if not exists pathao_environment text not null default 'production',
  add column if not exists pathao_client_id text not null default '',
  add column if not exists pathao_client_secret text not null default '',
  add column if not exists pathao_username text not null default '',
  add column if not exists pathao_password text not null default '',
  add column if not exists pathao_access_token text not null default '',
  add column if not exists pathao_refresh_token text not null default '',
  add column if not exists pathao_token_expires_at timestamptz,
  add column if not exists pathao_store_id bigint,
  add column if not exists pathao_store_name text not null default '',
  add column if not exists pathao_delivery_type integer not null default 48,
  add column if not exists pathao_connected_at timestamptz;

alter table public.business_settings
  drop constraint if exists business_settings_pathao_environment_chk,
  drop constraint if exists business_settings_pathao_delivery_type_chk;

alter table public.business_settings
  add constraint business_settings_pathao_environment_chk
    check (pathao_environment in ('sandbox', 'production')),
  add constraint business_settings_pathao_delivery_type_chk
    check (pathao_delivery_type in (12, 48));

alter table public.expected_orders
  add column if not exists recipient_address_raw text not null default '',
  add column if not exists pathao_consignment_id text not null default '',
  add column if not exists pathao_delivery_fee numeric(12, 2),
  add column if not exists pathao_submitted_at timestamptz,
  add column if not exists pathao_error text not null default '';

update public.expected_orders
set recipient_address_raw = recipient_address
where recipient_address_raw = ''
  and recipient_address <> '';

alter table public.expected_orders
  drop constraint if exists expected_orders_status_chk;

alter table public.expected_orders
  add constraint expected_orders_status_chk
    check (
      status in (
        'needs_review',
        'ready',
        'exported',
        'created',
        'failed',
        'discarded'
      )
    );

create unique index if not exists expected_orders_pathao_consignment_idx
  on public.expected_orders (business_id, pathao_consignment_id)
  where pathao_consignment_id <> '';
