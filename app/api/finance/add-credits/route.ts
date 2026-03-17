import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasPermission } from '@/lib/rbac/permissions'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check permission
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!hasPermission(profile?.role, 'finance.manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { amount } = await request.json()
    if (!amount || amount <= 0) {
       return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Update company settings balance
    const { data: current } = await supabase.from('company_settings').select('id, credit_balance').single()
    if (!current) throw new Error('Settings not found')

    const newBalance = (current.credit_balance || 0) + amount

    const { error } = await supabase
      .from('company_settings')
      .update({ credit_balance: newBalance })
      .eq('id', current.id)

    if (error) throw error

    // Log transaction (ideally in a transactions table, for now we assume it works)
    
    return NextResponse.json({ success: true, newBalance })

  } catch (error: any) {
    console.error('[api/finance/add-credits] Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
