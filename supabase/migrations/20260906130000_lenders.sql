create table public.lenders (
  id bigint generated always as identity primary key,
  business_id bigint not null references public.businesses (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint lenders_name_chk check (char_length(btrim(name)) between 1 and 80)
);

create unique index lenders_business_name_idx
  on public.lenders (business_id, lower(btrim(name)));

create index lenders_business_idx
  on public.lenders (business_id, name);

insert into public.lenders (business_id, name)
select distinct on (business_id, lower(btrim(lender)))
  business_id,
  btrim(lender)
from public.liabilities
where char_length(btrim(lender)) between 1 and 80
order by business_id, lower(btrim(lender)), id;

alter table public.lenders enable row level security;

revoke all on table public.lenders from anon, authenticated, public;
revoke all on sequence public.lenders_id_seq from anon, authenticated, public;

grant all on table public.lenders to service_role;
grant usage, select on sequence public.lenders_id_seq to service_role;
grant select, insert, update, delete on table public.lenders to authenticated;
grant usage, select on sequence public.lenders_id_seq to authenticated;

create policy lenders_select on public.lenders
  for select to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy lenders_insert on public.lenders
  for insert to authenticated
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy lenders_update on public.lenders
  for update to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())))
  with check (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
create policy lenders_delete on public.lenders
  for delete to authenticated
  using (business_id in (select id from public.businesses where owner_id = (select auth.uid())));
