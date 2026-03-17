import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { lead_id, price, max_claims, is_exclusive } = await request.json()

    // 1. Admin/Manager Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!['admin', 'manager', 'disponent'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Fetch Lead Data for Preview
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single()

    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    // 3. Create Marketplace Listing
    const lead_preview = {
      service_type: lead.service_type,
      urgency: lead.urgency,
      city: lead.city,
      postcode: lead.postcode,
      description_preview: lead.description?.substring(0, 100) || 'Dienstleistung angefragt'
    }

    const { data: listing, error: listError } = await supabase
      .from('lead_marketplace')
      .insert({
        lead_id,
        price,
        max_claims,
        is_exclusive,
        lead_preview,
        status: 'active',
        listed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (listError) throw listError

    // 4. Update Lead record as "listed" (optional, for internal tracking)
    await supabase
      .from('leads')
      .update({ source: 'marketplace-active' })
      .eq('id', lead_id)

    return NextResponse.json({ success: true, listing })

  } catch (error: any) {
    console.error('List lead error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
