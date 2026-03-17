import { createClient } from '@/lib/supabase/server'
import { sendJobCompletedCustomer } from '@/lib/notifications/email'
import { sendWhatsAppJobCompleted } from '@/lib/notifications/whatsapp'
import { LeadRow, JobRow, TechnicianRow } from '@/lib/types/database.types'

export async function sendReviewRequest(params: {
  job: JobRow
  lead: LeadRow
  technician: TechnicianRow
}): Promise<{ success: boolean; reviewToken: string }> {
  const supabase = await createClient()

  // 1. Create review record
  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .insert({
      job_id: params.job.id,
      lead_id: params.lead.id,
      technician_id: params.technician.id,
      customer_name: params.lead.name,
      source: 'email'
    })
    .select('review_token')
    .single()

  if (reviewError || !review) {
    console.error('[sendReviewRequest] DB Error:', reviewError)
    throw new Error('Failed to create review record')
  }

  const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/review/${review.review_token}`

  // 2. Send notifications in parallel
  await Promise.allSettled([
    sendJobCompletedCustomer({
      to: params.lead.email ?? '',
      customerName: params.lead.name,
      jobType: params.lead.job_type ?? params.lead.service_type,
      completedAt: new Date().toLocaleDateString('de-DE'),
      technicianName: params.technician.name,
      reviewLink: reviewUrl
    }),
    sendWhatsAppJobCompleted({
      to: params.lead.phone,
      customerName: params.lead.name,
      jobType: params.lead.job_type ?? params.lead.service_type,
      reviewLink: reviewUrl
    })
  ])

  // 3. Update job status
  await supabase.from('jobs')
    .update({ 
      review_requested: true, 
      review_requested_at: new Date().toISOString() 
    })
    .eq('id', params.job.id)

  return { success: true, reviewToken: review.review_token }
}
