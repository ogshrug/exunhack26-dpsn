alter table public.profiles add column balance numeric not null default 10000000 check (balance >= 0);

create function public.my_balance() returns numeric language sql stable security definer set search_path = public as $$
  select balance from public.profiles where id = auth.uid()
$$;
grant execute on function public.my_balance() to authenticated;

create table public.orders (
  id bigint generated always as identity primary key,
  buyer_id uuid not null references public.profiles(id),
  listing_id bigint not null references public.listings(id) on delete cascade,
  title text not null,
  method text not null check (method in ('dead_drop', 'cult_delivery')),
  address text not null,
  price numeric not null,
  fee numeric not null default 0,
  created_at timestamptz not null default now()
);
create table public.hires (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.listings(id) on delete cascade,
  client_id uuid not null references public.profiles(id),
  hitman_id uuid not null references public.profiles(id),
  hitman_title text not null,
  target_name text not null,
  last_seen text not null,
  occupation text not null,
  details text not null default '',
  images text[] not null default '{}',
  price numeric not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'completed', 'declined')),
  created_at timestamptz not null default now()
);
create table public.proofs (
  id bigint generated always as identity primary key,
  listing_id bigint not null references public.listings(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  images text[] not null,
  note text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  grade smallint check (grade between 0 and 100),
  payout numeric,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.orders enable row level security;
alter table public.hires enable row level security;
alter table public.proofs enable row level security;
create policy "orders read" on public.orders for select to authenticated using (buyer_id = auth.uid() or public.is_admin());
create policy "hires read" on public.hires for select to authenticated using (client_id = auth.uid() or hitman_id = auth.uid() or public.is_admin());
create policy "hires admin update" on public.hires for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "proofs read" on public.proofs for select to authenticated using (user_id = auth.uid() or public.is_admin());
alter publication supabase_realtime add table public.proofs, public.hires;

create function public._spend(p_amount numeric) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set balance = balance - p_amount where id = auth.uid() and balance >= p_amount;
  if not found then raise exception 'not enough bits'; end if;
end $$;
revoke all on function public._spend(numeric) from public, anon, authenticated;

create function public._credit(p_user uuid, p_amount numeric) returns void language sql security definer set search_path = public as $$
  update public.profiles set balance = balance + p_amount where id = p_user
$$;
revoke all on function public._credit(uuid, numeric) from public, anon, authenticated;

create function public.hire_hitman(p_listing bigint, p_name text, p_last_seen text, p_occupation text, p_details text, p_images text[])
returns bigint language plpgsql security definer set search_path = public as $$
declare l public.listings; hid bigint;
begin
  select * into l from public.listings where id = p_listing and category = 'hitman';
  if not found then raise exception 'no such hitman'; end if;
  if l.seller_id = auth.uid() then raise exception 'you cannot hire yourself'; end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_last_seen), '') = '' or coalesce(trim(p_occupation), '') = '' then
    raise exception 'name, last seen and occupation are required';
  end if;
  perform public._spend(l.price);
  perform public._credit(l.seller_id, l.price);
  insert into public.hires (listing_id, client_id, hitman_id, hitman_title, target_name, last_seen, occupation, details, images, price)
  values (l.id, auth.uid(), l.seller_id, l.title, trim(p_name), trim(p_last_seen), trim(p_occupation), coalesce(p_details, ''), coalesce(p_images, '{}'), l.price)
  returning id into hid;
  return hid;
end $$;

create function public.accept_contract(p_listing bigint) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.listings set status = 'claimed', claimed_by = auth.uid()
  where id = p_listing and category in ('contract', 'enslavement') and status = 'open' and seller_id <> auth.uid();
  if not found then raise exception 'this job is not available'; end if;
end $$;

create function public.submit_proof(p_listing bigint, p_images text[], p_note text) returns bigint language plpgsql security definer set search_path = public as $$
declare pid bigint;
begin
  if coalesce(array_length(p_images, 1), 0) = 0 then raise exception 'upload at least one image'; end if;
  if not exists (select 1 from public.listings where id = p_listing and claimed_by = auth.uid() and status = 'claimed') then
    raise exception 'you have not accepted this job';
  end if;
  if exists (select 1 from public.proofs where listing_id = p_listing and user_id = auth.uid() and status = 'pending') then
    raise exception 'your proof is already awaiting review';
  end if;
  insert into public.proofs (listing_id, user_id, images, note) values (p_listing, auth.uid(), p_images, coalesce(p_note, '')) returning id into pid;
  return pid;
end $$;

create function public.grade_proof(p_proof bigint, p_approve boolean, p_grade int) returns void language plpgsql security definer set search_path = public as $$
declare pr public.proofs; l public.listings; pay numeric;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select * into pr from public.proofs where id = p_proof and status = 'pending';
  if not found then raise exception 'proof already reviewed'; end if;
  select * into l from public.listings where id = pr.listing_id;
  if p_approve then
    pay := round(l.price * least(greatest(p_grade, 0), 100) / 100.0);
    perform public._credit(pr.user_id, pay);
    update public.proofs set status = 'approved', grade = p_grade, payout = pay, reviewed_at = now() where id = p_proof;
    update public.listings set status = 'completed' where id = l.id;
  else
    update public.proofs set status = 'rejected', grade = p_grade, payout = 0, reviewed_at = now() where id = p_proof;
  end if;
end $$;

create function public.buy_substance(p_listing bigint, p_method text, p_address text) returns bigint language plpgsql security definer set search_path = public as $$
declare l public.listings; f numeric; oid bigint;
begin
  select * into l from public.listings where id = p_listing and category = 'substance';
  if not found then raise exception 'no such substance'; end if;
  if p_method not in ('dead_drop', 'cult_delivery') then raise exception 'bad delivery method'; end if;
  if coalesce(trim(p_address), '') = '' then raise exception 'an address is required'; end if;
  f := case when p_method = 'cult_delivery' then 1000 else 0 end;
  perform public._spend(l.price + f);
  perform public._credit(l.seller_id, l.price);
  insert into public.orders (buyer_id, listing_id, title, method, address, price, fee)
  values (auth.uid(), l.id, l.title, p_method, trim(p_address), l.price, f) returning id into oid;
  return oid;
end $$;

grant execute on function public.hire_hitman(bigint, text, text, text, text, text[]), public.accept_contract(bigint),
  public.submit_proof(bigint, text[], text), public.grade_proof(bigint, boolean, int), public.buy_substance(bigint, text, text) to authenticated;
