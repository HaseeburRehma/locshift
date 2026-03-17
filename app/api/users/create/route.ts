import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { withTimeout } from '@/lib/supabase/with-timeout'

export async function POST(request: Request) {
  try {
    const supabaseServer = await createServerClient()
    const { data: { user: requester } } = await withTimeout(
      supabaseServer.auth.getUser(),
      8000,
      { data: { user: null }, error: null } as any
    )

    if (!requester) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if requester is admin
    const profileResult: any = await withTimeout(
      supabaseServer
        .from('profiles')
        .select('role')
        .eq('id', requester.id)
        .single() as any,
      8000,
      { data: null } as any
    )

    const profile: any = profileResult?.data

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
    }

    const { email, password, fullName, role } = await request.json()

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      console.error('[CreateUser] Missing Supabase configuration:', { url: !!supabaseUrl, key: !!serviceKey })
      return NextResponse.json({ 
        error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is missing from environment.' 
      }, { status: 500 })
    }

    // Initialize Admin Client
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 1. Create User in Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // 2. Update Profile (triggers/policies might handle this, but explicit is safer)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        role,
        full_name: fullName,
        updated_at: new Date().toISOString()
      })
      .eq('id', authUser.user.id)

    if (profileError) {
      // Cleanup user if profile failed? Usually better to just report error as profiles are auto-created by triggers
      console.error('[CreateUser] Profile update error:', profileError)
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        role: role
      }
    })

  } catch (err: any) {
    console.error('[CreateUser] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
