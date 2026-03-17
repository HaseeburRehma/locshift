import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Lead, QualificationResult } from '@/lib/types'

// Simulated AI qualification logic - in production this would call an LLM
function qualifyLead(lead: Lead): any {
  const description = (lead.description || '').toLowerCase()
  
  // Detect urgency based on keywords
  let urgency: 'low' | 'medium' | 'high' = 'medium'
  if (description.includes('notfall') || description.includes('sofort') || 
      description.includes('dringend') || description.includes('verbrannt') ||
      description.includes('gefährlich') || description.includes('kein strom')) {
    urgency = 'high'
  } else if (description.includes('planen') || description.includes('irgendwann') ||
             description.includes('smart home') || description.includes('renovierung')) {
    urgency = 'low'
  }
  
  // Detect job type
  let jobType = 'Allgemein'
  if (description.includes('sicherung') || description.includes('sicherungskasten')) {
    jobType = 'Sicherungskasten'
  } else if (description.includes('smart home') || description.includes('automation')) {
    jobType = 'Smart Home'
  } else if (description.includes('steckdose') || description.includes('schalter')) {
    jobType = 'Reparatur'
  } else if (description.includes('sanierung') || description.includes('komplett') || 
             description.includes('altbau')) {
    jobType = 'Sanierung'
  } else if (description.includes('licht') || description.includes('beleuchtung')) {
    jobType = 'Beleuchtung'
  }
  
  // Estimate value based on job type
  const valueMap: Record<string, string> = {
    'Sicherungskasten': '200-500€',
    'Smart Home': '1000-5000€',
    'Reparatur': '50-200€',
    'Sanierung': '5000-15000€',
    'Beleuchtung': '100-800€',
    'Allgemein': '100-500€'
  }
  
  // Calculate priority
  const priorityScore = (urgency === 'high' ? 3 : urgency === 'medium' ? 2 : 1) +
                        (jobType === 'Sanierung' ? 3 : jobType === 'Smart Home' ? 2 : 1)
  const priority = priorityScore >= 5 ? 'A' : priorityScore >= 3 ? 'B' : 'C'
  
  return {
    is_qualified: true,
    job_type: jobType,
    urgency,
    estimated_value: valueMap[jobType],
    priority,
    reasoning: `Lead qualifiziert als ${jobType} mit ${urgency} Dringlichkeit. Geschätzter Wert: ${valueMap[jobType]}.`
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
    const { data: lead, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single()
    
    if (fetchError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    
    // Run qualification
    const result = qualifyLead(lead as Lead)
    
    // Update the lead with qualification results
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        job_type: result.job_type,
        urgency: result.urgency,
        estimated_value: result.estimated_value,
        priority: result.priority,
        status: 'qualified',
        updated_at: new Date().toISOString()
      })
      .eq('id', lead_id)
    
    if (updateError) {
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, result })
  } catch (error: any) {
    console.error('AI Qualification Agent Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
