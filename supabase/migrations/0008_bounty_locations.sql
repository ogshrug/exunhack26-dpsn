alter table public.listings add column lat double precision, add column lng double precision;

update public.listings set lat = 28.61,  lng = 77.21   where title = 'Bounty: Captain Vex';
update public.listings set lat = 51.51,  lng = -0.13   where title = 'Bounty: The Ember Witch';
update public.listings set lat = 35.68,  lng = 139.69  where title = 'Bounty: Rook-9 (rogue NPC)';
update public.listings set lat = 40.71,  lng = -74.0   where title = 'Bounty: Lady Neon';

insert into public.listings (seller_id, category, title, description, price, game, target_character, status, image_url, lat, lng)
select p.id, 'bounty', v.title, v.description, v.price, v.game, v.target, v.status, v.img, v.lat, v.lng
from (select id from public.profiles order by created_at limit 1) p,
(values
  ('Bounty: Glitch Sparrow', 'Courier that keeps phasing through walls. Capture intact.',  3800, 'Neon Drift',     'Glitch Sparrow', 'open',   '/placeholders/bounty-1.svg', 19.08,  72.88),
  ('Bounty: Nova Reeve',     'Bounty hunter turned target. Armed and unpredictable.',      7400, 'Iron Halo',      'Nova Reeve',     'open',   '/placeholders/bounty-3.svg', 52.52,  13.40),
  ('Bounty: Static Monk',    'Silent healer with a very loud reputation.',                 2100, 'Ember Vale',     'Static Monk',    'claimed','/placeholders/bounty-2.svg', -33.87, 151.21),
  ('Bounty: Vault Jackal',   'Looted a guild vault and logged out. Find him.',             5200, 'Skyline Online', 'Vault Jackal',   'open',   '/placeholders/bounty-4.svg', 30.04,  31.24),
  ('Bounty: Pale Courier',   'Delivers the wrong parcels to the right people.',            1650, 'Carpet City',    'Pale Courier',   'open',   '/placeholders/bounty-1.svg', -23.55, -46.63),
  ('Bounty: Iron Lotus',     'Boss-class character, last seen near the harbour.',          9900, 'Iron Halo',      'Iron Lotus',     'open',   '/placeholders/bounty-3.svg', 1.35,   103.82)
) as v(title, description, price, game, target, status, img, lat, lng);

drop policy if exists "members admin read" on public.members;
create policy "members read" on public.members for select to authenticated using (true);
