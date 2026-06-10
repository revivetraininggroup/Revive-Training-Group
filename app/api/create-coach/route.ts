import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const ADMIN_EMAIL = process.env.COACH_EMAIL || 'raikeschristopher@gmail.com'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: Request) {
  const { email, full_name, password } = await req.json()

  // Only admin can create coaches
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

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
      user_metadata: { full_name, role: 'coach' }
    })
  })

  const newUser = await createUserRes.json()
  if (!createUserRes.ok) return NextResponse.json({ error: newUser.message || 'Failed to create coach' }, { status: 400 })

  // Wait for profile trigger
  await new Promise(resolve => setTimeout(resolve, 1500))

  // Update profile role to coach
  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${newUser.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ role: 'coach' })
  })

  if (!profileRes.ok) {
    const err = await profileRes.text()
    return NextResponse.json({ error: 'Created user but failed to set role: ' + err }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
