alter table public.rates add column btc_usd numeric, add column bnb_usd numeric;
alter table public.topups add column asset text, add column amount numeric;

drop function public.topup_bits(numeric);
create function public.topup_bits(p_asset text, p_amount numeric) returns numeric language plpgsql security definer set search_path = public as $$
declare r public.rates; usd numeric; inr numeric; b numeric;
begin
  if p_asset not in ('BTC', 'BNB') then raise exception 'only Bitcoin and Binance are accepted'; end if;
  select * into r from public.rates where id = 1;
  if r.updated_at < now() - interval '6 hours' or r.btc_usd is null or r.bnb_usd is null then
    raise exception 'exchange rate is out of date, try again in a moment';
  end if;
  usd := p_amount * case p_asset when 'BTC' then r.btc_usd else r.bnb_usd end;
  if p_amount is null or usd < 1 or usd > 100000 then raise exception 'amount must be worth between 1 and 100,000 USD'; end if;
  inr := usd * r.usd_inr;
  b := round(inr / r.usd_inr, 2);
  update public.profiles set balance = balance + b where id = auth.uid();
  insert into public.topups (user_id, inr, rate, bits, asset, amount) values (auth.uid(), round(inr, 2), r.usd_inr, b, p_asset, p_amount);
  return b;
end $$;
grant execute on function public.topup_bits(text, numeric) to authenticated;
