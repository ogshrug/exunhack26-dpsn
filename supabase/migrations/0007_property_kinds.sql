alter table public.plots drop constraint if exists plots_price_check;
alter table public.plots alter column price drop default;
alter table public.plots add constraint plots_price_by_kind check (
  (id between 1 and 40 and price = 3000000000) or
  (id between 41 and 80 and price = 8500000000) or
  (id between 81 and 120 and price = 1200000000)
);
