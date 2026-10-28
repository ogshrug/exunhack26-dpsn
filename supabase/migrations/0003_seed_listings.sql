insert into public.listings (seller_id, category, title, description, price, game, target_character, status)
select p.id, v.category, v.title, v.description, v.price, v.game, v.target, v.status
from (select id from public.profiles order by created_at limit 1) p,
(values
  ('bounty',  'Bounty: Captain Vex',        'Fugitive pilot. Last seen near the Skyline docks. Bring proof of defeat.',  4500, 'Skyline Online', 'Captain Vex',       'open'),
  ('bounty',  'Bounty: The Ember Witch',    'Escaped her quest chain. Must be transposed and finished in Ember Vale.',   9000, 'Ember Vale',     'The Ember Witch',   'claimed'),
  ('bounty',  'Bounty: Rook-9 (rogue NPC)', 'Gone off script. Dead or deleted.',                                         2750, 'Iron Halo',      'Rook-9',            'open'),
  ('bounty',  'Bounty: Lady Neon',          'Racing champion with a price on her head.',                                 6200, 'Neon Drift',     'Lady Neon',         'completed'),
  ('hitman',  'Hitman: Silent Kestrel',     'Veteran assassin class. Clean hits, no loot left behind. Level 80.',        3000, 'Skyline Online', 'Any listed target', 'open'),
  ('hitman',  'Hitman: Two-Tone Duo',       'Pair of mercenaries, flat rate per contract.',                              5500, 'Iron Halo',      'Any listed target', 'open'),
  ('hitman',  'Hitman: Gravel',             'Brute-force specialist. Messy but reliable.',                               1800, 'Carpet City',    'Any listed target', 'open'),
  ('substance','Neon Elixir (x10)',         'In-game consumable. Temporary speed boost, mild visual glitching.',          320, 'Neon Drift',     null,                'open'),
  ('substance','Ember Dust, 1 vial',        'Crafting reagent. Handle with a fireproof inventory slot.',                  540, 'Ember Vale',     null,                'open'),
  ('substance','Halo Stim Pack',            'Restores shield and dulls sensors for 60 seconds.',                          410, 'Iron Halo',      null,                'open')
) as v(category, title, description, price, game, target, status);
