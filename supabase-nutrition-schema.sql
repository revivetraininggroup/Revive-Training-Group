-- Run this in your Supabase SQL editor to add nutrition support

create table public.nutrition_plans (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) not null,
  coach_id uuid references public.profiles(id) not null,
  title text not null default 'Nutrition Plan',
  content text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.nutrition_plans enable row level security;

create policy "Coach manages nutrition plans" on public.nutrition_plans for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
);
create policy "Client reads own nutrition plan" on public.nutrition_plans for select using (client_id = auth.uid());
