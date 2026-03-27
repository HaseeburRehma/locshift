import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { withTimeout } from '@/lib/supabase/with-timeout'

export async function POST(request: Request) {
  try {
    const supabaseServer = await createServerClient()
    
    // getSession() reads from cookie — instant, no network round-trip
    const { data: { session } } = await supabaseServer.auth.getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized: You must be logged in' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!serviceKey || serviceKey === 'your_key_here') {
      return NextResponse.json({ error: 'Server configuration error: service key missing' }, { status: 500 })
    }

    // Initialize Admin Client (used for all privileged operations below)
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Check if requester is admin via admin client (bypasses RLS)
    const { data: callerProfile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only administrators can create users' }, { status: 403 })
    }

    const body = await request.json()
    const { email, password, fullName, role } = body

    // Server-side validation
    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 })
    }
    
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const validRoles = ['admin', 'manager', 'disponent', 'technician', 'partner_admin', 'partner_agent', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 })
    }


    // Create User in Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName || '' }
    })

    if (authError) {
      console.error('[CreateUser] Supabase admin createUser failed:', authError)
      return NextResponse.json({ 
        error: authError.message || 'Failed to create user in Supabase' 
      }, { status: 400 })
    }

    if (!authUser?.user?.id) {
      return NextResponse.json({ error: 'User created but ID is missing' }, { status: 500 })
    }

    // Update Profile with role and email
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role,
        full_name: fullName || '',
        email: authUser.user.email,
        updated_at: new Date().toISOString()
      })
      .eq('id', authUser.user.id)

    if (profileError) {
      console.error('[CreateUser] Profile update error (user was created):', profileError)
      // Don't fail — user is created, role may default to viewer until manually fixed
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        role
      }
    })

  } catch (err: any) {
    console.error('[CreateUser] Unexpected error:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
