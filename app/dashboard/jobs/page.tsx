import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JobsTable } from '@/components/jobs/JobsTable'
import { Briefcase, ChevronRight, Plus } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { withTimeout } from '@/lib/supabase/with-timeout'

export default async function JobsPage() {
  const supabase = await createClient()
  const { data: { user } } = await withTimeout(
    supabase.auth.getUser(),
    5000,
    { data: { user: null }, error: null } as any
  )
  if (!user) redirect('/auth/login')

  const { data: jobs } = await withTimeout(
    supabase
      .from('jobs')
      .select('*, lead:leads(*), technician:technicians(*)')
      .order('created_at', { ascending: false }) as any,
    8000,
    { data: [] } as any
  )

  return (
    <div className="space-y-8 pb-10">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Service Jobs</span>
      </nav>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/50">
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
             <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <Briefcase className="h-6 w-6" />
             </div>
             Jobs
          </h1>
          <p className="text-muted-foreground font-medium">Track active assignments, schedules, and completion status.</p>
        </div>
        
        <Button className="rounded-xl font-black bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-100" asChild>
           <Link href="/dashboard/jobs/new">
              <Plus className="h-4 w-4" /> New Job
           </Link>
        </Button>
      </div>

      <div className="bg-white rounded-[2rem] border border-border/50 shadow-sm overflow-hidden p-2">
         <JobsTable jobs={jobs || []} />
      </div>
    </div>
  )
}
