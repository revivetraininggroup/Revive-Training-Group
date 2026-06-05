'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)
  return days
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getWeekStart(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return toDateStr(d.getFullYear(), d.getMonth(), d.getDate())
}

export default function ClientCalendarPage() {
  const { id } = useParams()
  const [client, setClient] = useState<any>(null)
  const [allClients, setAllClients] = useState<any[]>([])
  const [workoutsByDate, setWorkoutsByDate] = useState<Record<string, any[]>>({})
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [showAddWorkout, setShowAddWorkout] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState<any>(null)
  const [workoutForm, setWorkoutForm] = useState({ title: '', notes: '' })
  const [exercises, setExercises] = useState([{ name: '', sets: '', reps: '', weight: '', rest: '', notes: '' }])
  const [saving, setSaving] = useState(false)

  // Copy state
  const [clipboard, setClipboard] = useState<{ type: 'day' | 'week', date: string, workouts: any[] } | null>(null)
  const [showPasteDay, setShowPasteDay] = useState(false)
  const [showPasteWeek, setShowPasteWeek] = useState(false)
  const [pasteTargetClient, setPasteTargetClient] = useState<string>('')
  const [pasteTargetDate, setPasteTargetDate] = useState<string>('')
  const [pasting, setPasting] = useState(false)

  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: clientData }, { data: profileData }, { data: w }, { data: cl }] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('calendar_workouts').select('*, exercises:calendar_exercises(*)').eq('client_id', id),
      supabase.from('clients').select('*').eq('coach_id', user!.id).eq('active', true),
    ])
    const c = clientData ? { ...clientData, profile: profileData } : null
    setClient(c)
    setAllClients(cl ?? [])
    setPasteTargetClient(id as string)
    const byDate: Record<string, any[]> = {}
    for (const workout of w ?? []) {
      if (!byDate[workout.scheduled_date]) byDate[workout.scheduled_date] = []
      byDate[workout.scheduled_date].push(workout)
    }
    setWorkoutsByDate(byDate)
  }

  useEffect(() => { load() }, [id])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function openDay(dateStr: string) {
    setSelectedDay(dateStr)
    setSelectedWorkout(null)
    setShowAddWorkout(false)
    setShowPasteDay(false)
    setShowPasteWeek(false)
  }

  function copyDay(dateStr: string) {
    const workouts = workoutsByDate[dateStr] ?? []
    setClipboard({ type: 'day', date: dateStr, workouts })
    setShowPasteDay(false)
    setShowPasteWeek(false)
  }

  function copyWeek(dateStr: string) {
    const weekStart = getWeekStart(dateStr)
    const allWorkouts: any[] = []
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i)
      const dayWorkouts = (workoutsByDate[d] ?? []).map(w => ({ ...w, scheduled_date: d }))
      allWorkouts.push(...dayWorkouts)
    }
    setClipboard({ type: 'week', date: weekStart, workouts: allWorkouts })
    setShowPasteDay(false)
    setShowPasteWeek(false)
  }

  async function pasteWorkouts() {
    if (!clipboard || !pasteTargetDate || !pasteTargetClient) return
    setPasting(true)

    const workoutsToPaste = clipboard.type === 'day'
      ? clipboard.workouts.map(w => ({ ...w, scheduled_date: pasteTargetDate }))
      : clipboard.workouts.map(w => {
          const dayOffset = Math.round((new Date(w.scheduled_date + 'T12:00:00').getTime() - new Date(clipboard.date + 'T12:00:00').getTime()) / 86400000)
          return { ...w, scheduled_date: addDays(pasteTargetDate, dayOffset) }
        })

    for (const w of workoutsToPaste) {
      const { data: newWorkout } = await supabase.from('calendar_workouts').insert({
        client_id: pasteTargetClient,
        scheduled_date: w.scheduled_date,
        title: w.title,
        notes: w.notes || null,
      }).select().single()

      if (newWorkout && w.exercises?.length > 0) {
        await supabase.from('calendar_exercises').insert(
          w.exercises.map((ex: any, idx: number) => ({
            workout_id: newWorkout.id,
            name: ex.name,
            sets: ex.sets || null,
            reps: ex.reps || null,
            weight: ex.weight || null,
            rest: ex.rest || null,
            notes: ex.notes || null,
            order_index: idx,
          }))
        )
      }
    }

    setShowPasteDay(false)
    setShowPasteWeek(false)
    setClipboard(null)
    setPasting(false)

    // If pasting to same client reload
    if (pasteTargetClient === id) load()
    else alert(`Pasted to ${allClients.find(c => c.id === pasteTargetClient)?.profile?.full_name}!`)
  }

  function startAddWorkout() {
    setWorkoutForm({ title: '', notes: '' })
    setExercises([{ name: '', sets: '', reps: '', weight: '', rest: '', notes: '' }])
    setShowAddWorkout(true)
    setSelectedWorkout(null)
  }

  function addExerciseRow() {
    setExercises(ex => [...ex, { name: '', sets: '', reps: '', weight: '', rest: '', notes: '' }])
  }

  function removeExerciseRow(i: number) {
    setExercises(ex => ex.filter((_, idx) => idx !== i))
  }

  function updateExercise(i: number, field: string, value: string) {
    setExercises(ex => ex.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  async function saveWorkout(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDay) return
    setSaving(true)
    const { data: workout } = await supabase.from('calendar_workouts').insert({
      client_id: id,
      scheduled_date: selectedDay,
      title: workoutForm.title,
      notes: workoutForm.notes || null,
    }).select().single()

    if (workout) {
      const validExercises = exercises.filter(ex => ex.name.trim())
      if (validExercises.length > 0) {
        await supabase.from('calendar_exercises').insert(
          validExercises.map((ex, idx) => ({
            workout_id: workout.id,
            name: ex.name,
            sets: ex.sets ? parseInt(ex.sets) : null,
            reps: ex.reps || null,
            weight: ex.weight || null,
            rest: ex.rest || null,
            notes: ex.notes || null,
            order_index: idx,
          }))
        )
      }
    }
    setShowAddWorkout(false)
    load()
    setSaving(false)
  }

  async function deleteWorkout(workoutId: string) {
    await supabase.from('calendar_workouts').delete().eq('id', workoutId)
    setSelectedWorkout(null)
    load()
  }

  const calDays = getCalendarDays(viewYear, viewMonth)
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate())

  const PasteModal = ({ onClose }: { onClose: () => void }) => (
    <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-4 space-y-3">
      <p className="text-sm font-semibold text-sky-800">
        Paste {clipboard?.type === 'week' ? 'week' : 'day'} to...
      </p>
      <div>
        <label className="label">Client</label>
        <select className="input text-sm" value={pasteTargetClient} onChange={e => setPasteTargetClient(e.target.value)}>
          {allClients.map(c => (
            <option key={c.id} value={c.id}>{c.profile?.full_name}{c.id === id ? ' (current)' : ''}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">{clipboard?.type === 'week' ? 'Paste week starting' : 'Paste to date'}</label>
        <input className="input text-sm" type="date" value={pasteTargetDate} onChange={e => setPasteTargetDate(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button className="btn-primary text-xs py-1.5" onClick={pasteWorkouts} disabled={pasting || !pasteTargetDate}>
          {pasting ? 'Pasting...' : 'Paste'}
        </button>
        <button className="btn-secondary text-xs py-1.5" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )

  return (
    <div className="flex gap-6" style={{ height: 'calc(100vh - 80px)' }}>
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link href={`/coach/clients/${id}`} className="text-slate-400 hover:text-slate-600 text-sm">
              {client?.profile?.full_name}
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 text-sm font-medium">Training Calendar</span>
          </div>
          {clipboard && (
            <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-lg">
              <span className="text-xs text-sky-700 font-medium">
                {clipboard.type === 'week' ? 'Week' : 'Day'} copied ({clipboard.workouts.length} workout{clipboard.workouts.length !== 1 ? 's' : ''})
              </span>
              <button className="text-xs text-sky-600 hover:underline font-medium" onClick={() => setShowPasteDay(true)}>Paste</button>
              <button className="text-xs text-slate-400 hover:text-slate-600" onClick={() => setClipboard(null)}>✕</button>
            </div>
          )}
        </div>

        <div className="card flex-1 p-0 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <button onClick={prevMonth} className="btn-ghost px-3 py-1.5 text-slate-500 text-lg">‹</button>
            <div className="flex items-center gap-3">
              <h2 className="section-title">{MONTHS[viewMonth]} {viewYear}</h2>
              {selectedDay && (
                <button
                  onClick={() => { copyWeek(selectedDay); setShowPasteWeek(true) }}
                  className="btn-secondary text-xs py-1 px-2"
                >
                  Copy week
                </button>
              )}
            </div>
            <button onClick={nextMonth} className="btn-ghost px-3 py-1.5 text-slate-500 text-lg">›</button>
          </div>

          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-100">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 py-2.5 uppercase tracking-wider">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 flex-1 overflow-auto">
            {calDays.map((day, i) => {
              const dateStr = day ? toDateStr(viewYear, viewMonth, day) : null
              const dayWorkouts = dateStr ? (workoutsByDate[dateStr] ?? []) : []
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selectedDay
              const isPast = dateStr ? dateStr < todayStr : false

              return (
                <div
                  key={i}
                  onClick={() => day && dateStr && openDay(dateStr)}
                  className={`border-b border-r border-slate-100 p-2 transition-colors
                    ${day ? 'cursor-pointer hover:bg-sky-50' : 'bg-slate-50/50'}
                    ${isSelected ? 'bg-sky-50 ring-1 ring-inset ring-sky-200' : ''}
                    ${isPast && day ? 'opacity-55' : ''}
                  `}
                  style={{ minHeight: '90px' }}
                >
                  {day && (
                    <>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold mb-1.5
                        ${isToday ? 'bg-sky-600 text-white' : 'text-slate-600'}`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayWorkouts.slice(0, 2).map((w: any) => (
                          <div key={w.id} className="text-[10px] bg-sky-100 text-sky-800 rounded-md px-1.5 py-0.5 truncate font-medium leading-4">
                            {w.title}
                          </div>
                        ))}
                        {dayWorkouts.length > 2 && (
                          <div className="text-[10px] text-slate-400 font-medium">+{dayWorkouts.length - 2} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="w-80 flex-shrink-0 flex flex-col gap-3 overflow-y-auto">
        {!selectedDay ? (
          <div className="card text-center py-16 text-slate-400">
            <p className="text-sm font-medium text-slate-500">Select a day</p>
            <p className="text-xs mt-1">Click any day to view or add workouts</p>
          </div>
        ) : (
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-slate-800 text-sm">
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{client?.profile?.full_name}</p>
              </div>
            </div>

            <div className="flex gap-2 mb-4 flex-wrap">
              {!showAddWorkout && (
                <button onClick={startAddWorkout} className="btn-primary text-xs py-1.5 px-3">+ Add workout</button>
              )}
              {(workoutsByDate[selectedDay] ?? []).length > 0 && (
                <button
                  onClick={() => { copyDay(selectedDay); setShowPasteDay(true) }}
                  className="btn-secondary text-xs py-1.5 px-3"
                >
                  Copy day
                </button>
              )}
              {clipboard && (
                <button
                  onClick={() => { setPasteTargetDate(selectedDay); setShowPasteDay(true) }}
                  className="btn-secondary text-xs py-1.5 px-3 text-sky-600 border-sky-200"
                >
                  Paste here
                </button>
              )}
            </div>

            {(showPasteDay || showPasteWeek) && clipboard && (
              <PasteModal onClose={() => { setShowPasteDay(false); setShowPasteWeek(false) }} />
            )}

            {showAddWorkout && (
              <form onSubmit={saveWorkout} className="bg-slate-50 rounded-xl p-4 mb-4 space-y-3">
                <div>
                  <label className="label">Workout name</label>
                  <input className="input text-sm" placeholder="e.g. Upper Body + Cardio" value={workoutForm.title} onChange={e => setWorkoutForm({ ...workoutForm, title: e.target.value })} required />
                </div>
                <div>
                  <label className="label">Coach notes</label>
                  <textarea className="input text-sm" rows={2} placeholder="Instructions for this session..." value={workoutForm.notes} onChange={e => setWorkoutForm({ ...workoutForm, notes: e.target.value })} />
                </div>
                <div>
                  <p className="label mb-2">Exercises</p>
                  <div className="space-y-2">
                    {exercises.map((ex, i) => (
                      <div key={i} className="bg-white rounded-lg p-2.5 border border-slate-200 space-y-1.5">
                        <div className="flex gap-1.5 items-center">
                          <input className="input text-xs flex-1" placeholder="Exercise name" value={ex.name} onChange={e => updateExercise(i, 'name', e.target.value)} />
                          {exercises.length > 1 && (
                            <button type="button" onClick={() => removeExerciseRow(i)} className="text-red-400 hover:text-red-600 text-sm flex-shrink-0">✕</button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <input className="input text-xs" placeholder="Sets" value={ex.sets} onChange={e => updateExercise(i, 'sets', e.target.value)} />
                          <input className="input text-xs" placeholder="Reps" value={ex.reps} onChange={e => updateExercise(i, 'reps', e.target.value)} />
                          <input className="input text-xs" placeholder="Weight" value={ex.weight} onChange={e => updateExercise(i, 'weight', e.target.value)} />
                          <input className="input text-xs" placeholder="Rest" value={ex.rest} onChange={e => updateExercise(i, 'rest', e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addExerciseRow} className="text-sky-600 text-xs font-medium mt-2 hover:underline">+ Add exercise</button>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="btn-primary text-xs py-1.5" disabled={saving}>{saving ? 'Saving...' : 'Save workout'}</button>
                  <button type="button" className="btn-secondary text-xs py-1.5" onClick={() => setShowAddWorkout(false)}>Cancel</button>
                </div>
              </form>
            )}

            {(workoutsByDate[selectedDay] ?? []).length === 0 && !showAddWorkout && !showPasteDay && !showPasteWeek && (
              <p className="text-sm text-slate-400 text-center py-4">No workouts scheduled.</p>
            )}

            <div className="space-y-3">
              {(workoutsByDate[selectedDay] ?? []).map((w: any) => (
                <div
                  key={w.id}
                  className={`rounded-xl border p-3 cursor-pointer transition-colors ${selectedWorkout?.id === w.id ? 'border-sky-300 bg-sky-50' : 'border-slate-200 hover:border-sky-200'}`}
                  onClick={() => setSelectedWorkout(selectedWorkout?.id === w.id ? null : w)}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-800 text-sm">{w.title}</p>
                    <button onClick={e => { e.stopPropagation(); deleteWorkout(w.id) }} className="text-red-400 hover:text-red-600 text-xs ml-2">✕</button>
                  </div>
                  {w.notes && <p className="text-xs text-slate-400 mt-0.5">{w.notes}</p>}
                  <p className="text-xs text-sky-600 mt-1 font-medium">{w.exercises?.length ?? 0} exercises {selectedWorkout?.id === w.id ? '▲' : '▼'}</p>
                  {selectedWorkout?.id === w.id && w.exercises?.length > 0 && (
                    <div className="mt-3 border-t border-slate-200 pt-3 space-y-2">
                      {w.exercises.sort((a: any, b: any) => a.order_index - b.order_index).map((ex: any) => (
                        <div key={ex.id} className="flex items-start justify-between text-xs gap-2">
                          <span className="font-medium text-slate-700">{ex.name}</span>
                          <span className="text-slate-400 text-right flex-shrink-0">
                            {[ex.sets && `${ex.sets}×`, ex.reps, ex.weight].filter(Boolean).join(' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
