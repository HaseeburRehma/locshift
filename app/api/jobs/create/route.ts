import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { notifyJobScheduled } from '@/lib/notifications'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

const createJobSchema = z.object({
  lead_id: z.string().uuid(),
  technician_id: z.string().uuid(),
  scheduled_date: z.string(), // YYYY-MM-DD
  scheduled_time: z.string().regex(/^\d{2}:\d{2}$/), // HH:MM
  estimated_duration: z.number().min(30),
  notes: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = createJobSchema.parse(body)

    // Parse Germany time to UTC
    const dateStr = `${parsed.scheduled_date}T${parsed.scheduled_time}:00`
    const scheduledTimeUtc = fromZonedTime(dateStr, 'Europe/Berlin')

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        lead_id: parsed.lead_id,
        technician_id: parsed.technician_id,
        scheduled_time: scheduledTimeUtc.toISOString(),
        estimated_duration: parsed.estimated_duration,
        notes: parsed.notes || null,
        status: 'scheduled',
      })
      .select('*, lead:leads(*), technician:technicians(*)')
      .single()

    if (jobError) throw jobError

    // Update lead status
    await supabase
      .from('leads')
      .update({ status: 'scheduled' })
      .eq('id', parsed.lead_id)

    // Trigger Notifications
    const notifications = await notifyJobScheduled({
      job, 
      lead: job.lead, 
      technician: job.technician
    })

    return NextResponse.json({ success: true, job, notifications })
  } catch (error: any) {
    console.error('Create Job Error:', error)
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 })
  }
}
