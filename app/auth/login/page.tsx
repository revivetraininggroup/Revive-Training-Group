'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check if coach by email
    const COACH_EMAIL = process.env.NEXT_PUBLIC_COACH_EMAIL || 'raikeschristopher@gmail.com'
    if (data.user.email === COACH_EMAIL) {
      router.push('/coach')
    } else {
      router.push('/client/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/rtg-logo.png" alt="Revive Training Group" className="h-16 mx-auto" />
        </div>

        <div className="card shadow-sm">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-4">
          New client?{' '}
          <a href="/auth/register" className="text-sky-600 font-medium hover:underline">
            Create account
          </a>
        </p>
      </div>
    </div>
  )
}
