'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', client_id: '', start_date: '', end_date: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from('programs').select('*, client:profiles!client_id(full_name)').eq('coach_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('clients').select('*, profile:profiles!id(full_name)').eq('coach_id', user!.id).eq('active', true),
    ])
    setPrograms(p ?? [])
    setClients(c ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function createProgram(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('programs').insert({ ...form, coach_id: user!.id })
    setShowNew(false)
    setForm({ title: '', description: '', client_id: '', start_date: '', end_date: '' })
    load()
    setSaving(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Programs</h1>
        <button className="btn-primary" onClick={() => setShowNew(true)}>+ New program</button>
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card w-full max-w-md shadow-xl">
            <h2 className="section-title mb-4">Create program</h2>
            <form onSubmit={createProgram} className="space-y-3">
              <div>
                <label className="label">Program name</label>
                <input className="input" placeholder="e.g. 8-Week Fat Loss" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              </div>
              <div>
                <label className="label">Assign to client</label>
                <select className="input" value={form.client_id} onChange={e => setForm({...form, client_id: e.target.value})} required>
                  <option value="">Select client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.profile?.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Start date</label>
                  <input className="input" type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
                </div>
                <div>
                  <label className="label">End date</label>
                  <input className="input" type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowNew(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? <p className="text-slate-400">Loading...</p> : (
        <div className="grid gap-4">
          {programs.length === 0 ? (
            <div className="card text-center py-12">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-slate-600 font-medium">No programs yet</p>
              <p className="text-slate-400 text-sm mt-1">Create your first program to get started</p>
            </div>
          ) : programs.map(p => (
            <div key={p.id} className="card flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{p.title}</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  <span className="text-sky-600">{p.client?.full_name}</span>
                  {p.start_date && <span className="text-slate-400"> · {p.start_date} → {p.end_date || 'ongoing'}</span>}
                </p>
                {p.description && <p className="text-sm text-slate-400 mt-1">{p.description}</p>}
              </div>
              <Link href={`/coach/programs/${p.id}`} className="btn-secondary">Edit workouts →</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
