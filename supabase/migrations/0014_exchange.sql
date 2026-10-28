create table public.rates (
  id smallint primary key default 1 check (id = 1),
  usd_inr numeric not null check (usd_inr > 0),
  updated_at timestamptz not null default now()
);
insert into public.rates (usd_inr, updated_at) values (85, now() - interval '1 day');
alter table public.rates enable row level security;
create policy "rates read" on public.rates for select to authenticated using (true);

create table public.topups (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id),
  inr numeric not null,
  rate numeric not null,
  bits numeric not null,
  created_at timestamptz not null default now()
);
alter table public.topups enable row level security;
create policy "topups read own" on public.topups for select to authenticated using (user_id = auth.uid() or public.is_admin());

create function public.topup_bits(p_inr numeric) returns numeric language plpgsql security definer set search_path = public as $$
declare r public.rates; b numeric;
begin
  if p_inr is null or p_inr < 100 or p_inr > 1000000 then raise exception 'amount must be between 100 and 1,000,000 INR'; end if;
  select * into r from public.rates where id = 1;
  if r.updated_at < now() - interval '6 hours' then raise exception 'exchange rate is out of date, try again in a moment'; end if;
  b := round(p_inr / r.usd_inr, 2);
  update public.profiles set balance = balance + b where id = auth.uid();
  insert into public.topups (user_id, inr, rate, bits) values (auth.uid(), p_inr, r.usd_inr, b);
  return b;
end $$;
grant execute on function public.topup_bits(numeric) to authenticated;
