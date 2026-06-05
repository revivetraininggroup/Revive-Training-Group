'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ email: '', full_name: '', goal: '', notes: '' })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function loadClients() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('clients')
      .select('*, profile:profiles!id(full_name, email, created_at)')
      .eq('coach_id', user!.id)
      .order('start_date', { ascending: false })
    setClients(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadClients() }, [])

  async function addClient(e: React.FormEvent) {
    e.preventDefault()
    setAdding(true)
    setError('')

    // Create auth user for client
    const res = await fetch('/api/create-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const result = await res.json()

    if (!res.ok) {
      setError(result.error || 'Failed to create client')
      setAdding(false)
      return
    }

    setShowAdd(false)
    setForm({ email: '', full_name: '', goal: '', notes: '' })
    loadClients()
    setAdding(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-title">Clients</h1>
        <button className="btn-primary" onClick={() => setShowAdd(true)}>+ Add client</button>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="card w-full max-w-md shadow-xl">
            <h2 className="section-title mb-4">Add new client</h2>
            <form onSubmit={addClient} className="space-y-3">
              <div>
                <label className="label">Full name</label>
                <input className="input" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div>
                <label className="label">Goal</label>
                <input className="input" placeholder="e.g. Lose 20 lbs, build muscle" value={form.goal} onChange={e => setForm({...form, goal: e.target.value})} />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <p className="text-xs text-slate-500">The client will receive an email to set their password.</p>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary" disabled={adding}>{adding ? 'Adding...' : 'Add client'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-400">Loading...</p>
      ) : clients.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-slate-600 font-medium">No clients yet</p>
          <p className="text-slate-400 text-sm mt-1">Add your first client to get started</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="table-header">Client</th>
                <th className="table-header">Goal</th>
                <th className="table-header">Start date</th>
                <th className="table-header">Status</th>
                <th className="table-header"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id} className="table-row">
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-semibold text-sm">
                        {client.profile?.full_name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{client.profile?.full_name}</p>
                        <p className="text-xs text-slate-400">{client.profile?.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell text-slate-500">{client.goal || '—'}</td>
                  <td className="table-cell text-slate-500">{client.start_date}</td>
                  <td className="table-cell">
                    <span className={client.active ? 'badge badge-green' : 'badge badge-gray'}>
                      {client.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <Link href={`/coach/clients/${client.id}`} className="text-sky-600 text-sm hover:underline">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
