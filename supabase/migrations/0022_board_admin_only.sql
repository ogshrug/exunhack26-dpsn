drop policy "board insert" on public.board_posts;
create policy "board insert" on public.board_posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_admin());

create table public.board_reactions (
  post_id bigint not null references public.board_posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('heart', 'thumbs_up', 'smile', 'laugh', 'cry')),
  primary key (post_id, user_id, emoji)
);
alter table public.board_reactions enable row level security;
create policy "board reactions read" on public.board_reactions for select to authenticated using (true);
create policy "board reactions add" on public.board_reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.board_posts p where p.id = post_id));
create policy "board reactions remove" on public.board_reactions for delete to authenticated using (user_id = auth.uid());
alter publication supabase_realtime add table public.board_reactions;
