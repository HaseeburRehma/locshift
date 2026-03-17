import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { qualifyLead } from '@/lib/ai/qualifyLead'
import { matchTechnician } from '@/lib/ai/matchTechnician'
import { fireAutomationRules } from '@/lib/automations/engine'
import * as z from 'zod'

const leadSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email().optional().nullable(),
  postcode: z.string().optional().nullable(),
  city: z.string().min(2),
  street: z.string().optional().nullable(),
  house_number: z.string().optional().nullable(),
  description: z.string().min(10),
  service_type: z.string().default('electrician'),
  job_type: z.string().optional().nullable(),
  urgency: z.enum(['low','medium','high','urgent']).default('medium'),
  estimated_value: z.string().optional().nullable(),
  source: z.string().default('webhook'),
  metadata: z.record(z.unknown()).optional()
})

export async function POST(request: Request) {
  try {
    const secret = request.headers.get('x-fixdone-secret')
    if (secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const result = leadSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Validation failed', details: result.error.format() }, { status: 400 })
    }

    const leadData = result.data

    // 1. Create Lead
    const { data: lead, error: leadError } = await adminClient
      .from('leads')
      .insert({
        ...leadData,
        status: 'new'
      })
      .select('*')
      .single()

    if (leadError || !lead) throw leadError

    // 2. AI Qualify
    const qualification = await qualifyLead(lead)

    // 3. Match Technician
    const { data: techs } = await adminClient.from('technicians').select('*').eq('is_active', true)
    const { data: jobCounts } = await adminClient.rpc('get_technician_job_counts')
    const countsMap = jobCounts?.reduce((acc: any, curr: any) => ({ ...acc, [curr.technician_id]: curr.count }), {}) || {}
    
    const match = await matchTechnician(lead, techs || [], countsMap)

    // 4. Update lead with AI results (LLMs sometimes return camelCase)
    const q = qualification as any
    console.log('[Webhook AI Qualify Debug] Result:', q)

    await adminClient
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
      .eq('id', lead.id)

    // 5. Fire Automations
    await fireAutomationRules('lead_created', lead.id, 'lead', { qualification })

    return NextResponse.json({ 
      success: true, 
      leadId: lead.id, 
      qualification 
    })

  } catch (error) {
    console.error('[webhooks/lead-intake] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
