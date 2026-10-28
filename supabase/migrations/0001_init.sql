create extension if not exists vector with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique,
  role text not null default 'user' check (role in ('user','admin')),
  face_embedding extensions.vector(128),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create view public.profile_public with (security_invoker = false) as
  select id, handle, role from public.profiles;
revoke all on public.profiles from anon, authenticated;
grant select (id, handle, role, created_at) on public.profiles to authenticated;
grant select on public.profile_public to authenticated;

alter table public.profiles enable row level security;
create policy "profiles readable by authed" on public.profiles
  for select to authenticated using (true);

create or replace function public.match_face(q extensions.vector(128), max_dist float default 0.5)
returns table(id uuid, dist float)
language sql stable security definer set search_path = public, extensions as $$
  select p.id, (p.face_embedding <-> q)::float as dist
  from public.profiles p
  where p.face_embedding is not null and (p.face_embedding <-> q) < max_dist
  order by p.face_embedding <-> q limit 1;
$$;
revoke execute on function public.match_face from public, anon, authenticated;

create table public.news (
  id bigint generated always as identity primary key,
  title text not null, body text not null,
  created_at timestamptz not null default now()
);
alter table public.news enable row level security;
create policy "news read" on public.news for select to authenticated using (true);
create policy "news admin write" on public.news for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create table public.listings (
  id bigint generated always as identity primary key,
  seller_id uuid not null default auth.uid() references public.profiles(id),
  category text not null check (category in ('bounty','substance','hitman')),
  title text not null,
  description text not null default '',
  price numeric not null check (price >= 0),
  game text not null,
  target_character text,
  status text not null default 'open' check (status in ('open','claimed','completed')),
  claimed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.listings enable row level security;
create policy "listings read" on public.listings for select to authenticated using (true);
create policy "listings insert own" on public.listings for insert to authenticated
  with check (seller_id = auth.uid());
create policy "listings update own or admin" on public.listings for update to authenticated
  using (seller_id = auth.uid() or public.is_admin())
  with check (seller_id = auth.uid() or public.is_admin());
create policy "listings admin delete" on public.listings for delete to authenticated
  using (public.is_admin());

create table public.channels (
  id bigint generated always as identity primary key,
  name text not null unique, description text not null default ''
);
create table public.posts (
  id bigint generated always as identity primary key,
  channel_id bigint not null references public.channels(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id),
  parent_id bigint references public.posts(id) on delete cascade,
  title text, body text not null,
  created_at timestamptz not null default now()
);
create table public.votes (
  post_id bigint not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id),
  value smallint not null check (value in (-1,1)),
  primary key (post_id, user_id)
);
alter table public.channels enable row level security;
alter table public.posts enable row level security;
alter table public.votes enable row level security;
create policy "channels read" on public.channels for select to authenticated using (true);
create policy "posts read" on public.posts for select to authenticated using (true);
create policy "posts insert own" on public.posts for insert to authenticated with check (author_id = auth.uid());
create policy "posts delete own or admin" on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());
create policy "votes read" on public.votes for select to authenticated using (true);
create policy "votes write own" on public.votes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.board_posts (
  id bigint generated always as identity primary key,
  author_id uuid not null default auth.uid() references public.profiles(id),
  audience text not null check (audience in ('admin','user')),
  title text not null, body text not null,
  created_at timestamptz not null default now()
);
alter table public.board_posts enable row level security;
create policy "board read" on public.board_posts for select to authenticated
  using (audience = 'user' or public.is_admin());
create policy "board insert" on public.board_posts for insert to authenticated
  with check (author_id = auth.uid() and (audience = 'user' or public.is_admin()));
create policy "board delete" on public.board_posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

create table public.members (
  id bigint generated always as identity primary key,
  handle text not null, city text not null,
  lat double precision not null, lng double precision not null,
  last_seen timestamptz not null default now()
);
alter table public.members enable row level security;
create policy "members admin read" on public.members for select to authenticated using (public.is_admin());
create policy "members admin update" on public.members for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

alter publication supabase_realtime add table public.posts, public.votes, public.members, public.listings, public.board_posts;

insert into public.news (title, body) values
 ('Second coming scheduled', 'Carpet City gates open to the faithful. Passage funds now accepted.'),
 ('New stock: fresh characters', 'Newly transposed characters have arrived. Limited supply.'),
 ('Relay node online', 'Cluster relays re-routed to public endpoints. Do not ask again.');
insert into public.channels (name, description) values
 ('general','Open floor'),('carpet-city','Passage and transfiguration'),('market-talk','Prices and rumours'),('lost-characters','Escapees sightings');
insert into public.members (handle, city, lat, lng) values
 ('Azure-01','Delhi',28.61,77.21),('Azure-02','London',51.51,-0.13),('Azure-03','Tokyo',35.68,139.69),
 ('Azure-04','Cairo',30.04,31.24),('Azure-05','Brasilia',-15.79,-47.88),('Azure-06','Washington',38.9,-77.04),
 ('Azure-07','Canberra',-35.28,149.13),('Azure-08','Moscow',55.75,37.62),('Azure-09','Nairobi',-1.29,36.82),
 ('Azure-10','Ottawa',45.42,-75.7);
