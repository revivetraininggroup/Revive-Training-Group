-- Run this in your Supabase SQL editor to add progress photo support

-- Progress photos table
create table public.progress_photos (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) not null,
  photo_date date default current_date,
  front_url text,
  side_url text,
  back_url text,
  notes text,
  created_at timestamptz default now()
);

alter table public.progress_photos enable row level security;

create policy "Client manages own photos" on public.progress_photos for all using (client_id = auth.uid());
create policy "Coach reads all photos" on public.progress_photos for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);

-- STORAGE SETUP (do this in Supabase Dashboard > Storage):
-- 1. Go to Storage in your Supabase dashboard
-- 2. Click "New bucket"
-- 3. Name it: progress-photos
-- 4. Check "Public bucket" OFF (keep it private)
-- 5. Click Create

-- Then run these storage policies:
insert into storage.buckets (id, name, public) values ('progress-photos', 'progress-photos', false);

create policy "Clients can upload own photos" on storage.objects for insert with check (
  bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Clients can view own photos" on storage.objects for select using (
  bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Coach can view all photos" on storage.objects for select using (
  bucket_id = 'progress-photos' and
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);

create policy "Clients can delete own photos" on storage.objects for delete using (
  bucket_id = 'progress-photos' and auth.uid()::text = (storage.foldername(name))[1]
);
