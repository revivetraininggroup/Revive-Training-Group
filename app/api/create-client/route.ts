import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const COACH_EMAIL = process.env.COACH_EMAIL || 'raikeschristopher@gmail.com'

export async function POST(req: Request) {
  const { email, full_name, password, goal, notes } = await req.json()

  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.email !== COACH_EMAIL) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Create auth user
  const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password: password,
    email_confirm: true,
    user_metadata: { full_name, role: 'client' }
  })

  if (createError) return NextResponse.json({ error: createError.message }, { status: 400 })

  // Wait for profile trigger to run
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Manually create profile in case trigger didn't run
  await adminSupabase.from('profiles').upsert({
    id: newUser.user.id,
    email: email,
    full_name: full_name,
    role: 'client',
  })

  // Now create client record
  const { error: clientError } = await adminSupabase.from('clients').insert({
    id: newUser.user.id,
    coach_id: user.id,
    goal: goal || null,
    notes: notes || null,
  })

  if (clientError) return NextResponse.json({ error: clientError.message }, { status: 400 })

  return NextResponse.json({ success: true })
}
