create function public._charge_plot() returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public._spend(new.price);
  perform public._log('purchase', new.owner_id, null, new.price, 'Sosumi property #' || new.id);
  return new;
end $$;
create trigger plots_charge before insert on public.plots for each row execute function public._charge_plot();
