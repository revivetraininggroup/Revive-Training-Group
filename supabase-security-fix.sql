-- ================================================================
-- FIX: Scope all coach RLS policies to only their own clients
-- Run this in Supabase SQL Editor
-- ================================================================

-- CLIENTS table: coaches can only manage their own clients
drop policy if exists "Coach manages clients" on public.clients;
create policy "Coach manages clients" on public.clients for all using (
  coach_id = auth.uid()
);

-- CHECKINS: coaches can only read/update their own clients' checkins
drop policy if exists "Coach reads and updates checkins" on public.checkins;
create policy "Coach reads and updates checkins" on public.checkins for all using (
  exists (
    select 1 from public.clients
    where clients.id = checkins.client_id
    and clients.coach_id = auth.uid()
  )
);

-- BODY STATS: coaches can only read their own clients' stats
drop policy if exists "Coach reads all stats" on public.body_stats;
create policy "Coach reads own clients stats" on public.body_stats for select using (
  exists (
    select 1 from public.clients
    where clients.id = body_stats.client_id
    and clients.coach_id = auth.uid()
  )
);

-- CALENDAR WORKOUTS: coaches can only manage their own clients' workouts
drop policy if exists "Coach manages calendar workouts" on public.calendar_workouts;
create policy "Coach manages calendar workouts" on public.calendar_workouts for all using (
  exists (
    select 1 from public.clients
    where clients.id = calendar_workouts.client_id
    and clients.coach_id = auth.uid()
  )
);

-- CALENDAR WORKOUT LOGS: coaches can only read their own clients' logs
drop policy if exists "Coach reads all calendar logs" on public.calendar_workout_logs;
create policy "Coach reads own clients calendar logs" on public.calendar_workout_logs for select using (
  exists (
    select 1 from public.clients
    where clients.id = calendar_workout_logs.client_id
    and clients.coach_id = auth.uid()
  )
);

-- CALENDAR EXERCISE LOGS: scoped through workout logs
drop policy if exists "Coach reads calendar exercise logs" on public.calendar_exercise_logs;
create policy "Coach reads own clients exercise logs" on public.calendar_exercise_logs for select using (
  exists (
    select 1 from public.calendar_workout_logs cwl
    join public.clients c on c.id = cwl.client_id
    where cwl.id = calendar_exercise_logs.workout_log_id
    and c.coach_id = auth.uid()
  )
);

-- PROGRESS PHOTOS: coaches can only view their own clients' photos
drop policy if exists "Coach reads all photos" on public.progress_photos;
create policy "Coach reads own clients photos" on public.progress_photos for select using (
  exists (
    select 1 from public.clients
    where clients.id = progress_photos.client_id
    and clients.coach_id = auth.uid()
  )
);

-- NUTRITION PLANS: coaches can only manage their own clients' plans
drop policy if exists "Coach manages nutrition plans" on public.nutrition_plans;
create policy "Coach manages nutrition plans" on public.nutrition_plans for all using (
  coach_id = auth.uid()
);

-- WORKOUT LOGS: coaches can only read their own clients' logs
drop policy if exists "Coach reads all logs" on public.workout_logs;
create policy "Coach reads own clients logs" on public.workout_logs for select using (
  exists (
    select 1 from public.clients
    where clients.id = workout_logs.client_id
    and clients.coach_id = auth.uid()
  )
);

-- STORAGE: coaches can only view photos belonging to their clients
drop policy if exists "Coach can view all photos" on storage.objects;
create policy "Coach can view own clients photos" on storage.objects for select using (
  bucket_id = 'progress-photos' and
  exists (
    select 1 from public.clients c
    join public.progress_photos pp on pp.client_id = c.id
    where c.coach_id = auth.uid()
    and pp.storage_path like '%' || (storage.foldername(name))[1] || '%'
  )
);
