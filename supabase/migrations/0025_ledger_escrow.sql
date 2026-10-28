create table public.transactions (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('opening', 'deposit', 'transfer', 'purchase', 'fee', 'escrow_hold', 'escrow_release', 'escrow_refund', 'payout', 'mint')),
  from_id uuid references public.profiles(id) on delete set null,
  to_id uuid references public.profiles(id) on delete set null,
  amount numeric not null check (amount >= 0),
  memo text not null default '',
  created_at timestamptz not null default now()
);
create index transactions_created on public.transactions (created_at desc);
alter table public.transactions enable row level security;
create policy "transactions read" on public.transactions for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid() or public.is_admin());
alter publication supabase_realtime add table public.transactions;

create function public._log(p_kind text, p_from uuid, p_to uuid, p_amount numeric, p_memo text) returns void language sql security definer set search_path = public as $$
  insert into public.transactions (kind, from_id, to_id, amount, memo) values (p_kind, p_from, p_to, p_amount, coalesce(p_memo, ''))
$$;
revoke all on function public._log(text, uuid, uuid, numeric, text) from public, anon, authenticated;

insert into public.transactions (kind, to_id, amount, memo) select 'opening', id, balance, 'Opening balance' from public.profiles where balance > 0;

alter table public.listings add column escrow numeric not null default 0;
alter table public.hires drop constraint hires_status_check;
alter table public.hires add constraint hires_status_check check (status in ('pending', 'accepted', 'completed', 'declined'));

create or replace function public.hire_hitman(p_listing bigint, p_name text, p_last_seen text, p_occupation text, p_details text, p_images text[])
returns bigint language plpgsql security definer set search_path = public as $$
declare l public.listings; hid bigint;
begin
  if not public.has_face() then raise exception 'face ID required: enroll your face to hire hitmen'; end if;
  select * into l from public.listings where id = p_listing and category = 'hitman';
  if not found then raise exception 'no such hitman'; end if;
  if l.seller_id = auth.uid() then raise exception 'you cannot hire yourself'; end if;
  if coalesce(trim(p_name), '') = '' or coalesce(trim(p_last_seen), '') = '' or coalesce(trim(p_occupation), '') = '' then
    raise exception 'name, last seen and occupation are required';
  end if;
  perform public._spend(l.price);
  insert into public.hires (listing_id, client_id, hitman_id, hitman_title, target_name, last_seen, occupation, details, images, price)
  values (l.id, auth.uid(), l.seller_id, l.title, trim(p_name), trim(p_last_seen), trim(p_occupation), coalesce(p_details, ''), coalesce(p_images, '{}'), l.price)
  returning id into hid;
  perform public._log('escrow_hold', auth.uid(), null, l.price, 'Hit reserved: ' || trim(p_name));
  return hid;
end $$;

create function public.resolve_hire(p_hire bigint, p_action text) returns void language plpgsql security definer set search_path = public as $$
declare h public.hires;
begin
  select * into h from public.hires where id = p_hire for update;
  if not found then raise exception 'no such hire'; end if;
  if h.hitman_id <> auth.uid() and not public.is_admin() then raise exception 'only the hitman or an admin can do that'; end if;
  if h.status in ('completed', 'declined') then raise exception 'this hit is already closed'; end if;
  if p_action = 'accept' then
    if h.status <> 'pending' then raise exception 'this hit was already taken'; end if;
    update public.hires set status = 'accepted' where id = h.id;
  elsif p_action = 'complete' then
    perform public._credit(h.hitman_id, h.price);
    perform public._log('escrow_release', null, h.hitman_id, h.price, 'Hit completed: ' || h.target_name);
    update public.hires set status = 'completed' where id = h.id;
  elsif p_action = 'decline' then
    perform public._credit(h.client_id, h.price);
    perform public._log('escrow_refund', null, h.client_id, h.price, 'Hit declined: ' || h.target_name);
    update public.hires set status = 'declined' where id = h.id;
  else
    raise exception 'unknown action';
  end if;
end $$;
grant execute on function public.resolve_hire(bigint, text) to authenticated;
drop policy "hires admin update" on public.hires;

create function public._escrow_listing() returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.escrow := 0;
  if auth.uid() is not null and new.category in ('contract', 'enslavement') and new.price > 0 then
    if public.is_admin() then
      new.escrow := 0;
    else
      perform public._spend(new.price);
      new.escrow := new.price;
      perform public._log('escrow_hold', new.seller_id, null, new.price, 'Reward reserved: ' || new.title);
    end if;
  end if;
  return new;
end $$;
create function public._escrow_lock() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then new.escrow := old.escrow; end if;
  return new;
end $$;
create trigger listings_escrow_lock before update on public.listings for each row execute function public._escrow_lock();
create trigger listings_escrow before insert on public.listings for each row execute function public._escrow_listing();

create function public._escrow_refund() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.escrow > 0 and old.status <> 'completed' then
    perform public._credit(old.seller_id, old.escrow);
    perform public._log('escrow_refund', null, old.seller_id, old.escrow, 'Listing removed: ' || old.title);
  end if;
  return old;
end $$;
create trigger listings_escrow_refund before delete on public.listings for each row execute function public._escrow_refund();

create or replace function public.grade_proof(p_proof bigint, p_approve boolean, p_grade int) returns void language plpgsql security definer set search_path = public as $$
declare pr public.proofs; l public.listings; base numeric; pay numeric;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select * into pr from public.proofs where id = p_proof and status = 'pending';
  if not found then raise exception 'proof already reviewed'; end if;
  select * into l from public.listings where id = pr.listing_id;
  if p_approve then
    base := case when l.escrow > 0 then l.escrow else l.price end;
    pay := round(base * least(greatest(p_grade, 0), 100) / 100.0);
    perform public._credit(pr.user_id, pay);
    if l.escrow > 0 then
      perform public._log('escrow_release', l.seller_id, pr.user_id, pay, 'Job paid: ' || l.title);
      if base - pay > 0 then
        perform public._credit(l.seller_id, base - pay);
        perform public._log('escrow_refund', null, l.seller_id, base - pay, 'Unpaid reward returned: ' || l.title);
      end if;
    else
      perform public._log('mint', null, pr.user_id, pay, 'Job paid: ' || l.title);
    end if;
    update public.proofs set status = 'approved', grade = p_grade, payout = pay, reviewed_at = now() where id = p_proof;
    update public.listings set status = 'completed' where id = l.id;
  else
    update public.proofs set status = 'rejected', grade = p_grade, payout = 0, reviewed_at = now() where id = p_proof;
  end if;
end $$;

create or replace function public.buy_cart(p_items jsonb, p_method text, p_address text) returns int language plpgsql security definer set search_path = public as $$
declare it jsonb; l public.listings; q int; f numeric; total numeric := 0; n int := 0; first boolean := true;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'your cart is empty'; end if;
  if p_method not in ('dead_drop', 'cult_delivery') then raise exception 'bad delivery method'; end if;
  if coalesce(trim(p_address), '') = '' then raise exception 'an address is required'; end if;
  f := case when p_method = 'cult_delivery' then 1000 else 0 end;
  for it in select * from jsonb_array_elements(p_items) loop
    q := (it->>'qty')::int;
    if q is null or q < 1 or q > 99 then raise exception 'bad quantity'; end if;
    select * into l from public.listings where id = (it->>'id')::bigint and category = 'substance';
    if not found then raise exception 'an item in your cart is no longer listed'; end if;
    total := total + l.price * q;
  end loop;
  perform public._spend(total + f);
  for it in select * from jsonb_array_elements(p_items) loop
    q := (it->>'qty')::int;
    select * into l from public.listings where id = (it->>'id')::bigint;
    perform public._credit(l.seller_id, l.price * q);
    perform public._log('purchase', auth.uid(), l.seller_id, l.price * q, l.title || ' × ' || q);
    insert into public.orders (buyer_id, listing_id, title, method, address, price, fee, qty)
    values (auth.uid(), l.id, l.title, p_method, trim(p_address), l.price, case when first then f else 0 end, q);
    first := false; n := n + 1;
  end loop;
  if f > 0 then perform public._log('fee', auth.uid(), null, f, 'Delivery fee'); end if;
  return n;
end $$;

create or replace function public.topup_bits(p_asset text, p_amount numeric) returns numeric language plpgsql security definer set search_path = public as $$
declare r public.rates; usd numeric; inr numeric; b numeric;
begin
  if p_asset not in ('BTC', 'BNB') then raise exception 'only Bitcoin and Binance are accepted'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'enter an amount greater than zero'; end if;
  select * into r from public.rates where id = 1;
  if r.updated_at < now() - interval '6 hours' or r.btc_usd is null or r.bnb_usd is null then
    raise exception 'exchange rate is out of date, try again in a moment';
  end if;
  usd := p_amount * case p_asset when 'BTC' then r.btc_usd else r.bnb_usd end;
  inr := usd * r.usd_inr;
  b := round(inr / r.usd_inr, 2);
  update public.profiles set balance = balance + b where id = auth.uid();
  insert into public.topups (user_id, inr, rate, bits, asset, amount) values (auth.uid(), round(inr, 2), r.usd_inr, b, p_asset, p_amount);
  perform public._log('deposit', null, auth.uid(), b, 'Deposit: ' || p_amount || ' ' || p_asset);
  return b;
end $$;

create function public.transfer_bits(p_handle text, p_amount numeric, p_memo text default '') returns numeric language plpgsql security definer set search_path = public as $$
declare t uuid; a numeric := round(p_amount, 2);
begin
  if a is null or a <= 0 then raise exception 'enter an amount greater than zero'; end if;
  select id into t from public.profiles where lower(handle) = lower(trim(p_handle));
  if t is null then raise exception 'no member called %', trim(p_handle); end if;
  if t = auth.uid() then raise exception 'you cannot send bits to yourself'; end if;
  perform public._spend(a);
  perform public._credit(t, a);
  perform public._log('transfer', auth.uid(), t, a, left(coalesce(p_memo, ''), 120));
  return a;
end $$;
grant execute on function public.transfer_bits(text, numeric, text) to authenticated;

create function public.my_escrow() returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((select sum(price) from public.hires where client_id = auth.uid() and status in ('pending', 'accepted')), 0)
       + coalesce((select sum(escrow) from public.listings where seller_id = auth.uid() and status <> 'completed'), 0)
$$;
grant execute on function public.my_escrow() to authenticated;

create function public.economy_stats() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare wallets numeric; held numeric; r jsonb;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select coalesce(sum(balance), 0) into wallets from public.profiles;
  held := coalesce((select sum(price) from public.hires where status in ('pending', 'accepted')), 0)
        + coalesce((select sum(escrow) from public.listings where status <> 'completed'), 0);
  select jsonb_build_object(
    'wallets', wallets,
    'held', held,
    'circulation', wallets + held,
    'accounts', (select count(*) from public.profiles),
    'deposited', coalesce((select sum(amount) from public.transactions where kind = 'deposit'), 0),
    'deposits', (select count(*) from public.transactions where kind = 'deposit'),
    'minted', coalesce((select sum(amount) from public.transactions where kind = 'mint'), 0),
    'fees', coalesce((select sum(amount) from public.transactions where kind = 'fee'), 0),
    'transferred', coalesce((select sum(amount) from public.transactions where kind = 'transfer'), 0),
    'transfers', (select count(*) from public.transactions where kind = 'transfer'),
    'volume_24h', coalesce((select sum(amount) from public.transactions where kind <> 'opening' and created_at > now() - interval '24 hours'), 0),
    'tx_24h', (select count(*) from public.transactions where kind <> 'opening' and created_at > now() - interval '24 hours'),
    'by_kind', coalesce((select jsonb_object_agg(kind, jsonb_build_object('amount', s, 'n', c)) from (
        select kind, sum(amount) s, count(*) c from public.transactions where kind <> 'opening' group by kind) k), '{}'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d, 'volume', v, 'deposits', dep) order by d) from (
        select g::date d,
          coalesce((select sum(amount) from public.transactions t where kind <> 'opening' and t.created_at::date = g::date), 0) v,
          coalesce((select sum(amount) from public.transactions t where kind = 'deposit' and t.created_at::date = g::date), 0) dep
        from generate_series(current_date - 13, current_date, interval '1 day') g) x), '[]'::jsonb),
    'top', coalesce((select jsonb_agg(jsonb_build_object('handle', handle, 'balance', balance) order by balance desc) from (
        select handle, balance from public.profiles order by balance desc limit 8) t), '[]'::jsonb)
  ) into r;
  return r;
end $$;
grant execute on function public.economy_stats() to authenticated;
