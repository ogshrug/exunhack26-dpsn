alter table public.listings drop constraint if exists listings_category_check;
update public.listings set category = 'contract' where category = 'bounty';
update public.listings set title = regexp_replace(title, '^Bounty: ', 'Contract: ') where category = 'contract';
alter table public.listings add constraint listings_category_check
  check (category in ('contract', 'substance', 'hitman', 'enslavement'));

update public.listings set game = 'IRL' where category = 'hitman';
update public.listings set description = 'Discreet operative. Clean work, no loose ends. Based in New Delhi.' where title = 'Hitman: Silent Kestrel';
update public.listings set description = 'Two-person crew working across Asia. Flat rate per contract.' where title = 'Hitman: Two-Tone Duo';
update public.listings set description = 'Heavy-handed but reliable. Chandigarh and surrounding states.' where title = 'Hitman: Gravel';

alter table public.listings add column resale_price numeric;

insert into public.listings (seller_id, category, title, description, price, resale_price, game, target_character, status, image_url)
select p.id, 'enslavement', v.title, v.description, v.price, v.resale, v.game, v.target, v.status, v.img
from (select id from public.profiles order by created_at limit 1) p,
(values
  ('Task: Enslave Static Monk', 'Bring the healer in alive and unbroken. Resold to a Carpet City household.', 6000,  14000, 'Ember Vale',     'Static Monk', 'open',    '/placeholders/enslave-1.svg'),
  ('Task: Enslave Rook-9',      'Rogue NPC, reprogram and deliver. Buyer already waiting.',                    4200,  9800,  'Iron Halo',      'Rook-9',      'open',    '/placeholders/enslave-2.svg'),
  ('Task: Enslave Lady Neon',   'Racing champion. Capture without damaging the car model.',                    8800,  21000, 'Neon Drift',     'Lady Neon',   'claimed', '/placeholders/enslave-3.svg'),
  ('Task: Enslave Pale Courier','Courier class, fast and quiet. Any Carpet City member will pay.',             2500,  6100,  'Carpet City',    'Pale Courier','open',    '/placeholders/enslave-1.svg'),
  ('Task: Enslave Iron Lotus',  'Boss-class. Needs a four-person crew and a long chain.',                      12000, 30000, 'Iron Halo',      'Iron Lotus',  'open',    '/placeholders/enslave-2.svg')
) as v(title, description, price, resale, game, target, status, img);
