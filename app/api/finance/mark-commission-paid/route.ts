import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasPermission } from '@/lib/rbac/permissions'

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check permission
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!hasPermission(profile?.role, 'finance.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { jobIds } = await request.json()
    if (!jobIds || !Array.isArray(jobIds)) {
       return NextResponse.json({ error: 'Invalid job IDs' }, { status: 400 })
    }

    // Update jobs mark as commission paid
    const { error } = await supabase
      .from('jobs')
      .update({ commission_paid: true })
      .in('id', jobIds)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[api/finance/mark-commission-paid] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
