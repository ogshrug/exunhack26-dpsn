create extension if not exists pgcrypto with schema extensions;

create table public.credentials (
  id uuid primary key references public.profiles(id) on delete cascade,
  pw_hash text not null default extensions.crypt('123', extensions.gen_salt('bf'))
);
alter table public.credentials enable row level security;

insert into public.credentials (id) select id from public.profiles on conflict do nothing;

create function public.add_credentials() returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  insert into public.credentials (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger profiles_credentials after insert on public.profiles for each row execute function public.add_credentials();

create function public.check_password(p_handle text, p_password text) returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select p.id from public.profiles p join public.credentials c on c.id = p.id
  where lower(p.handle) = lower(p_handle) and c.pw_hash = extensions.crypt(p_password, c.pw_hash)
$$;
revoke all on function public.check_password(text, text) from public, anon, authenticated;
grant execute on function public.check_password(text, text) to service_role;
