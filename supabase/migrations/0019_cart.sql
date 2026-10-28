alter table public.orders add column qty int not null default 1 check (qty between 1 and 99);

create function public.buy_cart(p_items jsonb, p_method text, p_address text) returns int language plpgsql security definer set search_path = public as $$
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
    insert into public.orders (buyer_id, listing_id, title, method, address, price, fee, qty)
    values (auth.uid(), l.id, l.title, p_method, trim(p_address), l.price, case when first then f else 0 end, q);
    first := false; n := n + 1;
  end loop;
  return n;
end $$;
grant execute on function public.buy_cart(jsonb, text, text) to authenticated;
