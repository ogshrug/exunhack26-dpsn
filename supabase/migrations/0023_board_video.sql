alter table public.board_posts add column video_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('board-videos', 'board-videos', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

create policy "board videos public read" on storage.objects for select using (bucket_id = 'board-videos');
create policy "board videos admin upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'board-videos' and public.is_admin());
