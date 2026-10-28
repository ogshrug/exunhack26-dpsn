create or replace view public.profile_public with (security_invoker = false) as
  select id, handle, role, (face_embedding is not null) as has_face from public.profiles;

create function public.has_face() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select face_embedding is not null from public.profiles where id = auth.uid()), false)
$$;
grant execute on function public.has_face() to authenticated;

drop policy "plots buy" on public.plots;
create policy "plots buy" on public.plots for insert to authenticated with check (owner_id = auth.uid() and public.has_face());

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
  perform public._credit(l.seller_id, l.price);
  insert into public.hires (listing_id, client_id, hitman_id, hitman_title, target_name, last_seen, occupation, details, images, price)
  values (l.id, auth.uid(), l.seller_id, l.title, trim(p_name), trim(p_last_seen), trim(p_occupation), coalesce(p_details, ''), coalesce(p_images, '{}'), l.price)
  returning id into hid;
  return hid;
end $$;

create or replace function public.accept_contract(p_listing bigint) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_face() then raise exception 'face ID required: enroll your face to accept contracts'; end if;
  update public.listings set status = 'claimed', claimed_by = auth.uid()
  where id = p_listing and category in ('contract', 'enslavement') and status = 'open' and seller_id <> auth.uid();
  if not found then raise exception 'this job is not available'; end if;
end $$;

create function public.set_password(p_user uuid, p_password text) returns void language sql security definer set search_path = public, extensions as $$
  update public.credentials set pw_hash = extensions.crypt(p_password, extensions.gen_salt('bf')) where id = p_user
$$;
revoke all on function public.set_password(uuid, text) from public, anon, authenticated;
grant execute on function public.set_password(uuid, text) to service_role;
