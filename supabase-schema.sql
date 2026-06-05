-- Run this in your Supabase SQL editor

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'client', -- 'coach' or 'client'
  avatar_url text,
  created_at timestamptz default now()
);

-- Client details
create table public.clients (
  id uuid references public.profiles(id) on delete cascade primary key,
  coach_id uuid references public.profiles(id) not null,
  goal text,
  notes text,
  start_date date default current_date,
  active boolean default true
);

-- Programs (workout plans)
create table public.programs (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references public.profiles(id) not null,
  client_id uuid references public.profiles(id) not null,
  title text not null,
  description text,
  start_date date,
  end_date date,
  created_at timestamptz default now()
);

-- Workouts inside a program
create table public.workouts (
  id uuid default gen_random_uuid() primary key,
  program_id uuid references public.programs(id) on delete cascade not null,
  title text not null,
  day_of_week int, -- 0=Mon, 6=Sun
  week_number int default 1,
  notes text,
  order_index int default 0
);

-- Exercises inside a workout
create table public.exercises (
  id uuid default gen_random_uuid() primary key,
  workout_id uuid references public.workouts(id) on delete cascade not null,
  name text not null,
  sets int,
  reps text,
  weight text,
  duration text,
  rest text,
  notes text,
  order_index int default 0
);

-- Workout logs (client completing workouts)
create table public.workout_logs (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) not null,
  workout_id uuid references public.workouts(id),
  logged_at timestamptz default now(),
  duration_minutes int,
  notes text,
  completed boolean default true
);

-- Exercise logs within a workout log
create table public.exercise_logs (
  id uuid default gen_random_uuid() primary key,
  workout_log_id uuid references public.workout_logs(id) on delete cascade not null,
  exercise_name text not null,
  sets_completed int,
  reps_completed text,
  weight_used text,
  notes text
);

-- Weekly check-ins
create table public.checkins (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) not null,
  week_start date not null,
  energy_level int check (energy_level between 1 and 10),
  sleep_quality int check (sleep_quality between 1 and 10),
  stress_level int check (stress_level between 1 and 10),
  nutrition_adherence int check (nutrition_adherence between 1 and 10),
  workout_adherence int check (workout_adherence between 1 and 10),
  wins text,
  struggles text,
  questions text,
  coach_feedback text,
  submitted_at timestamptz default now()
);

-- Body stats
create table public.body_stats (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) not null,
  logged_at date default current_date,
  weight_lbs numeric(5,1),
  body_fat_pct numeric(4,1),
  notes text
);

-- Messages
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) not null,
  recipient_id uuid references public.profiles(id) not null,
  content text not null,
  read boolean default false,
  sent_at timestamptz default now()
);

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.programs enable row level security;
alter table public.workouts enable row level security;
alter table public.exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.checkins enable row level security;
alter table public.body_stats enable row level security;
alter table public.messages enable row level security;

-- Profiles: users can read own, coach can read all
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Coach can view all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Allow insert on signup" on public.profiles for insert with check (auth.uid() = id);

-- Clients: coach full access, client read own
create policy "Coach manages clients" on public.clients for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);
create policy "Client reads own record" on public.clients for select using (id = auth.uid());

-- Programs: coach full access, client reads own
create policy "Coach manages programs" on public.programs for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);
create policy "Client reads own programs" on public.programs for select using (client_id = auth.uid());

-- Workouts: follow program access
create policy "Coach manages workouts" on public.workouts for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);
create policy "Client reads own workouts" on public.workouts for select using (
  exists (select 1 from public.programs where id = program_id and client_id = auth.uid())
);

-- Exercises: follow workout access
create policy "Coach manages exercises" on public.exercises for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);
create policy "Client reads own exercises" on public.exercises for select using (
  exists (
    select 1 from public.workouts w
    join public.programs p on p.id = w.program_id
    where w.id = workout_id and p.client_id = auth.uid()
  )
);

-- Workout logs: client full access own, coach read
create policy "Client manages own logs" on public.workout_logs for all using (client_id = auth.uid());
create policy "Coach reads all logs" on public.workout_logs for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);

-- Exercise logs: follow workout log
create policy "Client manages exercise logs" on public.exercise_logs for all using (
  exists (select 1 from public.workout_logs where id = workout_log_id and client_id = auth.uid())
);
create policy "Coach reads exercise logs" on public.exercise_logs for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);

-- Check-ins
create policy "Client manages own checkins" on public.checkins for all using (client_id = auth.uid());
create policy "Coach reads and updates checkins" on public.checkins for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);

-- Body stats
create policy "Client manages own stats" on public.body_stats for all using (client_id = auth.uid());
create policy "Coach reads all stats" on public.body_stats for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);

-- Messages
create policy "Users manage own messages" on public.messages for all using (
  sender_id = auth.uid() or recipient_id = auth.uid()
);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
