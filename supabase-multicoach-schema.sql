-- Add role column to profiles if it doesn't exist
alter table public.profiles add column if not exists role text default 'client';

-- Update existing coach profile (replace with your actual user ID if needed)
-- This will be set automatically via the API for new coaches

-- Grant access for coaches to be listed on register page
create policy if not exists "Anyone can view coach profiles" on public.profiles
  for select using (role = 'coach');

-- Trigger to auto-create client record when a user signs up with a coach_id in metadata
create or replace function public.handle_new_client_signup()
returns trigger as $$
declare
  coach_uuid uuid;
begin
  -- Get coach_id from user metadata
  coach_uuid := (new.raw_user_meta_data->>'coach_id')::uuid;
  
  -- Only create client record if coach_id is provided and role is client
  if coach_uuid is not null and (new.raw_user_meta_data->>'role') = 'client' then
    insert into public.clients (id, coach_id)
    values (new.id, coach_uuid)
    on conflict (id) do nothing;
  end if;
  
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists and recreate
drop trigger if exists on_new_client_signup on auth.users;
create trigger on_new_client_signup
  after insert on auth.users
  for each row execute procedure public.handle_new_client_signup();
