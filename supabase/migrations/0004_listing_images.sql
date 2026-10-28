alter table public.listings add column image_url text;

update public.listings set image_url = case title
  when 'Bounty: Captain Vex' then '/placeholders/bounty-1.svg'
  when 'Bounty: The Ember Witch' then '/placeholders/bounty-2.svg'
  when 'Bounty: Rook-9 (rogue NPC)' then '/placeholders/bounty-3.svg'
  when 'Bounty: Lady Neon' then '/placeholders/bounty-4.svg'
  when 'Hitman: Silent Kestrel' then '/placeholders/hitman-1.svg'
  when 'Hitman: Two-Tone Duo' then '/placeholders/hitman-2.svg'
  when 'Hitman: Gravel' then '/placeholders/hitman-3.svg'
  when 'Neon Elixir (x10)' then '/placeholders/substance-1.svg'
  when 'Ember Dust, 1 vial' then '/placeholders/substance-2.svg'
  when 'Halo Stim Pack' then '/placeholders/substance-3.svg'
  else '/placeholders/generic.svg' end
where image_url is null;

alter table public.listings alter column image_url set not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "listing images public read" on storage.objects for select
  using (bucket_id = 'listing-images');
create policy "listing images upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
