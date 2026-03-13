import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { job_id, rating, text } = body
    
    if (!job_id || !rating) {
      return NextResponse.json(
        { error: 'job_id and rating are required' }, 
        { status: 400 }
      )
    }
    
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' }, 
        { status: 400 }
      )
    }
    
    const supabase = await createClient()
    
    // Update the job with review data
    const { data, error } = await supabase
      .from('jobs')
      .update({
        review_received: true,
        review_rating: rating,
        review_text: text || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', job_id)
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, job: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Get jobs with reviews
    const { data, error } = await supabase
      .from('jobs')
      .select(`
        id,
        review_rating,
        review_text,
        review_received,
        updated_at,
        lead:leads(name),
        technician:technicians(name)
      `)
      .eq('review_received', true)
      .order('updated_at', { ascending: false })
      .limit(limit)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
