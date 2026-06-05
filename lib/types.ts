export type Role = 'coach' | 'client'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: Role
  avatar_url: string | null
  created_at: string
}

export interface Client {
  id: string
  coach_id: string
  goal: string | null
  notes: string | null
  start_date: string
  active: boolean
  profile?: Profile
}

export interface Program {
  id: string
  coach_id: string
  client_id: string
  title: string
  description: string | null
  start_date: string | null
  end_date: string | null
  created_at: string
  workouts?: Workout[]
  client?: Profile
}

export interface Workout {
  id: string
  program_id: string
  title: string
  day_of_week: number | null
  week_number: number
  notes: string | null
  order_index: number
  exercises?: Exercise[]
}

export interface Exercise {
  id: string
  workout_id: string
  name: string
  sets: number | null
  reps: string | null
  weight: string | null
  duration: string | null
  rest: string | null
  notes: string | null
  order_index: number
}

export interface WorkoutLog {
  id: string
  client_id: string
  workout_id: string | null
  logged_at: string
  duration_minutes: number | null
  notes: string | null
  completed: boolean
  exercise_logs?: ExerciseLog[]
  workout?: Workout
  client?: Profile
}

export interface ExerciseLog {
  id: string
  workout_log_id: string
  exercise_name: string
  sets_completed: number | null
  reps_completed: string | null
  weight_used: string | null
  notes: string | null
}

export interface Checkin {
  id: string
  client_id: string
  week_start: string
  energy_level: number | null
  sleep_quality: number | null
  stress_level: number | null
  nutrition_adherence: number | null
  workout_adherence: number | null
  wins: string | null
  struggles: string | null
  questions: string | null
  coach_feedback: string | null
  submitted_at: string
  client?: Profile
}

export interface BodyStat {
  id: string
  client_id: string
  logged_at: string
  weight_lbs: number | null
  body_fat_pct: number | null
  notes: string | null
}

export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  content: string
  read: boolean
  sent_at: string
  sender?: Profile
  recipient?: Profile
}
