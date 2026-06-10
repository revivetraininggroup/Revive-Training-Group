import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: Request) {
  const { email, full_name, password, goal, notes, coach_id } = await req.json()

  // Verify the caller is a coach
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Must be admin email OR have coach role in profiles
  const ADMIN_EMAIL = process.env.COACH_EMAIL || 'raikeschristopher@gmail.com'
  if (user.email !== ADMIN_EMAIL) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'coach') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // The coach_id to assign -- defaults to the calling coach's own id
  const assignedCoachId = coach_id || user.id

  // Create auth user
  const createUserRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'client' }
    })
  })

  const newUser = await createUserRes.json()
  if (!createUserRes.ok) return NextResponse.json({ error: newUser.message || 'Failed to create user' }, { status: 400 })

  const newUserId = newUser.id
  await new Promise(resolve => setTimeout(resolve, 1500))

  const clientRes = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      id: newUserId,
      coach_id: assignedCoachId,
      goal: goal || null,
      notes: notes || null,
    })
  })

  if (!clientRes.ok) {
    const err = await clientRes.text()
    return NextResponse.json({ error: 'Failed to create client: ' + err }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
