import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasPermission } from '@/lib/rbac/permissions'
import { fireAutomationRules } from '@/lib/automations/engine'
import { createNotification } from '@/lib/notifications/inApp'
import { qualifyLead } from '@/lib/ai/qualifyLead'
import { matchTechnician } from '@/lib/ai/matchTechnician'
import * as z from 'zod'

const leadSchema = z.object({
  full_name: z.string().min(2).max(100),
  phone: z.string().min(10).regex(/^(\+49|0)\d{9,12}$/, 'Must be a valid German phone number'),
  email: z.string().email().optional().or(z.literal('')),
  street: z.string().optional(),
  house_number: z.string().optional(),
  postcode: z.string().regex(/^\d{5}$/, '5-digit postcode').optional(),
  city: z.string().min(2),
  service_type: z.enum(['electrician', 'plumber', 'hvac', 'general']),
  job_type: z.string().min(2),
  description: z.string().min(20).max(1000),
  urgency: z.enum(['urgent', 'high', 'medium', 'low']),
  estimated_value: z.string().optional(),
  source: z.string(),
  priority: z.string().optional(),
  notes: z.string().optional()
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check permission
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!hasPermission(profile?.role, 'leads.create')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { qualifyImmediately, ...leadData } = body
    const validatedData = leadSchema.parse(leadData)

    // Format phone: strip spaces, ensure +49 prefix
    let formattedPhone = validatedData.phone.replace(/\s/g, '')
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+49' + formattedPhone.substring(1)
    }

    // Insert lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        name: validatedData.full_name,
        phone: formattedPhone,
        email: validatedData.email || null,
        street: validatedData.street || null,
        house_number: validatedData.house_number || null,
        postcode: validatedData.postcode || null,
        city: validatedData.city,
        service_type: validatedData.service_type,
        job_type: validatedData.job_type,
        description: validatedData.description,
        urgency: validatedData.urgency,
        estimated_value: validatedData.estimated_value || null,
        source: validatedData.source,
        priority: validatedData.priority || null,
        internal_notes: validatedData.notes || null,
        status: 'new'
      })
      .select('*')
      .single()

    if (leadError || !lead) throw leadError

    // Fire automation
    await fireAutomationRules('lead_created', lead.id, 'lead')

    // AI Qualify if requested
    if (qualifyImmediately) {
      const qualification = await qualifyLead(lead)
      const { data: techs } = await supabase.from('technicians').select('*').eq('is_active', true)
      const { data: jobCounts } = await supabase.rpc('get_technician_job_counts')
      const countsMap = jobCounts?.reduce((acc: any, curr: any) => ({ ...acc, [curr.technician_id]: curr.count }), {}) || {}
      const match = await matchTechnician(lead, techs || [], countsMap)

      // Update lead with AI results
      const q = qualification as any
      await supabase
        .from('leads')
        .update({
          ai_score: parseInt(String(q.score || 0), 10),
          ai_summary: q.ai_summary || q.aiSummary || '',
          ai_recommended_action: q.recommended_action || q.recommendedAction || 'follow_up',
          ai_processed_at: new Date().toISOString(),
          ai_model_version: 'gpt-4o',
          qualification_reason: q.qualification_reason || q.qualificationReason || '',
          ai_matched_technician_id: match[0]?.technician_id ?? null,
          status: 'qualified'
        })
        .eq('id', lead.id)
    }

    // Notify
    await createNotification({
      forRoles: ['admin', 'manager', 'dispatcher'],
      type: 'new_lead',
      title: `New lead: ${lead.name}`,
      body: `${lead.city} — ${lead.service_type}`,
      actionUrl: `/dashboard/leads/${lead.id}`
    })

    return NextResponse.json({ success: true, lead })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.format() }, { status: 400 })
    }
    console.error('[api/leads/create] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
