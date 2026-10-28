alter table public.profiles alter column balance set default 500;
update public.profiles set balance = 500;
