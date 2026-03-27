import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withTimeout } from '@/lib/supabase/with-timeout'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    
    let query = supabase
      .from('jobs')
      .select(`
        id,
        status,
        scheduled_time,
        estimated_duration,
        notes,
        created_at,
        lead:leads(id, name, city, service_type),
        technician:technicians(id, name)
      `)
      .order('created_at', { ascending: false })
    
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    
    const controller = new AbortController()
    const result: any = await withTimeout(
      query as any,
      10000,
      { data: [], error: null } as any,
      controller
    )
    
    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }
    
    return NextResponse.json(result.data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    
    if (!id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }
    
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('jobs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Update lead status if job status changed
    if (updates.status) {
      const leadStatusMap: Record<string, string> = {
        'scheduled': 'scheduled',
        'confirmed': 'scheduled',
        'in_progress': 'scheduled',
        'completed': 'completed',
        'cancelled': 'cancelled'
      }
      
      if (leadStatusMap[updates.status]) {
        const { data: job } = await supabase
          .from('jobs')
          .select('lead_id')
          .eq('id', id)
          .single()
          
        if (job?.lead_id) {
          await supabase
            .from('leads')
            .update({ 
              status: leadStatusMap[updates.status],
              updated_at: new Date().toISOString()
            })
            .eq('id', job.lead_id)
        }
      }
    }
    
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('jobs')
      .insert(body)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

