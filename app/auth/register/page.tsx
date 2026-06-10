'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [step, setStep] = useState<'details' | 'coach'>('details')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedCoach, setSelectedCoach] = useState<any>(null)
  const [coaches, setCoaches] = useState<any[]>([])
  const [loadingCoaches, setLoadingCoaches] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function loadCoaches() {
    setLoadingCoaches(true)
    const { data } = await supabase.from('profiles').select('id, full_name, email').eq('role', 'coach')
    // Also include admin coach
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_COACH_EMAIL || 'raikeschristopher@gmail.com'
    const { data: adminProfile } = await supabase.from('profiles').select('id, full_name, email').eq('email', ADMIN_EMAIL).single()
    const all = [...(data ?? [])]
    if (adminProfile && !all.find(c => c.id === adminProfile.id)) all.unshift(adminProfile)
    setCoaches(all)
    setLoadingCoaches(false)
  }

  function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault()
    loadCoaches()
    setStep('coach')
  }

  async function handleRegister() {
    if (!selectedCoach) return
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, role: 'client', coach_id: selectedCoach.id }
      }
    })

    if (error) { setError(error.message); setLoading(false); return }
    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a2e4a' }}>
        <div className="rounded-2xl p-8 max-w-md w-full mx-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(74,127,212,0.3)' }}>
            <svg className="w-6 h-6 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Check your email</h2>
          <p className="text-blue-200 text-sm">We sent a confirmation link to <strong className="text-white">{email}</strong>. Click it to activate your account.</p>
          <button className="mt-6 px-6 py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: '#4a7fd4' }} onClick={() => router.push('/auth/login')}>
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a2e4a' }}>
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <img src="/rtg-logo-dark.png" alt="Revive Training Group" className="w-full max-w-sm mx-auto" />
        </div>

        <div className="rounded-2xl p-8" style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>

          {step === 'details' && (
            <form onSubmit={handleDetailsSubmit} className="space-y-5">
              <h2 className="text-white font-semibold text-lg mb-1">Create your account</h2>
              <div>
                <label className="block text-sm font-medium text-blue-100 mb-1.5">Full name</label>
                <input className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-blue-300 outline-none focus:ring-2 focus:ring-blue-400"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
                  type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-100 mb-1.5">Email</label>
                <input className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-blue-300 outline-none focus:ring-2 focus:ring-blue-400"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
                  type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-blue-100 mb-1.5">Password</label>
                <input className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-blue-300 outline-none focus:ring-2 focus:ring-blue-400"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}
                  type="password" placeholder="At least 8 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: '#4a7fd4' }}>
                Next: Choose your coach →
              </button>
            </form>
          )}

          {step === 'coach' && (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <button onClick={() => setStep('details')} className="text-blue-300 hover:text-white">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
                </button>
                <h2 className="text-white font-semibold text-lg">Choose your coach</h2>
              </div>

              {loadingCoaches ? (
                <p className="text-blue-300 text-sm text-center py-4">Loading coaches...</p>
              ) : (
                <div className="space-y-2">
                  {coaches.map(coach => (
                    <button
                      key={coach.id}
                      onClick={() => setSelectedCoach(coach)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                      style={{
                        backgroundColor: selectedCoach?.id === coach.id ? 'rgba(74,127,212,0.3)' : 'rgba(255,255,255,0.05)',
                        border: selectedCoach?.id === coach.id ? '1px solid rgba(74,127,212,0.6)' : '1px solid rgba(255,255,255,0.1)'
                      }}
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-sm" style={{ backgroundColor: '#4a7fd4' }}>
                        {coach.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">{coach.full_name}</p>
                        <p className="text-blue-300 text-xs">RTG Coach</p>
                      </div>
                      {selectedCoach?.id === coach.id && (
                        <svg className="ml-auto text-blue-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {error && <p className="text-sm text-red-300 bg-red-900/40 px-3 py-2 rounded-lg">{error}</p>}

              <button
                onClick={handleRegister}
                disabled={!selectedCoach || loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                style={{ backgroundColor: '#4a7fd4' }}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-blue-300 mt-6">
          Already have an account?{' '}
          <a href="/auth/login" className="text-white font-medium hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}
