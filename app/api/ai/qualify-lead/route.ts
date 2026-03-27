import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasPermission } from '@/lib/rbac/permissions'
import { qualifyLead } from '@/lib/ai/qualifyLead'
import { matchTechnician } from '@/lib/ai/matchTechnician'
import { fireAutomationRules } from '@/lib/automations/engine'
import { createNotification } from '@/lib/notifications/inApp'

export async function POST(request: Request) {
  try {
    const { leadId } = await request.json()
    const supabase = await createClient()

    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check permission
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!hasPermission(profile?.role, 'leads.edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 1. Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    // 2. AI Qualify
    const qualification = await qualifyLead(lead)

    // 3. Match Technician
    const { data: techs } = await supabase.from('technicians').select('*').eq('is_active', true)
    const { data: jobCounts } = await supabase.rpc('get_technician_job_counts')
    const countsMap = jobCounts?.reduce((acc: any, curr: any) => ({ ...acc, [curr.technician_id]: curr.count }), {}) || {}
    
    const match = await matchTechnician(lead, techs || [], countsMap)

    // 4. Update lead with robust mapping (LLMs sometimes return camelCase)
    const q = qualification as any
    console.log('[AI Qualify Debug] Result:', q)
    
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        ai_score: parseInt(String(q.score || 0), 10),
        ai_summary: q.ai_summary || q.aiSummary || '',
        ai_recommended_action: q.recommended_action || q.recommendedAction || 'follow_up',
        ai_processed_at: new Date().toISOString(),
        ai_model_version: 'gpt-4o',
        qualification_reason: q.qualification_reason || q.qualificationReason || '',
        ai_matched_technician_id: match[0]?.technician_id ?? null
      })
      .eq('id', leadId)

    if (updateError) throw updateError

    // 5. Fire Automations
    await fireAutomationRules('lead_created', leadId, 'lead', { qualification })

    // 6. Notify
    await createNotification({
      forRoles: ['admin', 'manager', 'dispatcher'],
      title: `Lead qualified: ${lead.name}`,
      body: `Score: ${qualification.score} — ${qualification.recommended_action}`,
      type: 'lead_qualified',
      entityType: 'lead',
      entityId: leadId,
      actionUrl: `/dashboard/leads/${leadId}`
    })

    return NextResponse.json({ success: true, qualification, match: match[0] })

  } catch (error) {
    console.error('[api/ai/qualify-lead] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
