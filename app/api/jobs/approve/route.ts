import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json()
    if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 })

    const supabase = await createClient()

    // Update job status to 'scheduled' (effectively approving it)
    const { error } = await supabase
      .from('jobs')
      .update({ status: 'scheduled', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
