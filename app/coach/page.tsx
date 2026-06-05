import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function CoachDashboard() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const adminSupabase = createAdminSupabaseClient()
  const { data: profile } = await adminSupabase.from('profiles').select('*').eq('id', user.id).single()
  if (profile?.role !== 'coach') redirect('/client/dashboard')

  const [{ count: clientCount }, { data: recentCheckins }, { data: recentLogs }] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('coach_id', user.id).eq('active', true),
    supabase.from('checkins').select('*, client:profiles!client_id(full_name)').order('submitted_at', { ascending: false }).limit(5),
    supabase.from('workout_logs').select('*, client:profiles!client_id(full_name)').order('logged_at', { ascending: false }).limit(5),
  ])

  const today = new Date()
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div>
      <div className="mb-8">
        <h1 className="page-title">{greeting}, Coach 👋</h1>
        <p className="text-slate-500 mt-1">{today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="stat-card">
          <span className="stat-label">Active Clients</span>
          <span className="stat-value">{clientCount ?? 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Check-ins This Week</span>
          <span className="stat-value">{recentCheckins?.length ?? 0}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Workouts Logged</span>
          <span className="stat-value">{recentLogs?.length ?? 0}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Recent check-ins</h2>
            <Link href="/coach/checkins" className="text-sm text-sky-600 hover:underline">View all</Link>
          </div>
          {recentCheckins && recentCheckins.length > 0 ? (
            <div className="space-y-3">
              {recentCheckins.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{c.client?.full_name}</p>
                    <p className="text-xs text-slate-400">{new Date(c.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {c.coach_feedback ? (
                      <span className="badge badge-green">Reviewed</span>
                    ) : (
                      <span className="badge badge-amber">Needs review</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No check-ins yet.</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">Recent workouts logged</h2>
            <Link href="/coach/clients" className="text-sm text-sky-600 hover:underline">View clients</Link>
          </div>
          {recentLogs && recentLogs.length > 0 ? (
            <div className="space-y-3">
              {recentLogs.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{log.client?.full_name}</p>
                    <p className="text-xs text-slate-400">{new Date(log.logged_at).toLocaleDateString()}</p>
                  </div>
                  <span className="badge badge-green">Completed ✓</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No workout logs yet.</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Link href="/coach/clients" className="card hover:border-sky-300 transition-colors cursor-pointer group">
          <div className="text-2xl mb-2">👥</div>
          <p className="font-medium text-slate-800 group-hover:text-sky-700">Manage clients</p>
          <p className="text-sm text-slate-400 mt-0.5">Add, view, and edit client profiles</p>
        </Link>
        <Link href="/coach/programs" className="card hover:border-sky-300 transition-colors cursor-pointer group">
          <div className="text-2xl mb-2">📋</div>
          <p className="font-medium text-slate-800 group-hover:text-sky-700">Build programs</p>
          <p className="text-sm text-slate-400 mt-0.5">Create and assign workout programs</p>
        </Link>
        <Link href="/coach/messages" className="card hover:border-sky-300 transition-colors cursor-pointer group">
          <div className="text-2xl mb-2">💬</div>
          <p className="font-medium text-slate-800 group-hover:text-sky-700">Messages</p>
          <p className="text-sm text-slate-400 mt-0.5">Chat with your clients</p>
        </Link>
      </div>
    </div>
  )
}
