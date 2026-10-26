// POST /api/users/create — an admin creates a member of their OWN
// organisation. The new account must change its password on first login.
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getApiCaller } from '@/lib/supabase/api-auth'
import { LOKSHIFT_ROLES } from '@/lib/rbac/roles'

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/

export async function POST(request: Request) {
  try {
    const caller = await getApiCaller()
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized: You must be logged in' }, { status: 401 })
    }
    if (caller.role !== 'admin' || !caller.organizationId) {
      return NextResponse.json({ error: 'Forbidden: Only administrators can create users' }, { status: 403 })
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim().slice(0, 200) : ''
    const role = typeof body.role === 'string' ? body.role : ''

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'Email, password, and role are required' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email) || email.length > 320) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }
    if (password.length < 8 || password.length > 72) {
      return NextResponse.json({ error: 'Password must be 8–72 characters' }, { status: 400 })
    }
    if (!(LOKSHIFT_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (authError || !authUser?.user?.id) {
      console.error('[CreateUser] createUser failed:', authError?.message)
      const exists = /already|registered|exists/i.test(authError?.message ?? '')
      return NextResponse.json(
        { error: exists ? 'A user with this email already exists' : 'Failed to create user' },
        { status: exists ? 409 : 400 },
      )
    }

    // The signup trigger creates the profile row; organisation, role and
    // the forced password change come from here (service role).
    const { error: profileError } = await admin
      .from('profiles')
      .upsert(
        {
          id: authUser.user.id,
          organization_id: caller.organizationId,
          role,
          full_name: fullName,
          email: authUser.user.email,
          must_change_password: true,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: 'id' },
      )

    if (profileError) {
      // Without organisation the account would be useless (and confusing) —
      // remove it so the admin can simply retry.
      console.error('[CreateUser] Profile setup failed, rolling back:', profileError.message)
      await admin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: 'Failed to set up the user profile' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: { id: authUser.user.id, email: authUser.user.email, role },
    })
  } catch (err: any) {
    console.error('[CreateUser] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
