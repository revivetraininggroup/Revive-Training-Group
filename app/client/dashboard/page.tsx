'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'

export default function ClientDashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [program, setProgram] = useState<any>(null)
  const [latestCheckin, setLatestCheckin] = useState<any>(null)
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const [{ data: p }, { data: prog }, { data: ci }, { data: logs }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user!.id).single(),
        supabase.from('programs').select('*, workouts(*)').eq('client_id', user!.id).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('checkins').select('*').eq('client_id', user!.id).order('submitted_at', { ascending: false }).limit(1).single(),
        supabase.from('workout_logs').select('*').eq('client_id', user!.id).order('logged_at', { ascending: false }).limit(5),
      ])
      setProfile(p); setProgram(prog); setLatestCheckin(ci); setRecentLogs(logs ?? [])
    }
    load()
  }, [])

  const today = new Date()
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">{greeting}, {profile?.full_name?.split(' ')[0]} 👋</h1>
        <p className="text-slate-500 mt-1">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <span className="stat-label">Workouts logged</span>
          <span className="stat-value">{recentLogs.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Current program</span>
          <span className="stat-value text-base truncate">{program?.title || 'None yet'}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Last check-in</span>
          <span className="stat-value text-base">{latestCheckin ? new Date(latestCheckin.submitted_at).toLocaleDateString() : 'None yet'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {program ? (
          <div className="card">
            <h2 className="section-title mb-1">Your program</h2>
            <p className="text-slate-500 text-sm mb-4">{program.title}</p>
            <p className="text-sm text-slate-400">{program.workouts?.length ?? 0} workouts assigned</p>
            <Link href="/client/workouts" className="btn-primary inline-block mt-3 text-center">View workouts →</Link>
          </div>
        ) : (
          <div className="card text-center py-8">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-slate-600 font-medium">No program yet</p>
            <p className="text-slate-400 text-sm">Your coach will assign one soon</p>
          </div>
        )}

        <div className="card">
          <h2 className="section-title mb-4">Quick actions</h2>
          <div className="space-y-2">
            <Link href="/client/workouts" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
              <span className="text-xl">🏋️</span>
              <div>
                <p className="text-sm font-medium text-slate-800">Log a workout</p>
                <p className="text-xs text-slate-400">Record today's session</p>
              </div>
            </Link>
            <Link href="/client/checkins" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
              <span className="text-xl">✅</span>
              <div>
                <p className="text-sm font-medium text-slate-800">Weekly check-in</p>
                <p className="text-xs text-slate-400">Update your coach</p>
              </div>
            </Link>
            <Link href="/client/stats" className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-slate-100">
              <span className="text-xl">📊</span>
              <div>
                <p className="text-sm font-medium text-slate-800">Log body stats</p>
                <p className="text-xs text-slate-400">Track your progress</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {latestCheckin?.coach_feedback && (
        <div className="card bg-sky-50 border-sky-100">
          <p className="text-xs font-medium text-sky-600 uppercase tracking-wide mb-1">Coach feedback</p>
          <p className="text-slate-700 text-sm">{latestCheckin.coach_feedback}</p>
        </div>
      )}
    </div>
  )
}
