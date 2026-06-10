'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const [coaches, setCoaches] = useState<any[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      const ADMIN_EMAIL = process.env.NEXT_PUBLIC_COACH_EMAIL || 'raikeschristopher@gmail.com'
      if (!user || user.email !== ADMIN_EMAIL) { router.push('/coach'); return }
      setIsAdmin(true)
      loadCoaches()
    }
    init()
  }, [])

  async function loadCoaches() {
    const { data } = await supabase.from('profiles').select('id, full_name, email, role').eq('role', 'coach')
    setCoaches(data ?? [])
  }

  async function createCoach(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/create-coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, full_name: name, password })
    })

    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }

    setSuccess(`Coach ${name} created successfully!`)
    setName(''); setEmail(''); setPassword('')
    loadCoaches()
    setLoading(false)
  }

  if (!isAdmin) return null

  return (
    <div className="max-w-2xl">
      <h1 className="page-title mb-2">Admin</h1>
      <p className="text-slate-500 text-sm mb-8">Manage coach accounts</p>

      <div className="card mb-8">
        <h2 className="section-title mb-4">Add a new coach</h2>
        <form onSubmit={createCoach} className="space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input" placeholder="David Carver" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" placeholder="coach@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input className="input" type="password" placeholder="They can change this later" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          {success && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">✓ {success}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create coach account'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 className="section-title mb-4">Current coaches</h2>
        {coaches.length === 0 ? (
          <p className="text-slate-400 text-sm">No additional coaches yet.</p>
        ) : (
          <div className="space-y-2">
            {coaches.map(c => (
              <div key={c.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white font-semibold text-sm">
                  {c.full_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{c.full_name}</p>
                  <p className="text-xs text-slate-400">{c.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
