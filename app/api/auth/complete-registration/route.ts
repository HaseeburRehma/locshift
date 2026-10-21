// app/api/auth/complete-registration/route.ts
//
// Final step of the e-mail OTP registration: sets the password and the
// display name for the user who just verified the code.
//
// SECURITY: the caller must present the access token of the verified OTP
// session (Authorization: Bearer <token>). The user is taken from that
// token only — never from the request body — so nobody can set the
// password of another account (previously userId/email in the body were
// trusted, which allowed account takeover).

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { fullName, password } = await request.json()
    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 422 })
    }

    const admin = getAdminClient()

    // Verify the token with the auth server and take the user from it.
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    const user = userData?.user
    if (userError || !user) {
      return NextResponse.json({ error: 'Session expired. Please verify your e-mail again.' }, { status: 401 })
    }

    const { error: pwError } = await admin.auth.admin.updateUserById(user.id, { password })
    if (pwError) {
      console.error('[CompleteReg] updateUserById error:', pwError.message)
      return NextResponse.json({ error: 'Failed to set password. Please try again.' }, { status: 500 })
    }

    // Only name/e-mail of the verified user — never role or organisation.
    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: user.id,
        full_name: typeof fullName === 'string' ? fullName.trim().slice(0, 200) : '',
        email: user.email,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    if (profileError) {
      // Non-fatal — password already set, user can update profile later
      console.warn('[CompleteReg] Profile upsert warning:', profileError.message)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[CompleteReg] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
