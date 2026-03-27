import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasPermission } from '@/lib/rbac/permissions'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check permission
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!hasPermission(profile?.role, 'technicians.delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    // Check if technician has active jobs
    const { count, error: countError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('technician_id', id)
      .in('status', ['scheduled', 'in_progress'])

    if (countError) throw countError
    if (count && count > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete technician with active jobs. Reassign or cancel jobs first.' 
      }, { status: 400 })
    }

    // Soft delete by setting is_active to false
    const { error: deleteError } = await supabase
      .from('technicians')
      .update({ is_active: false })
      .eq('id', id)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[api/technicians/delete] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()

    const { error } = await supabase
      .from('technicians')
      .update(body)
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
