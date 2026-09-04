create table public.business_settings (
  business_id bigint primary key references public.businesses (id) on delete cascade,
  ai_api_key text not null default '',
  ai_base_url text,
  ai_model text not null default 'gpt-4o',
  default_store_name text not null default '',
  default_item_type text not null default 'parcel',
  default_item_weight numeric(6,2) not null default 0.5,
  updated_at timestamptz not null default now(),
  constraint business_settings_item_type_chk check (
    default_item_type in ('parcel', 'document')
  ),
  constraint business_settings_weight_chk check (
    default_item_weight >= 0.5 and default_item_weight <= 10
  )
);

create table public.expected_order_intakes (
  id bigint generated always as identity primary key,
  business_id bigint not null references public.businesses (id) on delete cascade,
  note text,
  image_count integer not null default 0,
  model text,
  raw_ai_response jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  constraint expected_order_intakes_image_count_chk check (image_count >= 0)
);

create table public.expected_orders (
  id bigint generated always as identity primary key,
  business_id bigint not null references public.businesses (id) on delete cascade,
  intake_id bigint references public.expected_order_intakes (id) on delete set null,
  product_id bigint references public.products (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  item_type text not null default 'parcel',
  store_name text not null default '',
  merchant_order_id text not null default '',
  recipient_name text not null default '',
  recipient_phone text not null default '',
  recipient_address text not null default '',
  recipient_city text not null default '',
  recipient_zone text not null default '',
  recipient_area text not null default '',
  amount_to_collect numeric(12,2) not null default 0,
  item_quantity integer not null default 1,
  item_weight numeric(6,2) not null default 0.5,
  item_desc text not null default '',
  special_instruction text not null default '',
  status text not null default 'needs_review',
  exported_at timestamptz,
  warnings jsonb not null default '[]'::jsonb,
  extraction jsonb,
  constraint expected_orders_item_type_chk check (
    item_type in ('parcel', 'document')
  ),
  constraint expected_orders_status_chk check (
    status in ('needs_review', 'ready', 'exported', 'discarded')
  ),
  constraint expected_orders_quantity_chk check (item_quantity >= 1),
  constraint expected_orders_amount_chk check (amount_to_collect >= 0)
);

create index expected_order_intakes_business_created_idx
  on public.expected_order_intakes (business_id, created_at desc);

create index expected_orders_business_created_idx
  on public.expected_orders (business_id, created_at desc, id desc);

create index expected_orders_business_status_idx
  on public.expected_orders (business_id, status);

create index expected_orders_business_phone_idx
  on public.expected_orders (business_id, recipient_phone);

create unique index expected_orders_merchant_order_id_idx
  on public.expected_orders (business_id, merchant_order_id)
  where merchant_order_id <> '';

alter table public.business_settings enable row level security;
alter table public.expected_order_intakes enable row level security;
alter table public.expected_orders enable row level security;

revoke all on table public.business_settings from anon, authenticated, public;
revoke all on table public.expected_order_intakes from anon, authenticated, public;
revoke all on table public.expected_orders from anon, authenticated, public;
revoke all on sequence public.expected_order_intakes_id_seq from anon, authenticated, public;
revoke all on sequence public.expected_orders_id_seq from anon, authenticated, public;

grant all on table public.business_settings to service_role;
grant all on table public.expected_order_intakes to service_role;
grant all on table public.expected_orders to service_role;
grant usage, select on sequence public.expected_order_intakes_id_seq to service_role;
grant usage, select on sequence public.expected_orders_id_seq to service_role;
