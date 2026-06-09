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

    const COACH_EMAIL = process.env.NEXT_PUBLIC_COACH_EMAIL || 'raikeschristopher@gmail.com'
    if (data.user.email === COACH_EMAIL) {
      router.push('/coach')
    } else {
      router.push('/client/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a2e4a' }}>
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <img src="/rtg-logo-dark.png" alt="Revive Training Group" className="h-44 mx-auto" />
        </div>

        <div className="rounded-2xl p-8" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-1.5">Email</label>
              <input
                className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-blue-300 outline-none focus:ring-2 focus:ring-blue-400"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-100 mb-1.5">Password</label>
              <input
                className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-blue-300 outline-none focus:ring-2 focus:ring-blue-400"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-300 bg-red-900/40 px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: '#4a7fd4' }}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-blue-300 mt-6">
          New client?{' '}
          <a href="/auth/register" className="text-white font-medium hover:underline">
            Create account
          </a>
        </p>
      </div>
    </div>
  )
}
