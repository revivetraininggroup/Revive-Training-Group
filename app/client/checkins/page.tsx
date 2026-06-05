'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const RATINGS = [
  { key: 'energy_level', label: 'Energy level', emoji: '⚡', desc: '1 = exhausted, 10 = energized' },
  { key: 'sleep_quality', label: 'Sleep quality', emoji: '😴', desc: '1 = terrible, 10 = amazing' },
  { key: 'stress_level', label: 'Stress level', emoji: '🧠', desc: '1 = very stressed, 10 = totally calm' },
  { key: 'nutrition_adherence', label: 'Nutrition adherence', emoji: '🥗', desc: '1 = off track, 10 = on point' },
  { key: 'workout_adherence', label: 'Workout adherence', emoji: '💪', desc: '1 = missed most, 10 = nailed it' },
]

export default function ClientCheckinPage() {
  const [form, setForm] = useState({ energy_level: 7, sleep_quality: 7, stress_level: 7, nutrition_adherence: 7, workout_adherence: 7, wins: '', struggles: '', questions: '' })
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pastCheckins, setPastCheckins] = useState<any[]>([])
  const [tab, setTab] = useState<'new' | 'history'>('new')
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('checkins').select('*').eq('client_id', user!.id).order('submitted_at', { ascending: false })
      setPastCheckins(data ?? [])
    }
    load()
  }, [submitted])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const monday = new Date()
    monday.setDate(monday.getDate() - monday.getDay() + 1)
    const weekStart = monday.toISOString().split('T')[0]

    await supabase.from('checkins').insert({ ...form, client_id: user!.id, week_start: weekStart })
    setSubmitted(true)
    setSaving(false)
  }

  if (submitted) {
    return (
      <div>
        <h1 className="page-title mb-6">Check-in</h1>
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="section-title mb-2">Check-in submitted!</h2>
          <p className="text-slate-500 text-sm">Your coach will review it and leave feedback soon.</p>
          <button className="btn-secondary mt-4" onClick={() => { setSubmitted(false); setTab('history') }}>View past check-ins</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="page-title mb-6">Check-in</h1>

      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-lg w-fit">
        {(['new', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'new' ? '+ New check-in' : '📋 History'}
          </button>
        ))}
      </div>

      {tab === 'new' && (
        <div className="card max-w-2xl">
          <h2 className="section-title mb-1">Weekly check-in</h2>
          <p className="text-slate-400 text-sm mb-6">How did this week go? Be honest — your coach uses this to help you.</p>

          <form onSubmit={submit} className="space-y-6">
            <div className="space-y-4">
              {RATINGS.map(r => (
                <div key={r.key}>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium text-slate-700">{r.emoji} {r.label}</label>
                    <span className="text-sm font-semibold text-sky-600">{(form as any)[r.key]}/10</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-2">{r.desc}</p>
                  <input
                    type="range" min="1" max="10" step="1"
                    value={(form as any)[r.key]}
                    onChange={e => setForm({ ...form, [r.key]: parseInt(e.target.value) })}
                    className="w-full accent-sky-500"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="label">🎉 Wins this week</label>
              <textarea className="input" rows={2} placeholder="What went well? Celebrate it!" value={form.wins} onChange={e => setForm({...form, wins: e.target.value})} />
            </div>
            <div>
              <label className="label">😤 Struggles</label>
              <textarea className="input" rows={2} placeholder="What was hard? What got in the way?" value={form.struggles} onChange={e => setForm({...form, struggles: e.target.value})} />
            </div>
            <div>
              <label className="label">❓ Questions for your coach</label>
              <textarea className="input" rows={2} placeholder="Anything you want to ask your coach?" value={form.questions} onChange={e => setForm({...form, questions: e.target.value})} />
            </div>

            <button type="submit" className="btn-primary w-full" disabled={saving}>{saving ? 'Submitting...' : 'Submit check-in'}</button>
          </form>
        </div>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          {pastCheckins.length === 0 ? (
            <div className="card text-center py-8">
              <p className="text-slate-400">No check-ins yet. Submit your first one!</p>
            </div>
          ) : pastCheckins.map(c => (
            <div key={c.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-slate-800">Week of {c.week_start}</p>
                {c.coach_feedback ? <span className="badge badge-green">Coach responded ✓</span> : <span className="badge badge-amber">Awaiting feedback</span>}
              </div>
              <div className="grid grid-cols-5 gap-3 mb-3">
                {RATINGS.map(r => (
                  <div key={r.key}>
                    <p className="text-xs text-slate-400 mb-1">{r.emoji}</p>
                    <div className="rating-bar"><div className="rating-fill" style={{ width: `${(c as any)[r.key] * 10}%` }} /></div>
                    <p className="text-xs font-medium text-slate-600 mt-1">{(c as any)[r.key]}/10</p>
                  </div>
                ))}
              </div>
              {c.coach_feedback && (
                <div className="bg-sky-50 px-3 py-2 rounded-lg text-sm text-sky-800 mt-2">
                  <span className="font-medium">Coach feedback:</span> {c.coach_feedback}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
