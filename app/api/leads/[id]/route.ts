import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { withTimeout } from '@/lib/supabase/with-timeout'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // Verify auth
    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      { data: { user: null }, error: null } as any
    )

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check permissions (Admin/Manager/Disponent can delete leads)
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const allowedRoles = ['admin', 'manager', 'disponent']
    
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete lead
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[Lead DELETE] Error:', err)
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
    const supabase = await createClient()

    const { error } = await supabase
      .from('leads')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
