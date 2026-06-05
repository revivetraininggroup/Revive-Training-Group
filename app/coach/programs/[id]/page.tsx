'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function ProgramDetailPage() {
  const { id } = useParams()
  const [program, setProgram] = useState<any>(null)
  const [workouts, setWorkouts] = useState<any[]>([])
  const [showWorkout, setShowWorkout] = useState(false)
  const [wForm, setWForm] = useState({ title: '', day_of_week: 0, week_number: 1, notes: '' })
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null)
  const [showExercise, setShowExercise] = useState<string | null>(null)
  const [eForm, setEForm] = useState({ name: '', sets: '', reps: '', weight: '', duration: '', rest: '', notes: '' })
  const supabase = createClient()

  async function load() {
    const [{ data: p }, { data: w }] = await Promise.all([
      supabase.from('programs').select('*, client:profiles!client_id(full_name)').eq('id', id).single(),
      supabase.from('workouts').select('*, exercises(*)').eq('program_id', id).order('week_number').order('day_of_week'),
    ])
    setProgram(p)
    setWorkouts(w ?? [])
  }

  useEffect(() => { load() }, [id])

  async function addWorkout(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('workouts').insert({ ...wForm, program_id: id })
    setShowWorkout(false)
    setWForm({ title: '', day_of_week: 0, week_number: 1, notes: '' })
    load()
  }

  async function addExercise(workoutId: string, e: React.FormEvent) {
    e.preventDefault()
    const exercises = workouts.find(w => w.id === workoutId)?.exercises ?? []
    await supabase.from('exercises').insert({
      workout_id: workoutId,
      name: eForm.name,
      sets: eForm.sets ? parseInt(eForm.sets) : null,
      reps: eForm.reps || null,
      weight: eForm.weight || null,
      duration: eForm.duration || null,
      rest: eForm.rest || null,
      notes: eForm.notes || null,
      order_index: exercises.length
    })
    setShowExercise(null)
    setEForm({ name: '', sets: '', reps: '', weight: '', duration: '', rest: '', notes: '' })
    load()
  }

  async function deleteExercise(exerciseId: string) {
    await supabase.from('exercises').delete().eq('id', exerciseId)
    load()
  }

  if (!program) return <div className="text-slate-400">Loading...</div>

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Link href="/coach/programs" className="text-slate-400 hover:text-slate-600 text-sm">Programs</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 text-sm font-medium">{program.title}</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">{program.title}</h1>
          <p className="text-slate-500 text-sm mt-0.5">Client: <span className="text-sky-600 font-medium">{program.client?.full_name}</span></p>
        </div>
        <button className="btn-primary" onClick={() => setShowWorkout(true)}>+ Add workout</button>
      </div>

      {showWorkout && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card w-full max-w-md shadow-xl">
            <h2 className="section-title mb-4">Add workout</h2>
            <form onSubmit={addWorkout} className="space-y-3">
              <div>
                <label className="label">Workout name</label>
                <input className="input" placeholder="e.g. Upper Body A" value={wForm.title} onChange={e => setWForm({...wForm, title: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Week</label>
                  <input className="input" type="number" min="1" value={wForm.week_number} onChange={e => setWForm({...wForm, week_number: parseInt(e.target.value)})} />
                </div>
                <div>
                  <label className="label">Day</label>
                  <select className="input" value={wForm.day_of_week} onChange={e => setWForm({...wForm, day_of_week: parseInt(e.target.value)})}>
                    {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={wForm.notes} onChange={e => setWForm({...wForm, notes: e.target.value})} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary">Add workout</button>
                <button type="button" className="btn-secondary" onClick={() => setShowWorkout(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {workouts.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-3xl mb-2">🏋️</p>
          <p className="text-slate-600 font-medium">No workouts yet</p>
          <p className="text-slate-400 text-sm">Add workouts to build this program</p>
        </div>
      ) : (
        <div className="space-y-4">
          {workouts.map(workout => (
            <div key={workout.id} className="card">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedWorkout(expandedWorkout === workout.id ? null : workout.id)}>
                <div>
                  <p className="font-medium text-slate-800">{workout.title}</p>
                  <p className="text-xs text-slate-400">Week {workout.week_number} · {DAYS[workout.day_of_week]}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="badge badge-gray">{workout.exercises?.length ?? 0} exercises</span>
                  <span className="text-slate-400">{expandedWorkout === workout.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {expandedWorkout === workout.id && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  {workout.exercises?.length > 0 && (
                    <table className="w-full mb-3">
                      <thead>
                        <tr className="text-xs text-slate-400 text-left">
                          <th className="pb-2 pr-4">Exercise</th>
                          <th className="pb-2 pr-4">Sets</th>
                          <th className="pb-2 pr-4">Reps</th>
                          <th className="pb-2 pr-4">Weight</th>
                          <th className="pb-2 pr-4">Rest</th>
                          <th className="pb-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {workout.exercises.sort((a: any, b: any) => a.order_index - b.order_index).map((ex: any) => (
                          <tr key={ex.id} className="border-t border-slate-100">
                            <td className="py-2 pr-4 text-sm font-medium text-slate-700">{ex.name}</td>
                            <td className="py-2 pr-4 text-sm text-slate-500">{ex.sets ?? '—'}</td>
                            <td className="py-2 pr-4 text-sm text-slate-500">{ex.reps ?? '—'}</td>
                            <td className="py-2 pr-4 text-sm text-slate-500">{ex.weight ?? '—'}</td>
                            <td className="py-2 pr-4 text-sm text-slate-500">{ex.rest ?? '—'}</td>
                            <td className="py-2">
                              <button onClick={() => deleteExercise(ex.id)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {showExercise === workout.id ? (
                    <form onSubmit={e => addExercise(workout.id, e)} className="bg-slate-50 rounded-lg p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2">
                          <input className="input text-sm" placeholder="Exercise name" value={eForm.name} onChange={e => setEForm({...eForm, name: e.target.value})} required />
                        </div>
                        <input className="input text-sm" placeholder="Sets" type="number" value={eForm.sets} onChange={e => setEForm({...eForm, sets: e.target.value})} />
                        <input className="input text-sm" placeholder="Reps (e.g. 8-10)" value={eForm.reps} onChange={e => setEForm({...eForm, reps: e.target.value})} />
                        <input className="input text-sm" placeholder="Weight (e.g. 135 lbs)" value={eForm.weight} onChange={e => setEForm({...eForm, weight: e.target.value})} />
                        <input className="input text-sm" placeholder="Rest (e.g. 90 sec)" value={eForm.rest} onChange={e => setEForm({...eForm, rest: e.target.value})} />
                        <div className="col-span-2">
                          <input className="input text-sm" placeholder="Notes (optional)" value={eForm.notes} onChange={e => setEForm({...eForm, notes: e.target.value})} />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="btn-primary text-xs py-1.5">Add exercise</button>
                        <button type="button" className="btn-secondary text-xs py-1.5" onClick={() => setShowExercise(null)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button className="btn-ghost text-sm text-sky-600" onClick={() => setShowExercise(workout.id)}>+ Add exercise</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
