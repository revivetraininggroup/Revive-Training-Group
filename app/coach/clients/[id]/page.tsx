'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import WeightGraph from '@/components/WeightGraph'

export default function ClientDetailPage() {
  const { id } = useParams()
  const [client, setClient] = useState<any>(null)
  const [checkins, setCheckins] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [onboarding, setOnboarding] = useState<any>(null)
  const [aiAnalysis, setAiAnalysis] = useState<string>('')
  const [notes, setNotes] = useState<any[]>([])
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [tab, setTab] = useState<'overview' | 'checkins' | 'stats' | 'logs' | 'onboarding' | 'notes'>('overview')
  const [showProfile, setShowProfile] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', goal: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [statForm, setStatForm] = useState({ weight_lbs: '', body_fat_pct: '', notes: '', logged_at: new Date().toISOString().split('T')[0] })
  const [savingStat, setSavingStat] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/login'); return }

      const [{ data: clientData }, { data: profileData }, { data: ci }, { data: s }, { data: l }] = await Promise.all([
        supabase.from('clients').select('*').eq('id', id).single(),
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase.from('checkins').select('*, client:profiles(full_name, email)').eq('client_id', id).order('submitted_at', { ascending: false }),
        supabase.from('body_stats').select('*').eq('client_id', id).order('logged_at', { ascending: false }),
        supabase.from('calendar_workout_logs').select('*, workout:calendar_workouts(title, scheduled_date)').eq('client_id', id).order('logged_at', { ascending: false }),
      ])

      // Verify this coach owns this client
      const ADMIN_EMAIL = process.env.NEXT_PUBLIC_COACH_EMAIL || 'raikeschristopher@gmail.com'
      if (clientData && user.email !== ADMIN_EMAIL && clientData.coach_id !== user.id) {
        router.push('/coach/clients')
        return
      }

      const { data: ob } = await supabase.from('client_onboarding').select('*').eq('client_id', id).maybeSingle()
      const { data: coachNotes } = await supabase.from('coach_notes').select('*').eq('client_id', id).eq('coach_id', user.id).order('created_at', { ascending: false })
      const c = clientData ? { ...clientData, profile: profileData } : null
      setClient(c); setCheckins(ci ?? []); setStats(s ?? []); setLogs(l ?? []); setOnboarding(ob ?? null); setNotes(coachNotes ?? [])

      // Auto-run AI analysis
      if (clientData && (ci?.length || s?.length || l?.length)) {
        setLoadingAnalysis(true)
        try {
          const res = await fetch('/api/client-analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client: { ...clientData, profile: profileData },
              checkins: ci ?? [],
              stats: s ?? [],
              logs: l ?? [],
            })
          })
          const data = await res.json()
          setAiAnalysis(data.analysis)
        } catch {}
        setLoadingAnalysis(false)
      }
    }
    load()
  }, [id])

  useEffect(() => {
    if (client) setEditForm({ full_name: client.profile?.full_name ?? '', goal: client.goal ?? '', notes: client.notes ?? '' })
  }, [client])

  async function saveNote() {
    if (!newNote.trim()) return
    setSavingNote(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('coach_notes').insert({
      client_id: id,
      coach_id: user.id,
      content: newNote.trim(),
    })
    setNewNote('')
    const { data } = await supabase.from('coach_notes').select('*').eq('client_id', id).eq('coach_id', user.id).order('created_at', { ascending: false })
    setNotes(data ?? [])
    setSavingNote(false)
  }

  async function deleteNote(noteId: string) {
    await supabase.from('coach_notes').delete().eq('id', noteId)
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }

  async function logStat(e: React.FormEvent) {
    e.preventDefault()
    setSavingStat(true)
    await supabase.from('body_stats').insert({
      client_id: id,
      weight_lbs: statForm.weight_lbs ? parseFloat(statForm.weight_lbs) : null,
      body_fat_pct: statForm.body_fat_pct ? parseFloat(statForm.body_fat_pct) : null,
      notes: statForm.notes || null,
      logged_at: statForm.logged_at,
    })
    setStatForm({ weight_lbs: '', body_fat_pct: '', notes: '', logged_at: new Date().toISOString().split('T')[0] })
    const { data: s } = await supabase.from('body_stats').select('*').eq('client_id', id).order('logged_at', { ascending: false })
    setStats(s ?? [])
    setSavingStat(false)
  }

  async function saveEdit() {
    await supabase.from('profiles').update({ full_name: editForm.full_name }).eq('id', id)
    await supabase.from('clients').update({ goal: editForm.goal, notes: editForm.notes }).eq('id', id)
    setSaving(false)
    setShowProfile(false)
    setClient((c: any) => ({ ...c, goal: editForm.goal, notes: editForm.notes, profile: { ...c.profile, full_name: editForm.full_name } }))
  }

  async function deleteClient() {
    setDeleting(true)
    await supabase.from('clients').delete().eq('id', id)
    await supabase.from('profiles').delete().eq('id', id)
    router.push('/coach/clients')
  }

  if (!client) return <div className="text-slate-400">Loading...</div>

  const tabs = ['overview', 'checkins', 'stats', 'logs', 'onboarding', 'notes'] as const

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/coach/clients" className="text-slate-400 hover:text-slate-600 text-sm">Clients</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 text-sm font-medium">{client.profile?.full_name}</span>
      </div>

      <div className="card mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-xl">
            {client.profile?.full_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">{client.profile?.full_name}</h1>
            <p className="text-slate-400 text-sm">{client.profile?.email}</p>
            {client.goal && <p className="text-slate-600 text-sm mt-0.5">Goal: {client.goal}</p>}
          </div>
          <div className="ml-auto flex gap-2">
            <Link href={`/coach/clients/${id}/calendar`} className="btn-primary">Training calendar</Link>
            <Link href={`/coach/clients/${id}/nutrition`} className="btn-secondary">Nutrition plan</Link>
            <Link href={`/coach/clients/${id}/photos`} className="btn-secondary">Photos</Link>
            <Link href={`/coach/messages?client=${id}`} className="btn-secondary">Message</Link>
            <button onClick={() => setShowProfile(true)} className="btn-secondary">⚙️ Edit profile</button>
          </div>
        </div>
        {client.notes && <p className="mt-3 text-sm text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">{client.notes}</p>}
      </div>

      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="stat-card"><span className="stat-label">Check-ins</span><span className="stat-value">{checkins.length}</span></div>
            <div className="stat-card"><span className="stat-label">Workouts logged</span><span className="stat-value">{logs.length}</span></div>
            <div className="stat-card">
              <span className="stat-label">Current weight</span>
              <span className="stat-value">{stats[0]?.weight_lbs ? `${stats[0].weight_lbs} lbs` : '—'}</span>
            </div>
          </div>

          <div className="card" style={{ borderLeft: '3px solid #0ea5e9' }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sky-600 text-sm font-semibold">✦ AI Performance Analysis</span>
              {loadingAnalysis && <span className="text-xs text-slate-400 animate-pulse">Analyzing...</span>}
            </div>
            {loadingAnalysis ? (
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 rounded animate-pulse w-full" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-5/6" />
                <div className="h-3 bg-slate-100 rounded animate-pulse w-4/6" />
              </div>
            ) : aiAnalysis ? (
              <div className="space-y-3">
                {aiAnalysis.split('\n\n').map((section, i) => {
                  const lines = section.trim().split('\n')
                  const heading = lines[0]
                  const body = lines.slice(1)
                  if (!heading) return null
                  return (
                    <div key={i}>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{heading}</p>
                      {body.map((line, j) => (
                        <p key={j} className={`text-sm text-slate-700 ${line.startsWith('-') ? 'ml-2' : ''}`}>
                          {line.startsWith('-') ? '• ' + line.slice(1).trim() : line}
                        </p>
                      ))}
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No data yet -- analysis will appear once the client has check-ins or logged workouts.</p>
            )}
          </div>
        </div>
      )}

      {tab === 'checkins' && (
        <div className="space-y-3">
          {checkins.length === 0 ? <p className="text-slate-400 text-sm">No check-ins yet.</p> : checkins.map(c => (
            <div key={c.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-slate-800">Week of {c.week_start}</p>
                {c.coach_feedback ? <span className="badge badge-green">Reviewed</span> : <span className="badge badge-amber">Pending</span>}
              </div>
              <div className="grid grid-cols-5 gap-1 mb-3">
                {[['Energy', c.energy_level], ['Sleep', c.sleep_quality], ['Stress', c.stress_level], ['Nutrition', c.nutrition_adherence], ['Workouts', c.workout_adherence]].map(([label, val]) => (
                  <div key={label as string}>
                    <p className="text-xs text-slate-400 mb-1">{label}</p>
                    <div className="rating-bar"><div className="rating-fill" style={{ width: `${(val as number) * 10}%` }} /></div>
                    <p className="text-xs font-medium text-slate-600 mt-1">{val}/10</p>
                  </div>
                ))}
              </div>
              {c.wins && <p className="text-sm text-slate-600"><span className="font-medium">Wins:</span> {c.wins}</p>}
              {c.struggles && <p className="text-sm text-slate-600 mt-1"><span className="font-medium">Struggles:</span> {c.struggles}</p>}
              {!c.coach_feedback && (
                <CoachFeedbackForm checkinId={c.id} onSave={() => { /* reload */ }} />
              )}
              {c.coach_feedback && (
                <div className="mt-2 bg-sky-50 px-3 py-2 rounded-lg text-sm text-sky-800">
                  <span className="font-medium">Your feedback:</span> {c.coach_feedback}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'stats' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="section-title mb-4">Weight over time</h2>
            <WeightGraph stats={stats} />
          </div>
          <div className="card">
            <h2 className="section-title mb-3">Add entry</h2>
            <form onSubmit={logStat} className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="label">Date</label>
                <input className="input" type="date" value={statForm.logged_at} onChange={e => setStatForm({...statForm, logged_at: e.target.value})} />
              </div>
              <div>
                <label className="label">Weight (lbs)</label>
                <input className="input" type="number" step="0.1" placeholder="185.5" value={statForm.weight_lbs} onChange={e => setStatForm({...statForm, weight_lbs: e.target.value})} />
              </div>
              <div>
                <label className="label">Body fat % (optional)</label>
                <input className="input" type="number" step="0.1" placeholder="18.5" value={statForm.body_fat_pct} onChange={e => setStatForm({...statForm, body_fat_pct: e.target.value})} />
              </div>
              <div>
                <button type="submit" className="btn-primary w-full" disabled={savingStat}>
                  {savingStat ? 'Saving...' : '+ Add entry'}
                </button>
              </div>
            </form>
          </div>
          <div className="card p-0 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Weight (lbs)</th>
                  <th className="table-header">Body fat %</th>
                  <th className="table-header">Notes</th>
                </tr>
              </thead>
              <tbody>
                {stats.length === 0 ? (
                  <tr><td colSpan={4} className="table-cell text-slate-400 text-center py-8">No stats logged yet.</td></tr>
                ) : stats.map(s => (
                  <tr key={s.id} className="table-row">
                    <td className="table-cell">{s.logged_at}</td>
                    <td className="table-cell">{s.weight_lbs ?? '—'}</td>
                    <td className="table-cell">{s.body_fat_pct ? `${s.body_fat_pct}%` : '—'}</td>
                    <td className="table-cell text-slate-400">{s.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'onboarding' && (
        <div>
          {!onboarding ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-slate-600 font-medium">No onboarding form submitted yet</p>
              <p className="text-slate-400 text-sm mt-1">Your client will see this form in their app under "My Profile"</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">Last updated: {new Date(onboarding.updated_at).toLocaleDateString()}</p>

              {(onboarding.injuries || onboarding.physical_limitations) && (
                <div className="card">
                  <h3 className="section-title mb-3">🩹 Injuries & Limitations</h3>
                  {onboarding.injuries && <InfoRow label="Injuries" value={onboarding.injuries} />}
                  {onboarding.physical_limitations && <InfoRow label="Limitations" value={onboarding.physical_limitations} />}
                </div>
              )}

              {(onboarding.training_experience || onboarding.equipment_access || onboarding.equipment_details) && (
                <div className="card">
                  <h3 className="section-title mb-3">🏋️ Training & Equipment</h3>
                  {onboarding.training_experience && <InfoRow label="Experience" value={onboarding.training_experience} />}
                  {onboarding.equipment_access && <InfoRow label="Equipment" value={onboarding.equipment_access} />}
                  {onboarding.equipment_details && <InfoRow label="Details" value={onboarding.equipment_details} />}
                </div>
              )}

              {(onboarding.days_per_week || onboarding.preferred_days || onboarding.session_duration || onboarding.best_time_to_train) && (
                <div className="card">
                  <h3 className="section-title mb-3">📅 Schedule</h3>
                  {onboarding.days_per_week && <InfoRow label="Days/week" value={`${onboarding.days_per_week} days`} />}
                  {onboarding.preferred_days && <InfoRow label="Preferred days" value={onboarding.preferred_days} />}
                  {onboarding.session_duration && <InfoRow label="Session length" value={onboarding.session_duration} />}
                  {onboarding.best_time_to_train && <InfoRow label="Best time" value={onboarding.best_time_to_train} />}
                </div>
              )}

              {(onboarding.job_type || onboarding.avg_sleep_hours || onboarding.stress_level || onboarding.water_intake) && (
                <div className="card">
                  <h3 className="section-title mb-3">🌙 Lifestyle</h3>
                  {onboarding.job_type && <InfoRow label="Job type" value={onboarding.job_type} />}
                  {onboarding.avg_sleep_hours && <InfoRow label="Sleep" value={`${onboarding.avg_sleep_hours} hrs/night`} />}
                  {onboarding.stress_level && <InfoRow label="Stress level" value={onboarding.stress_level} />}
                  {onboarding.water_intake && <InfoRow label="Water intake" value={onboarding.water_intake} />}
                </div>
              )}

              {(onboarding.meals_per_day || onboarding.dietary_restrictions || onboarding.current_supplements || onboarding.nutrition_experience) && (
                <div className="card">
                  <h3 className="section-title mb-3">🥗 Nutrition & Supplements</h3>
                  {onboarding.meals_per_day && <InfoRow label="Meals/day" value={onboarding.meals_per_day} />}
                  {onboarding.dietary_restrictions && <InfoRow label="Dietary restrictions" value={onboarding.dietary_restrictions} />}
                  {onboarding.current_supplements && <InfoRow label="Supplements" value={onboarding.current_supplements} />}
                  {onboarding.nutrition_experience && <InfoRow label="Nutrition tracking" value={onboarding.nutrition_experience} />}
                </div>
              )}

              {onboarding.additional_notes && (
                <div className="card">
                  <h3 className="section-title mb-3">💬 Additional Notes</h3>
                  <p className="text-sm text-slate-600">{onboarding.additional_notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-2">
          {logs.length === 0 ? <p className="text-slate-400 text-sm">No workouts logged yet.</p> : logs.map(l => (
            <div key={l.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{l.workout?.title ?? 'Workout'}</p>
                <p className="text-xs text-slate-400">
                  {l.workout?.scheduled_date && <span>Scheduled: {l.workout.scheduled_date} · </span>}
                  Logged: {new Date(l.logged_at).toLocaleDateString()}
                  {l.duration_minutes && <span> · {l.duration_minutes} min</span>}
                </p>
                {l.notes && <p className="text-sm text-slate-500 mt-0.5">{l.notes}</p>}
              </div>
              <span className="badge badge-green">Completed ✓</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'notes' && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="section-title mb-3">Add a note</h2>
            <textarea
              className="input w-full mb-3"
              rows={4}
              placeholder="Write a note about this client's progress, program changes, conversations, anything relevant..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
            />
            <button
              onClick={saveNote}
              disabled={savingNote || !newNote.trim()}
              className="btn-primary"
            >
              {savingNote ? 'Saving...' : 'Save note'}
            </button>
          </div>

          <div className="space-y-3">
            {notes.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No notes yet. Add your first note above.</p>
            ) : notes.map(n => (
              <div key={n.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-slate-400 mb-1.5">
                      {new Date(n.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      {' · '}
                      {new Date(n.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                  </div>
                  <button
                    onClick={() => deleteNote(n.id)}
                    className="text-slate-300 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-md shadow-xl">
            <h2 className="section-title mb-4">Edit client profile</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Full name</label>
                <input className="input" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Goal</label>
                <input className="input" placeholder="e.g. Lose 20 lbs, build muscle" value={editForm.goal} onChange={e => setEditForm({ ...editForm, goal: e.target.value })} />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={3} value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
              >
                🗑 Delete client
              </button>
              <div className="flex gap-2">
                <button onClick={() => setShowProfile(false)} className="btn-secondary">Cancel</button>
                <button onClick={saveEdit} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-sm shadow-xl text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Delete {client.profile?.full_name}?</h2>
            <p className="text-sm text-slate-500 mb-6">This will permanently delete this client and all their data. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-secondary flex-1">Cancel</button>
              <button
                onClick={deleteClient}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function CoachFeedbackForm({ checkinId, onSave }: { checkinId: string, onSave: () => void }) {
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function save() {
    setSaving(true)
    await supabase.from('checkins').update({ coach_feedback: feedback }).eq('id', checkinId)
    onSave()
    setSaving(false)
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <label className="label">Your feedback</label>
      <textarea className="input" rows={2} placeholder="Write your feedback for this client..." value={feedback} onChange={e => setFeedback(e.target.value)} />
      <button className="btn-primary mt-2 text-xs" onClick={save} disabled={saving || !feedback}>{saving ? 'Saving...' : 'Send feedback'}</button>
    </div>
  )
}


function InfoRow({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex gap-3 py-1.5 border-b border-slate-50 last:border-0">
      <span className="text-xs font-medium text-slate-400 w-36 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-700">{value}</span>
    </div>
  )
}
