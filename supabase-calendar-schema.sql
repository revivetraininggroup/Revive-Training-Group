-- Run this in your Supabase SQL editor to add calendar support

-- Calendar workouts (date-based, replaces program/workout system)
create table public.calendar_workouts (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) not null,
  scheduled_date date not null,
  title text not null,
  notes text,
  created_at timestamptz default now()
);

-- Exercises inside a calendar workout
create table public.calendar_exercises (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references public.calendar_workouts(id) on delete cascade not null,
  name text not null,
  sets int,
  reps text,
  weight text,
  rest text,
  notes text,
  order_index int default 0
);

-- Client logs for calendar workouts
create table public.calendar_workout_logs (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references public.calendar_workouts(id) on delete cascade not null,
  client_id uuid references public.profiles(id) not null,
  duration_minutes int,
  notes text,
  completed boolean default true,
  logged_at timestamptz default now()
);

-- Exercise logs within a calendar workout log
create table public.calendar_exercise_logs (
  id uuid default gen_random_uuid() primary key,
  workout_log_id uuid references public.calendar_workout_logs(id) on delete cascade not null,
  exercise_name text not null,
  sets_completed text,
  reps_completed text,
  weight_used text,
  notes text
);

-- RLS
alter table public.calendar_workouts enable row level security;
alter table public.calendar_exercises enable row level security;
alter table public.calendar_workout_logs enable row level security;
alter table public.calendar_exercise_logs enable row level security;

-- Calendar workouts: coach full access, client reads own
create policy "Coach manages calendar workouts" on public.calendar_workouts for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);
create policy "Client reads own calendar workouts" on public.calendar_workouts for select using (client_id = auth.uid());

-- Calendar exercises: follow workout access
create policy "Coach manages calendar exercises" on public.calendar_exercises for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);
create policy "Client reads own calendar exercises" on public.calendar_exercises for select using (
  exists (select 1 from public.calendar_workouts where id = workout_id and client_id = auth.uid())
);

-- Calendar workout logs: client full access, coach reads
create policy "Client manages own calendar logs" on public.calendar_workout_logs for all using (client_id = auth.uid());
create policy "Coach reads all calendar logs" on public.calendar_workout_logs for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);

-- Calendar exercise logs: follow workout log
create policy "Client manages calendar exercise logs" on public.calendar_exercise_logs for all using (
  exists (select 1 from public.calendar_workout_logs where id = workout_log_id and client_id = auth.uid())
);
create policy "Coach reads calendar exercise logs" on public.calendar_exercise_logs for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);
