import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { pickFields, SELF_EDITABLE_PROFILE_FIELDS } from '@/lib/supabase/api-auth'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return NextResponse.json({ user: { id: user.id, email: user.email }, profile: null })
    }

    return NextResponse.json({ user: { id: user.id, email: user.email }, profile })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    // FIX: getUser() not getSession() — works reliably in server context
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }
    // Whitelist: never spread the body (role, org, HR fields stay untouched).
    const updates = pickFields(raw, SELF_EDITABLE_PROFILE_FIELDS)
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updatable fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Could not update profile' }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}