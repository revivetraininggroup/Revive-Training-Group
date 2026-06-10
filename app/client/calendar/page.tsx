'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

function toDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function getWeekDays(weekStart: Date) {
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    days.push(d)
  }
  return days
}

function getWeekStart(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday start
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function ClientCalendarPage() {
  const [workoutsByDate, setWorkoutsByDate] = useState<Record<string, any[]>>({})
  const [selectedDate, setSelectedDate] = useState<string>(toDateStr(new Date()))
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null)
  const [logging, setLogging] = useState<any>(null)
  const [logForm, setLogForm] = useState({ duration_minutes: '', notes: '' })
  const [exerciseLogs, setExerciseLogs] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const today = new Date()
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()))
  const supabase = createClient()
  const days = getWeekDays(weekStart)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user!.id)
      const { data: w } = await supabase
        .from('calendar_workouts')
        .select('*, exercises:calendar_exercises(*), logs:calendar_workout_logs(*)')
        .eq('client_id', user!.id)
      const byDate: Record<string, any[]> = {}
      for (const workout of w ?? []) {
        if (!byDate[workout.scheduled_date]) byDate[workout.scheduled_date] = []
        byDate[workout.scheduled_date].push(workout)
      }
      setWorkoutsByDate(byDate)
    }
    load()
  }, [])

  function startLog(workout: any) {
    setLogging(workout)
    const existingLog = workout.logs?.[0]
    setLogForm({
      duration_minutes: existingLog?.duration_minutes?.toString() ?? '',
      notes: existingLog?.notes ?? ''
    })
    setExerciseLogs(workout.exercises?.map((ex: any) => ({
      exercise_name: ex.name,
      sets_completed: ex.sets?.toString() ?? '',
      reps_completed: ex.reps ?? '',
      weight_used: ex.weight ?? '',
      notes: '',
    })) ?? [])
  }

  async function submitLog(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: log } = await supabase.from('calendar_workout_logs').insert({
      workout_id: logging.id,
      client_id: userId,
      duration_minutes: logForm.duration_minutes ? parseInt(logForm.duration_minutes) : null,
      notes: logForm.notes || null,
      completed: true,
      logged_at: new Date().toISOString(),
    }).select().single()

    if (log && exerciseLogs.length > 0) {
      await supabase.from('calendar_exercise_logs').insert(
        exerciseLogs.map(el => ({ ...el, workout_log_id: log.id }))
      )
    }

    setLogging(null)
    setSaving(false)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: w } = await supabase.from('calendar_workouts').select('*, exercises:calendar_exercises(*), logs:calendar_workout_logs(*)').eq('client_id', user!.id)
    const byDate: Record<string, any[]> = {}
    for (const workout of w ?? []) {
      if (!byDate[workout.scheduled_date]) byDate[workout.scheduled_date] = []
      byDate[workout.scheduled_date].push(workout)
    }
    setWorkoutsByDate(byDate)
  }

  const todayStr = toDateStr(today)
  const selectedWorkouts = workoutsByDate[selectedDate] ?? []

  return (
    <div>
      <h1 className="page-title mb-6">My Training</h1>

      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d) }}
          className="btn-secondary text-sm px-3 py-1.5"
        >
          ← Prev week
        </button>
        <p className="text-sm font-medium text-slate-600">
          {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(weekStart.getTime() + 6 * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        <button
          onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d) }}
          className="btn-secondary text-sm px-3 py-1.5"
        >
          Next week →
        </button>
      </div>

      {/* 7 day grid */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {days.map(d => {
          const ds = toDateStr(d)
          const hasWorkout = (workoutsByDate[ds] ?? []).length > 0
          const isToday = ds === todayStr
          const isSelected = ds === selectedDate
          const isPast = ds < todayStr
          const isDone = hasWorkout && (workoutsByDate[ds] ?? []).every((w: any) => w.logs?.length > 0)

          return (
            <button
              key={ds}
              onClick={() => { setSelectedDate(ds); setSelectedWorkout(null) }}
              className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition-colors
                ${isSelected ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-slate-200 hover:border-sky-300'}
                ${isPast && !isSelected ? 'opacity-60' : ''}
              `}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected ? 'text-sky-100' : 'text-slate-400'}`}>
                {d.toLocaleDateString('en-US', { weekday: 'short' })}
              </span>
              <span className={`text-base font-bold ${isSelected ? 'text-white' : isToday ? 'text-sky-600' : 'text-slate-800'}`}>
                {d.getDate()}
              </span>
              <div className={`w-1.5 h-1.5 rounded-full ${isDone ? 'bg-green-400' : hasWorkout ? (isSelected ? 'bg-sky-200' : 'bg-sky-400') : 'bg-transparent'}`} />
            </button>
          )
        })}
      </div>

      {logging && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
          <div className="card w-full max-w-lg shadow-xl">
            <h2 className="section-title mb-1">Logging: {logging.title}</h2>
            <p className="text-slate-400 text-sm mb-4">{new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <form onSubmit={submitLog} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Duration (min)</label>
                  <input className="input" type="number" placeholder="45" value={logForm.duration_minutes} onChange={e => setLogForm({ ...logForm, duration_minutes: e.target.value })} />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input className="input" placeholder="Felt great!" value={logForm.notes} onChange={e => setLogForm({ ...logForm, notes: e.target.value })} />
                </div>
              </div>
              {exerciseLogs.length > 0 && (
                <div>
                  <p className="label mb-2">Exercises</p>
                  <div className="space-y-2">
                    {exerciseLogs.map((el, i) => (
                      <div key={i} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-sm font-medium text-slate-700 mb-2">{el.exercise_name}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs text-slate-400">Sets done</label>
                            <input className="input text-sm" value={el.sets_completed} onChange={e => { const n = [...exerciseLogs]; n[i].sets_completed = e.target.value; setExerciseLogs(n) }} />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">Reps done</label>
                            <input className="input text-sm" value={el.reps_completed} onChange={e => { const n = [...exerciseLogs]; n[i].reps_completed = e.target.value; setExerciseLogs(n) }} />
                          </div>
                          <div>
                            <label className="text-xs text-slate-400">Weight used</label>
                            <input className="input text-sm" value={el.weight_used} onChange={e => { const n = [...exerciseLogs]; n[i].weight_used = e.target.value; setExerciseLogs(n) }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : '✓ Log workout'}</button>
                <button type="button" className="btn-secondary" onClick={() => setLogging(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">
            {selectedDate === todayStr ? 'Today' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h2>
        </div>

        {selectedWorkouts.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-3xl mb-2">🌿</p>
            <p className="text-slate-600 font-medium">Rest day</p>
            <p className="text-slate-400 text-sm mt-1">No workouts scheduled for this day</p>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedWorkouts.map((w: any) => {
              const isDone = w.logs?.length > 0
              return (
                <div key={w.id} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-800">{w.title}</p>
                        {isDone && <span className="badge badge-green">Done ✓</span>}
                      </div>
                      {w.notes && <p className="text-sm text-slate-500 mt-0.5">{w.notes}</p>}
                    </div>
                    <button onClick={() => startLog(w)} className={`text-sm ${isDone ? 'btn-secondary' : 'btn-primary'}`}>
                      {isDone ? 'Edit log' : 'Log workout'}
                    </button>
                  </div>

                  {w.exercises?.length > 0 && (
                    <div className="border-t border-slate-100 pt-3">
                      <button
                        onClick={() => setSelectedWorkout(selectedWorkout?.id === w.id ? null : w)}
                        className="text-xs text-sky-600 font-medium mb-2 hover:underline"
                      >
                        {selectedWorkout?.id === w.id ? 'Hide exercises ▲' : `View ${w.exercises.length} exercises ▼`}
                      </button>
                      {selectedWorkout?.id === w.id && (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-slate-400">
                              <th className="text-left pb-2 pr-4">Exercise</th>
                              <th className="text-left pb-2 pr-4">Sets</th>
                              <th className="text-left pb-2 pr-4">Reps</th>
                              <th className="text-left pb-2">Weight</th>
                            </tr>
                          </thead>
                          <tbody>
                            {w.exercises.sort((a: any, b: any) => a.order_index - b.order_index).map((ex: any) => (
                              <tr key={ex.id} className="border-t border-slate-100">
                                <td className="py-1.5 pr-4 font-medium text-slate-700">{ex.name}</td>
                                <td className="py-1.5 pr-4 text-slate-500">{ex.sets ?? '—'}</td>
                                <td className="py-1.5 pr-4 text-slate-500">{ex.reps ?? '—'}</td>
                                <td className="py-1.5 text-slate-500">{ex.weight ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
