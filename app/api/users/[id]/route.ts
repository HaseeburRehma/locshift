import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!key || key === 'your_key_here') throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured')
  return createAdminClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabaseServer = await createServerClient()
    
    // 1. Verify requester is logged in via cookie
    const { data: { session } } = await supabaseServer.auth.getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Initialize Admin Client
    const adminClient = getAdminClient()

    // 3. Check if requester is Admin
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
    }

    // 4. Delete from Auth (Cascade handles profiles)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[User DELETE] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createServerClient()

    // 1. Verify permissions via cookie
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // 2. Only allow self-update or admin-update via admin client
    const adminClient = getAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (session.user.id !== id && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 3. Update profile
    const { error } = await adminClient
      .from('profiles')
      .update(body)
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[User PATCH] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
