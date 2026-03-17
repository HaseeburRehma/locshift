import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Lead, Technician, MatchResult } from '@/lib/types'

// Simulated AI matching logic - in production this would use embeddings/LLM
function matchTechnician(lead: Lead, technicians: Technician[]): MatchResult | null {
  const availableTechs = technicians.filter(t => t.is_available && t.is_active)

  if (availableTechs.length === 0) {
    return null
  }

  // Score each technician
  const scored = availableTechs.map(tech => {
    let score = 50 // Base score

    // Check service area match
    const leadPostcode = lead.postcode || ''
    const leadCity = (lead.city || '').toLowerCase()
    const getArray = (val: any) => {
      if (Array.isArray(val)) return val
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed)) return parsed
        } catch {
          return val.split(',').map(s => s.trim())
        }
      }
      return []
    }

    const techAreas = getArray(tech.service_area).map((a: string) => a.toLowerCase())

    if (techAreas.some((area: string) => area.includes(leadCity) || (leadPostcode && area.includes(leadPostcode.substring(0, 3))))) {
      score += 20
    }

    // Check skills match
    const techSkills = getArray(tech.skills).map((s: string) => s.toLowerCase())
    const jobType = (lead.job_type || '').toLowerCase()
    const description = (lead.description || '').toLowerCase()

    if (techSkills.some(s => s.includes('smart home')) && (jobType.includes('smart') || description.includes('smart'))) {
      score += 25
    }
    if (techSkills.some(s => s.includes('altbau')) && (jobType.includes('sanierung') || description.includes('altbau'))) {
      score += 25
    }
    if (techSkills.some(s => s.includes('sicherung')) && (jobType.includes('sicherung') || description.includes('sicherung'))) {
      score += 25
    }
    if (techSkills.some(s => s.includes('notdienst')) && lead.urgency === 'high') {
      score += 20
    }

    return {
      technician: tech,
      score
    }
  })

  // Sort by score and get best match
  scored.sort((a, b) => b.score - a.score)
  const best = scored[0]

  return {
    technician_id: best.technician.id,
    technician_name: best.technician.name,
    score: best.score,
    reason: `${best.technician.name} ausgewählt basierend auf Verfügbarkeit, Servicegebiet und Fähigkeiten (Score: ${best.score}).`
  } as any
}

export async function POST(request: NextRequest) {
  try {
    const { lead_id } = await request.json()

    if (!lead_id) {
      return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single()

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Fetch all technicians
    const { data: technicians, error: techError } = await supabase
      .from('technicians')
      .select('*')

    if (techError || !technicians) {
      return NextResponse.json({ error: 'Failed to fetch technicians' }, { status: 500 })
    }

    // Run matching
    const result = matchTechnician(lead as Lead, technicians as Technician[])

    if (!result) {
      return NextResponse.json({ error: 'No available technicians' }, { status: 404 })
    }

    // Create job and update lead status
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        lead_id,
        technician_id: result.technician_id,
        status: 'awaiting_approval',
        notes: result.reason,
        estimated_duration: 120 // required field
      })
      .select()
      .single()

    if (jobError) {
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
    }

    // Update lead status
    await supabase
      .from('leads')
      .update({ status: 'matched', updated_at: new Date().toISOString() })
      .eq('id', lead_id)

    return NextResponse.json({ success: true, result, job })
  } catch (error: any) {
    console.error('AI Matching Agent Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
