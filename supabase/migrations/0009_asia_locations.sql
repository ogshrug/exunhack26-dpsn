update public.listings as l set lat = v.lat, lng = v.lng
from (values
  ('Bounty: Captain Vex',        28.61, 77.21),
  ('Bounty: The Ember Witch',    26.91, 75.79),
  ('Bounty: Rook-9 (rogue NPC)', 30.73, 76.78),
  ('Bounty: Lady Neon',          26.85, 80.95),
  ('Bounty: Glitch Sparrow',     31.63, 74.87),
  ('Bounty: Nova Reeve',         30.32, 78.03),
  ('Bounty: Static Monk',        25.32, 82.97),
  ('Bounty: Vault Jackal',       35.68, 139.69),
  ('Bounty: Pale Courier',       25.20, 55.27),
  ('Bounty: Iron Lotus',         1.35,  103.82)
) as v(title, lat, lng)
where l.title = v.title;

update public.members as m set city = v.city, lat = v.lat, lng = v.lng
from (values
  ('Acolyte-01', 'New Delhi', 28.61, 77.21),
  ('Acolyte-02', 'Srinagar',  34.08, 74.80),
  ('Acolyte-03', 'Shimla',    31.10, 77.17),
  ('Acolyte-04', 'Agra',      27.18, 78.02),
  ('Acolyte-05', 'Kanpur',    26.45, 80.35),
  ('Acolyte-06', 'Patna',     25.59, 85.14),
  ('Acolyte-07', 'Seoul',     37.57, 126.98),
  ('Acolyte-08', 'Bangkok',   13.76, 100.50),
  ('Acolyte-09', 'Hong Kong', 22.32, 114.17),
  ('Acolyte-10', 'Tokyo',     35.68, 139.69)
) as v(handle, city, lat, lng)
where m.handle = v.handle;
