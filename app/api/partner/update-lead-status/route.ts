import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { partner_lead_id, status } = await request.json()

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // 2. Fetch Partner Lead & Check Ownership
    const { data: pl } = await supabase
      .from('partner_leads')
      .select('*, profiles!id(*)')
      .eq('id', partner_lead_id)
      .single()

    if (!pl) return NextResponse.json({ error: 'Partner lead not found' }, { status: 404 })

    // 3. Verify ownership (Partner Admin or Agent of the SAME partner)
    const { data: profile } = await supabase
      .from('profiles')
      .select('partner_id, role')
      .eq('id', user.id)
      .single()

    if (profile?.partner_id !== pl.partner_id && !['admin', 'manager'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 4. Update Status
    const { data: updated, error: updateError } = await supabase
      .from('partner_leads')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', partner_lead_id)
      .select()
      .single()

    if (updateError) throw updateError

    // 5. If status is 'converted', we might want to update the master lead record as well
    if (status === 'converted') {
      await supabase
        .from('leads')
        .update({ status: 'converted', converted_at: new Date().toISOString() })
        .eq('id', pl.lead_id)
    }

    return NextResponse.json({ success: true, updated })

  } catch (error: any) {
    console.error('Update lead status error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
