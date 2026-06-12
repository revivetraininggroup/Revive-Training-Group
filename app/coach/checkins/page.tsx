'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function CheckinsPage() {
  const [checkins, setCheckins] = useState<any[]>([])
  const [filter, setFilter] = useState<'all' | 'pending'>('pending')
  const [feedback, setFeedback] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Get only this coach's client IDs
    const { data: myClients } = await supabase.from('clients').select('id').eq('coach_id', user.id)
    const clientIds = myClients?.map(c => c.id) ?? []
    if (clientIds.length === 0) { setCheckins([]); return }

    const q = supabase.from('checkins').select('*, client:profiles(full_name, email)').in('client_id', clientIds).order('submitted_at', { ascending: false })
    const { data } = filter === 'pending' ? await q.is('coach_feedback', null) : await q
    setCheckins(data ?? [])
  }

  useEffect(() => { load() }, [filter])

  async function saveFeedback(id: string) {
    setSaving(id)
    await supabase.from('checkins').update({ coach_feedback: feedback[id] }).eq('id', id)
    setSaving(null)
    load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Check-ins</h1>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(['pending', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {f === 'pending' ? '⏳ Pending' : '📋 All'}
            </button>
          ))}
        </div>
      </div>

      {checkins.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-slate-600 font-medium">{filter === 'pending' ? 'All caught up!' : 'No check-ins yet'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {checkins.map(c => (
            <div key={c.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-semibold text-slate-800">{c.client?.full_name}</p>
                  <p className="text-xs text-slate-400">{c.client?.email} · Week of {c.week_start}</p>
                </div>
                {c.coach_feedback ? <span className="badge badge-green">Reviewed ✓</span> : <span className="badge badge-amber">Needs feedback</span>}
              </div>

              <div className="grid grid-cols-5 gap-1 mb-4">
                {[
                  ['Energy', c.energy_level, '⚡'],
                  ['Sleep', c.sleep_quality, '😴'],
                  ['Stress', c.stress_level, '🧠'],
                  ['Nutrition', c.nutrition_adherence, '🥗'],
                  ['Workouts', c.workout_adherence, '💪'],
                ].map(([label, val, emoji]) => (
                  <div key={label as string} className="text-center">
                    <p className="text-lg mb-1">{emoji}</p>
                    <p className="text-xs text-slate-400 mb-1">{label}</p>
                    <div className="rating-bar mb-1"><div className="rating-fill" style={{ width: `${(val as number) * 10}%` }} /></div>
                    <p className="text-xs font-semibold text-slate-700">{val}/10</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {c.wins && <div className="bg-sky-50 rounded-lg p-2"><p className="text-xs font-medium text-green-700 mb-1">Wins 🎉</p><p className="text-xs text-sky-600">{c.wins}</p></div>}
                {c.struggles && <div className="bg-amber-50 rounded-lg p-2"><p className="text-xs font-medium text-amber-700 mb-1">Struggles 😤</p><p className="text-xs text-amber-600">{c.struggles}</p></div>}
                {c.questions && <div className="bg-blue-50 rounded-lg p-2"><p className="text-xs font-medium text-blue-700 mb-1">Questions ❓</p><p className="text-xs text-blue-600">{c.questions}</p></div>}
              </div>

              {c.coach_feedback ? (
                <div className="bg-sky-50 px-3 py-2 rounded-lg text-sm text-sky-800">
                  <span className="font-medium">Your feedback:</span> {c.coach_feedback}
                </div>
              ) : (
                <div>
                  <label className="label">Your feedback</label>
                  <textarea
                    className="input"
                    rows={2}
                    placeholder="Great week! Keep pushing on..."
                    value={feedback[c.id] || ''}
                    onChange={e => setFeedback({ ...feedback, [c.id]: e.target.value })}
                  />
                  <button
                    className="btn-primary mt-2 text-sm"
                    onClick={() => saveFeedback(c.id)}
                    disabled={saving === c.id || !feedback[c.id]}
                  >
                    {saving === c.id ? 'Saving...' : 'Send feedback'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
