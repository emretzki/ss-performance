-- Session notes, and PT profile photos (Supabase Storage bucket + policies).

alter table sessions add column if not exists notes text;
alter table profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone can view avatars (public bucket, read-only for the world).
create policy avatars_public_read on storage.objects for select
  using (bucket_id = 'avatars');

-- A user may only upload/update/delete files under their own uid/ prefix.
create policy avatars_owner_write on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_owner_update on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatars_owner_delete on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
