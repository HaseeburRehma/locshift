import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { marketplace_id } = await request.json()

    // 1. Auth & Role Check
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!['partner_admin', 'partner_agent'].includes(profile?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const partner_id = profile.partner_id
    if (!partner_id) return NextResponse.json({ error: 'Profile not linked to partner' }, { status: 400 })

    // 2. Fetch Marketplace Listing
    const { data: listing } = await supabase
      .from('lead_marketplace')
      .select('*')
      .eq('id', marketplace_id)
      .eq('status', 'active')
      .single()

    if (!listing) return NextResponse.json({ error: 'Listing not available' }, { status: 404 })

    // 3. Check for existing purchase
    const { data: existing } = await supabase
      .from('partner_leads')
      .select('id')
      .eq('partner_id', partner_id)
      .eq('lead_id', listing.lead_id)
      .single()

    if (existing) return NextResponse.json({ error: 'Lead already purchased' }, { status: 400 })

    // 4. Verify Credits (Mock check - real implementation would aggregate credits table)
    // For now we assume they have enough or we just insert and let RLS/Triggers catch it
    // In real app, start a Supabase transaction here

    // 5. Execute Purchase
    const { data: partnerLead, error: pError } = await supabase
      .from('partner_leads')
      .insert({
        partner_id,
        lead_id: listing.lead_id,
        assignment_type: 'purchased',
        status: 'accepted',
        commission_amount: listing.price,
        accepted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (pError) throw pError

    // 6. Record Transaction
    await supabase.from('partner_credits').insert({
      partner_id,
      amount: -listing.price,
      transaction_type: 'lead_purchase',
      reference_id: partnerLead.id,
      description: `Lead-Kauf: ${listing.lead_id}`
    })

    // 7. Update Listing claims
    const currentClaims = (listing.current_claims || 0) + 1
    const newStatus = currentClaims >= (listing.max_claims || 1) ? 'sold' : 'active'
    
    await supabase.from('lead_marketplace')
      .update({ current_claims: currentClaims, status: newStatus })
      .eq('id', marketplace_id)

    return NextResponse.json({ success: true, partnerLead })

  } catch (error: any) {
    console.error('Purchase lead error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
