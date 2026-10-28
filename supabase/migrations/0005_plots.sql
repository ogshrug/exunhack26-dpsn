create table public.plots (
  id smallint primary key check (id between 1 and 120),
  owner_id uuid not null default auth.uid() references public.profiles(id),
  price numeric not null default 3000000000 check (price = 3000000000),
  purchased_at timestamptz not null default now()
);
alter table public.plots enable row level security;
create policy "plots read" on public.plots for select to authenticated using (true);
create policy "plots buy" on public.plots for insert to authenticated with check (owner_id = auth.uid());
create policy "plots admin delete" on public.plots for delete to authenticated using (public.is_admin());
alter publication supabase_realtime add table public.plots;
