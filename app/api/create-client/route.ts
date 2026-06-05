import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  const { email, full_name, goal, notes } = await req.json()

  // Verify requester is coach
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'coach') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Use service role to create the client user
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'

  const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: false,
    user_metadata: { full_name, role: 'client' }
  })

  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })

  // Create client record
  await adminSupabase.from('clients').insert({
    id: newUser.user.id,
    coach_id: user.id,
    goal,
    notes,
  })

  // Send password reset so client can set their own password
  await adminSupabase.auth.admin.generateLink({
    type: 'recovery',
    email,
  })

  return NextResponse.json({ success: true })
}
