'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ClientStatsPage() {
  const [stats, setStats] = useState<any[]>([])
  const [form, setForm] = useState({ weight_lbs: '', body_fat_pct: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('body_stats').select('*').eq('client_id', user!.id).order('logged_at', { ascending: false })
    setStats(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function logStats(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('body_stats').insert({
      client_id: user!.id,
      weight_lbs: form.weight_lbs ? parseFloat(form.weight_lbs) : null,
      body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
      notes: form.notes || null,
      logged_at: new Date().toISOString().split('T')[0]
    })
    setForm({ weight_lbs: '', body_fat_pct: '', notes: '' })
    load()
    setSaving(false)
  }

  const latest = stats[0]
  const oldest = stats[stats.length - 1]
  const weightChange = latest && oldest && latest.weight_lbs && oldest.weight_lbs
    ? (latest.weight_lbs - oldest.weight_lbs).toFixed(1)
    : null

  return (
    <div>
      <h1 className="page-title mb-6">My Stats</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <span className="stat-label">Current weight</span>
          <span className="stat-value">{latest?.weight_lbs ? `${latest.weight_lbs} lbs` : '—'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Body fat</span>
          <span className="stat-value">{latest?.body_fat_pct ? `${latest.body_fat_pct}%` : '—'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total change</span>
          <span className={`stat-value ${weightChange && parseFloat(weightChange) < 0 ? 'text-sky-600' : weightChange && parseFloat(weightChange) > 0 ? 'text-red-500' : ''}`}>
            {weightChange ? `${parseFloat(weightChange) > 0 ? '+' : ''}${weightChange} lbs` : '—'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h2 className="section-title mb-4">Log today's stats</h2>
          <form onSubmit={logStats} className="space-y-3">
            <div>
              <label className="label">Weight (lbs)</label>
              <input className="input" type="number" step="0.1" placeholder="185.5" value={form.weight_lbs} onChange={e => setForm({...form, weight_lbs: e.target.value})} />
            </div>
            <div>
              <label className="label">Body fat % (optional)</label>
              <input className="input" type="number" step="0.1" placeholder="18.5" value={form.body_fat_pct} onChange={e => setForm({...form, body_fat_pct: e.target.value})} />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input className="input" placeholder="How are you feeling?" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Log stats'}</button>
          </form>
        </div>

        <div className="card p-0 overflow-hidden">
          <p className="px-4 py-3 font-medium text-slate-800 border-b border-slate-100">History</p>
          {stats.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No stats logged yet.</p>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Weight</th>
                  <th className="table-header">BF%</th>
                </tr>
              </thead>
              <tbody>
                {stats.map(s => (
                  <tr key={s.id} className="table-row">
                    <td className="table-cell">{s.logged_at}</td>
                    <td className="table-cell">{s.weight_lbs ? `${s.weight_lbs} lbs` : '—'}</td>
                    <td className="table-cell">{s.body_fat_pct ? `${s.body_fat_pct}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
