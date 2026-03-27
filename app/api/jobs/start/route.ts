import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { jobId } = body
    if (!jobId) throw new Error('Job ID required')

    // Fetch existing job carefully
    const { data: prevJob, error: prevErr } = await supabase
      .from('jobs')
      .select('notes')
      .eq('id', jobId)
      .single()
      
    if (prevErr) throw prevErr

    // Add start time to notes as requested
    const startedAtIso = new Date().toISOString()
    const newNotes = `STARTED_AT:${startedAtIso}|${prevJob.notes || ''}`

    const { data: job, error } = await supabase
      .from('jobs')
      .update({
        status: 'in_progress',
        notes: newNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, job })
  } catch (error: any) {
    console.error('Start Job Error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 })
  }
}
