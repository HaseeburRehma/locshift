import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyJobCompleted } from '@/lib/notifications'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { jobId } = body
    if (!jobId) throw new Error('Job ID required')

    const { data: job, error } = await supabase
      .from('jobs')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .select('*, lead:leads(*), technician:technicians(*)')
      .single()

    if (error) throw error

    // Also update lead status
    await supabase.from('leads').update({ status: 'completed' }).eq('id', job.lead_id)

    // Trigger Notifications
    const notifications = await notifyJobCompleted({
      job, 
      lead: job.lead, 
      technician: job.technician
    })

    return NextResponse.json({ success: true, job, notifications })
  } catch (error: any) {
    console.error('Complete Job Error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 })
  }
}
