'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function CoachNutritionPage() {
  const { id } = useParams()
  const [client, setClient] = useState<any>(null)
  const [plan, setPlan] = useState<any>(null)
  const [content, setContent] = useState('')
  const [title, setTitle] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function load() {
    const [{ data: c }, { data: p }] = await Promise.all([
      supabase.from('clients').select('*, profile:profiles!id(full_name, email)').eq('id', id).single(),
      supabase.from('nutrition_plans').select('*').eq('client_id', id).order('created_at', { ascending: false }).limit(1).single(),
    ])
    setClient(c)
    if (p) {
      setPlan(p)
      setContent(p.content ?? '')
      setTitle(p.title ?? 'Nutrition Plan')
    } else {
      setEditing(true)
      setTitle('Nutrition Plan')
    }
  }

  useEffect(() => { load() }, [id])

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (plan) {
      await supabase.from('nutrition_plans').update({
        title,
        content,
        updated_at: new Date().toISOString(),
      }).eq('id', plan.id)
    } else {
      const { data: p } = await supabase.from('nutrition_plans').insert({
        client_id: id,
        coach_id: user!.id,
        title,
        content,
      }).select().single()
      setPlan(p)
    }
    setEditing(false)
    setSaving(false)
    load()
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Link href={`/coach/clients/${id}`} className="text-slate-400 hover:text-slate-600 text-sm">{client?.profile?.full_name}</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700 text-sm font-medium">Nutrition Plan</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          {editing ? (
            <input
              className="input text-lg font-semibold w-72"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Plan name..."
            />
          ) : (
            <h1 className="page-title">{plan?.title ?? 'Nutrition Plan'}</h1>
          )}
          <p className="text-slate-400 text-sm mt-1">{client?.profile?.full_name}</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save plan'}</button>
              {plan && <button className="btn-secondary" onClick={() => { setEditing(false); setContent(plan.content ?? ''); setTitle(plan.title) }}>Cancel</button>}
            </>
          ) : (
            <button className="btn-secondary" onClick={() => setEditing(true)}>Edit plan</button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="card">
          <label className="label mb-2">Nutrition plan</label>
          <textarea
            className="input font-mono text-sm leading-relaxed"
            rows={28}
            placeholder={`Paste or type the nutrition plan here...\n\nExample:\nDAILY TARGETS\nCalories: 2,200\nProtein: 180g\nCarbs: 220g\nFats: 70g\n\nBREAKFAST (7:00 AM)\n- 4 egg whites + 2 whole eggs scrambled\n- 1 cup oatmeal with blueberries\n- 1 cup black coffee\n\nMID MORNING SNACK (10:00 AM)\n- Greek yogurt (plain, 0%)\n- 1 banana\n\n...`}
            value={content}
            onChange={e => setContent(e.target.value)}
            style={{ minHeight: '500px', resize: 'vertical' }}
          />
          <p className="text-xs text-slate-400 mt-2">Tip: You can paste directly from Google Docs, Notes, or any other app.</p>
        </div>
      ) : !plan || !content ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">🥗</p>
          <p className="text-slate-600 font-semibold mb-1">No nutrition plan yet</p>
          <p className="text-slate-400 text-sm mb-6">Click Edit plan to add {client?.profile?.full_name}&apos;s nutrition</p>
          <button className="btn-primary" onClick={() => setEditing(true)}>Create nutrition plan</button>
        </div>
      ) : (
        <div className="card">
          <pre className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">{content}</pre>
          {plan?.updated_at && (
            <p className="text-xs text-slate-400 mt-4 pt-4 border-t border-slate-100">
              Last updated {new Date(plan.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
