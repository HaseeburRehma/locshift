import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { JobsTable } from '@/components/jobs/JobsTable'
import { Wrench } from 'lucide-react'

export default async function JobsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*, lead:leads(name, phone, city, urgency, job_type, service_type), technician:technicians(name, phone)')
    .order('scheduled_time', { ascending: true, nullsFirst: false })

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
        Failed to load jobs: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wrench className="h-6 w-6" />
          Jobs
        </h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="text-sm bg-muted px-2 py-1 rounded-full">{jobs?.length ?? 0} jobs</span>
        </div>
      </div>

      <JobsTable jobs={jobs ?? []} />
    </div>
  )
}
