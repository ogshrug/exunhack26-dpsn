create table public.chat_messages (
  id bigint generated always as identity primary key,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  reply_to bigint references public.chat_messages (id) on delete set null,
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index chat_messages_created_idx on public.chat_messages (created_at desc);

create table public.chat_reactions (
  message_id bigint not null references public.chat_messages (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji text not null check (emoji in ('heart', 'thumbs_up', 'smile', 'laugh', 'cry')),
  primary key (message_id, user_id, emoji)
);

alter table public.chat_messages enable row level security;
alter table public.chat_reactions enable row level security;

create policy "chat read" on public.chat_messages for select to authenticated using (true);
create policy "chat send" on public.chat_messages for insert to authenticated with check (author_id = auth.uid() and pinned = false);
create policy "reactions read" on public.chat_reactions for select to authenticated using (true);
create policy "reactions add" on public.chat_reactions for insert to authenticated with check (user_id = auth.uid());
create policy "reactions remove" on public.chat_reactions for delete to authenticated using (user_id = auth.uid());

create function public.set_pinned(p_id bigint, p_pinned boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  update public.chat_messages set pinned = p_pinned where id = p_id;
end $$;
grant execute on function public.set_pinned(bigint, boolean) to authenticated;

alter publication supabase_realtime add table public.chat_messages, public.chat_reactions;
