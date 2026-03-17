import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReviewsPanel } from '@/components/dashboard/reviews-panel'
import { Star, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default async function AdminReviewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*, technician:technicians(name), lead:leads(name)')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 pb-20">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Reviews Moderation</span>
      </nav>

      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
           <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
              <Star className="h-6 w-6" />
           </div>
           Reviews & Reputation
        </h1>
        <p className="text-muted-foreground font-medium">Monitor customer feedback, respond to reviews, and manage your online reputation.</p>
      </div>

      <ReviewsPanel jobs={jobs || []} />
    </div>
  )
}
