import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewJobForm } from '@/components/jobs/NewJobForm'
import { Briefcase, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default async function NewJobPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="space-y-8 pb-20">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/dashboard/jobs" className="hover:text-primary transition-colors">Jobs</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">New Job</span>
      </nav>

      <div className="space-y-2">
        <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
           <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
              <Briefcase className="h-6 w-6" />
           </div>
           Schedule New Job
        </h1>
        <p className="text-muted-foreground font-medium">Connect a lead with a technician and set the service window.</p>
      </div>

      <div className="max-w-4xl">
        <NewJobForm />
      </div>
    </div>
  )
}
