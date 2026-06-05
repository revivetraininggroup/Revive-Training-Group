'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function ClientDetailPage() {
  const { id } = useParams()
  const [client, setClient] = useState<any>(null)
  const [programs, setPrograms] = useState<any[]>([])
  const [checkins, setCheckins] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [tab, setTab] = useState<'overview' | 'programs' | 'checkins' | 'stats' | 'logs'>('overview')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: p }, { data: ci }, { data: s }, { data: l }] = await Promise.all([
        supabase.from('clients').select('*, profile:profiles!id(*)').eq('id', id).single(),
        supabase.from('programs').select('*').eq('client_id', id).order('created_at', { ascending: false }),
        supabase.from('checkins').select('*').eq('client_id', id).order('submitted_at', { ascending: false }),
        supabase.from('body_stats').select('*').eq('client_id', id).order('logged_at', { ascending: false }),
        supabase.from('workout_logs').select('*').eq('client_id', id).order('logged_at', { ascending: false }),
      ])
      setClient(c); setPrograms(p ?? []); setCheckins(ci ?? []); setStats(s ?? []); setLogs(l ?? [])
    }
    load()
  }, [id])

  if (!client) return <div className="text-slate-400">Loading...</div>

  const tabs = ['overview', 'programs', 'checkins', 'stats', 'logs'] as const

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
        <div className="grid grid-cols-2 gap-4">
          <div className="stat-card"><span className="stat-label">Programs</span><span className="stat-value">{programs.length}</span></div>
          <div className="stat-card"><span className="stat-label">Check-ins</span><span className="stat-value">{checkins.length}</span></div>
          <div className="stat-card"><span className="stat-label">Workouts logged</span><span className="stat-value">{logs.length}</span></div>
          <div className="stat-card">
            <span className="stat-label">Current weight</span>
            <span className="stat-value">{stats[0]?.weight_lbs ? `${stats[0].weight_lbs} lbs` : '—'}</span>
          </div>
        </div>
      )}

      {tab === 'programs' && (
        <div className="space-y-3">
          {programs.length === 0 ? <p className="text-slate-400 text-sm">No programs yet.</p> : programs.map(p => (
            <div key={p.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{p.title}</p>
                <p className="text-xs text-slate-400">{p.start_date} → {p.end_date || 'ongoing'}</p>
              </div>
              <Link href={`/coach/programs/${p.id}`} className="btn-secondary text-xs">Edit</Link>
            </div>
          ))}
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
              <div className="grid grid-cols-5 gap-3 mb-3">
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
        <div className="card p-0 overflow-hidden">
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
      )}

      {tab === 'logs' && (
        <div className="space-y-2">
          {logs.length === 0 ? <p className="text-slate-400 text-sm">No workouts logged yet.</p> : logs.map(l => (
            <div key={l.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{new Date(l.logged_at).toLocaleDateString()}</p>
                {l.duration_minutes && <p className="text-xs text-slate-400">{l.duration_minutes} minutes</p>}
                {l.notes && <p className="text-sm text-slate-500 mt-0.5">{l.notes}</p>}
              </div>
              <span className="badge badge-green">Done ✓</span>
            </div>
          ))}
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
