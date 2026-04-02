// app/api/auth/complete-registration/route.ts
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
    const { userId, fullName, email, password } = await request.json()

    if (!userId || !password) {
      return NextResponse.json({ error: 'userId and password are required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 422 }
      )
    }

    const admin = getAdminClient()

    // 1. Set password directly via admin — skip getUserById check entirely.
    //    If userId is wrong, updateUserById returns a clear error without 404.
    const { data: updatedUser, error: pwError } = await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    })

    if (pwError) {
      console.error('[CompleteReg] updateUserById error:', pwError)

      // If user doesn't exist, try finding by email and updating that way
      if (pwError.message?.includes('not found') || pwError.status === 404) {
        const { data: listData } = await admin.auth.admin.listUsers()
        const existingUser = listData?.users?.find(u => u.email === email)

        if (existingUser) {
          // Found by email — update using this ID
          const { error: retryError } = await admin.auth.admin.updateUserById(existingUser.id, {
            password,
            email_confirm: true,
          })
          if (retryError) {
            return NextResponse.json(
              { error: 'Could not set password. Please try again.' },
              { status: 500 }
            )
          }
          // Profile upsert with the correct ID
          await admin.from('profiles').upsert(
            {
              id: existingUser.id,
              full_name: fullName || '',
              email: email || existingUser.email,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
          return NextResponse.json({ success: true, userId: existingUser.id })
        }

        return NextResponse.json(
          { error: 'Account not found. Please start registration again.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to set password. Please try again.' },
        { status: 500 }
      )
    }

    // 2. Upsert profile — admin client bypasses ALL RLS policies
    const profileId = updatedUser?.user?.id || userId
    const { error: profileError } = await admin
      .from('profiles')
      .upsert(
        {
          id: profileId,
          full_name: fullName || '',
          email: email || updatedUser?.user?.email,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      // Non-fatal — password already set, user can update profile later
      console.warn('[CompleteReg] Profile upsert warning:', profileError.message)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[CompleteReg] Unexpected error:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
