'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function ClientNutritionPage() {
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: p } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('client_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      setPlan(p)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="text-slate-400 text-sm">Loading...</div>

  return (
    <div>
      <h1 className="page-title mb-1">My Nutrition</h1>
      <p className="text-slate-400 text-sm mb-6">Plan from your coach</p>

      {!plan || !plan.content ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">🥗</p>
          <p className="text-slate-600 font-semibold">No nutrition plan yet</p>
          <p className="text-slate-400 text-sm mt-1">Your coach will add your plan soon</p>
        </div>
      ) : (
        <div className="card">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="section-title">{plan.title}</h2>
              {plan.updated_at && (
                <p className="text-xs text-slate-400 mt-0.5">
                  Updated {new Date(plan.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
            </div>
            <span className="badge badge-blue">Active</span>
          </div>
          <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">{plan.content}</pre>
        </div>
      )}
    </div>
  )
}
