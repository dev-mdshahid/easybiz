alter table public.csv_uploads
  drop constraint csv_uploads_business_id_fkey,
  add constraint csv_uploads_business_id_fkey
    foreign key (business_id) references public.businesses (id) on delete cascade;

alter table public.pathao_invoices
  drop constraint pathao_invoices_business_id_fkey,
  add constraint pathao_invoices_business_id_fkey
    foreign key (business_id) references public.businesses (id) on delete cascade;
