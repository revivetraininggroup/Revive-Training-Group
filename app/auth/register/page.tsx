'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, role: 'client' }
      }
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100">
        <div className="card max-w-md w-full text-center shadow-sm">
          <div className="w-12 h-12 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="section-title mb-2">Check your email</h2>
          <p className="text-slate-500 text-sm">We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.</p>
          <button className="btn-secondary mt-4" onClick={() => router.push('/auth/login')}>Back to login</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="11" fill="#0c1a2e"/>
              <text x="24" y="35" fontFamily="system-ui, sans-serif" fontSize="28" fontWeight="900" fill="#0ea5e9" textAnchor="middle">R</text>
            </svg>
            <div className="text-left">
              <p className="font-black text-slate-900 tracking-widest text-2xl leading-none">REVIVE</p>
              <p className="text-[10px] text-slate-400 tracking-widest font-medium mt-1">TRAINING GROUP</p>
            </div>
          </div>
        </div>

        <div className="card shadow-sm">
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          Already have an account?{' '}
          <a href="/auth/login" className="text-sky-600 font-medium hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
