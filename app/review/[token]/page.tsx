import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PublicReviewForm } from '@/components/reviews/PublicReviewForm'
import { CheckCircle2, Star } from 'lucide-react'

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function PublicReviewPage({ params }: PageProps) {
  const { token } = await params
  const supabase = await createClient()

  // Fetch review and associated job/technician details using the review_token
  const { data: review, error } = await supabase
    .from('reviews')
    .select(`
      id,
      rating,
      token_used_at,
      job:jobs(
        id,
        status,
        technician:technicians(name, skills),
        lead:leads(full_name, name)
      )
    `)
    .eq('review_token', token)
    .single()

  if (error || !review || !review.job) return notFound()

  // If review is already submitted (rating exists or token_used_at set)
  if (review.rating || review.token_used_at) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] p-12 text-center shadow-xl border border-border/50">
          <div className="mx-auto h-20 w-20 rounded-3xl bg-emerald-50 flex items-center justify-center mb-8">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-black text-zinc-900 mb-4">Feedback Received!</h1>
          <p className="text-zinc-500 font-medium">Thank you for sharing your experience. Your feedback helps us maintain the highest quality of service.</p>
        </div>
      </div>
    )
  }

  const job = review.job as any

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-6 py-20">
      <div className="max-w-xl w-full">
        {/* Branding/Header */}
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200">
            <Star className="h-3 w-3 fill-white" />
            Quality Assurance
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900">
            How was your visit from <span className="text-blue-600 italic font-serif">{job.technician?.name}</span>?
          </h1>
          <p className="text-zinc-500 font-medium max-w-sm mx-auto">
            Please take a moment to rate the service provided by {job.technician?.name}.
          </p>
        </div>

        <PublicReviewForm job={job} reviewId={review.id} />
        
        <p className="mt-8 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
          Powered by FixDone Trusted Service
        </p>
      </div>
    </div>
  )
}
