import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { withTimeout } from '@/lib/supabase/with-timeout'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabaseServer = await createServerClient()
    
    // 1. Verify requester is Admin
    const { data: { user: requester } } = await withTimeout(
      supabaseServer.auth.getUser(),
      5000,
      { data: { user: null }, error: null } as any
    )

    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await withTimeout(
      supabaseServer.from('profiles').select('role').eq('id', requester.id).single() as any,
      5000,
      { data: null, error: null } as any
    )

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin only' }, { status: 403 })
    }

    // 2. Initialize Admin Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Admin configuration missing' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    // 3. Delete from Auth (Cascade should handle profiles if configured, but we check)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id)

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

    // 1. Verify permissions
    const { data: { user: requester } } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      { data: { user: null }, error: null } as any
    )

    if (!requester) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    // Only allow self-update or admin-update
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', requester.id).single()
    if (requester.id !== id && profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Update profile
    const { error } = await supabase
      .from('profiles')
      .update(body)
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
