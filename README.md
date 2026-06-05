# Revive — Your Personal Coaching App

A full-stack coaching platform to replace TrueCoach. Built with Next.js + Supabase.

---

## What's included

**Coach portal:**
- Dashboard with client activity overview
- Client management (add, view, track progress)
- Program builder (workouts + exercises, by week/day)
- Check-in review with feedback
- Real-time messaging

**Client portal:**
- Personal dashboard
- View assigned workout programs
- Log completed workouts with sets/reps/weight
- Weekly check-in submission (energy, sleep, stress, nutrition, workouts)
- Body stats tracking (weight, body fat %)
- Real-time messaging with coach

---

## Setup (takes ~15 minutes)

### Step 1: Create a Supabase project (free)

1. Go to **https://supabase.com** and sign up
2. Click **New project**, name it "coachhub", set a database password
3. Wait for it to provision (~1 minute)

### Step 2: Set up the database

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Copy the entire contents of `supabase-schema.sql`
3. Paste it in and click **Run**

### Step 3: Create your coach account

1. In Supabase, go to **Authentication → Users**
2. Click **Add user → Create new user**
3. Enter your email and a password
4. After creating, go to **SQL Editor** and run:

```sql
UPDATE public.profiles SET role = 'coach' WHERE email = 'YOUR_EMAIL_HERE';
```

### Step 4: Get your API keys

1. In Supabase, go to **Settings → API**
2. Copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret!)

### Step 5: Deploy to Vercel (free)

1. Go to **https://vercel.com** and sign up with GitHub
2. Push this folder to a GitHub repo (or upload directly)
3. Click **New Project** → import your repo
4. Under **Environment Variables**, add:
   ```
   NEXT_PUBLIC_SUPABASE_URL = your project URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your anon key
   SUPABASE_SERVICE_ROLE_KEY = your service role key
   COACH_EMAIL = your coach email
   ```
5. Click **Deploy**

Vercel will give you a URL like `https://coachhub-yourname.vercel.app`

---

## How to use it

### As coach:
1. Log in at your Vercel URL
2. Go to **Clients** → **Add client** (enter their name + email)
   - They'll get an email to set their password
3. Go to **Programs** → **New program** → assign to client
4. Click into the program to add workouts and exercises
5. Check **Check-ins** when clients submit their weekly updates — leave feedback there
6. **Messages** for real-time chat

### For your clients:
- Send them your Vercel URL
- They sign in with the account you created
- They'll see their assigned workouts, check-in form, stats tracker, and messages

---

## Local development (optional)

```bash
npm install
cp .env.local.example .env.local
# Fill in your keys in .env.local
npm run dev
```

Open http://localhost:3000

---

## Tech stack
- **Next.js 14** (App Router)
- **Supabase** (database, auth, real-time)
- **Tailwind CSS**
- **TypeScript**
- **Vercel** (hosting)

All free tiers — no monthly cost!
