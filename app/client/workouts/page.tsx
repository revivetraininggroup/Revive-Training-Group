'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ClientWorkoutsPage() {
  const [workouts, setWorkouts] = useState<any[]>([])
  const [logging, setLogging] = useState<any>(null)
  const [logForm, setLogForm] = useState({ duration_minutes: '', notes: '' })
  const [exerciseLogs, setExerciseLogs] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user!.id)
      const { data: programs } = await supabase.from('programs').select('*, workouts(*, exercises(*))').eq('client_id', user!.id).order('created_at', { ascending: false }).limit(1)
      if (programs?.[0]?.workouts) setWorkouts(programs[0].workouts)
    }
    load()
  }, [])

  function startLog(workout: any) {
    setLogging(workout)
    setExerciseLogs(workout.exercises?.map((ex: any) => ({
      exercise_name: ex.name,
      sets_completed: ex.sets ?? '',
      reps_completed: ex.reps ?? '',
      weight_used: ex.weight ?? '',
      notes: ''
    })) ?? [])
    setLogForm({ duration_minutes: '', notes: '' })
  }

  async function submitLog(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { data: log } = await supabase.from('workout_logs').insert({
      client_id: userId,
      workout_id: logging.id,
      duration_minutes: logForm.duration_minutes ? parseInt(logForm.duration_minutes) : null,
      notes: logForm.notes || null,
      completed: true
    }).select().single()

    if (log) {
      await supabase.from('exercise_logs').insert(
        exerciseLogs.map(el => ({ ...el, workout_log_id: log.id }))
      )
    }

    setLogging(null)
    setSaving(false)
    alert('Workout logged! Great work 💪')
  }

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div>
      <h1 className="page-title mb-6">My Workouts</h1>

      {logging && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 overflow-y-auto py-8">
          <div className="card w-full max-w-lg shadow-xl mx-4">
            <h2 className="section-title mb-1">Logging: {logging.title}</h2>
            <p className="text-slate-400 text-sm mb-4">{DAYS[logging.day_of_week]} · Week {logging.week_number}</p>

            <form onSubmit={submitLog} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Duration (min)</label>
                  <input className="input" type="number" placeholder="45" value={logForm.duration_minutes} onChange={e => setLogForm({...logForm, duration_minutes: e.target.value})} />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input className="input" placeholder="Felt great!" value={logForm.notes} onChange={e => setLogForm({...logForm, notes: e.target.value})} />
                </div>
              </div>

              {exerciseLogs.length > 0 && (
                <div>
                  <p className="label mb-2">Exercises completed</p>
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

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : '✓ Log workout'}</button>
                <button type="button" className="btn-secondary" onClick={() => setLogging(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {workouts.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">🏋️</p>
          <p className="text-slate-600 font-medium">No workouts assigned yet</p>
          <p className="text-slate-400 text-sm">Your coach will assign a program soon</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {workouts.sort((a, b) => a.week_number - b.week_number || a.day_of_week - b.day_of_week).map(w => (
            <div key={w.id} className="card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{w.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Week {w.week_number} · {DAYS[w.day_of_week]} · {w.exercises?.length ?? 0} exercises</p>
                  {w.notes && <p className="text-sm text-slate-500 mt-1">{w.notes}</p>}
                </div>
                <button onClick={() => startLog(w)} className="btn-primary text-sm">Log workout</button>
              </div>

              {w.exercises?.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-400">
                        <th className="text-left pb-1 pr-4">Exercise</th>
                        <th className="text-left pb-1 pr-4">Sets</th>
                        <th className="text-left pb-1 pr-4">Reps</th>
                        <th className="text-left pb-1">Weight</th>
                      </tr>
                    </thead>
                    <tbody>
                      {w.exercises.map((ex: any) => (
                        <tr key={ex.id} className="border-t border-slate-100">
                          <td className="py-1.5 pr-4 font-medium text-slate-700">{ex.name}</td>
                          <td className="py-1.5 pr-4 text-slate-500">{ex.sets ?? '—'}</td>
                          <td className="py-1.5 pr-4 text-slate-500">{ex.reps ?? '—'}</td>
                          <td className="py-1.5 text-slate-500">{ex.weight ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
