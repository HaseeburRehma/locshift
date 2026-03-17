import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import * as z from 'zod'

const reviewSchema = z.object({
  review_id: z.string().uuid().optional(),
  job_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  comment: z.string().max(1000).optional(),
  is_public: z.boolean().default(true),
  customer_name: z.string().min(2).max(100).optional()
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const validatedData = reviewSchema.parse(body)

    // Verify job exists and is completed
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, status, lead_id, technician_id')
      .eq('id', body.job_id)
      .single()

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.status !== 'completed') {
      return NextResponse.json({ error: 'Only completed jobs can be reviewed' }, { status: 400 })
    }

    let result;

    if (body.review_id) {
      // Update existing review record
      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .update({
          rating: body.rating,
          review_text: body.comment,
          customer_name: body.customer_name || 'Anonymous',
          is_published: true,
          token_used_at: new Date().toISOString()
        })
        .eq('id', body.review_id)
        .select()
        .single()

      if (reviewError) throw reviewError
      result = review
    } else {
      // Insert new review record
      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          job_id: job.id,
          lead_id: job.lead_id,
          technician_id: job.technician_id,
          rating: body.rating,
          review_text: body.comment,
          customer_name: body.customer_name || 'Anonymous',
          is_published: true,
          source: 'manual'
        })
        .select()
        .single()

      if (reviewError) throw reviewError
      result = review
    }

    return NextResponse.json({ success: true, review: result })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.format() }, { status: 400 })
    }
    console.error('[api/reviews/submit] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
