import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { JobStatusBadge } from '@/components/jobs/JobStatusBadge'
import { JobTimer } from '@/components/jobs/JobTimer'
import { JobStatusControl } from '@/components/jobs/JobStatusControl'
import { NotificationLog } from '@/components/notifications/NotificationLog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { User, Phone, MapPin, AlignLeft, Wrench, Clock, FileText } from 'lucide-react'

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: job, error } = await supabase
    .from('jobs')
    .select('*, lead:leads(*), technician:technicians(*)')
    .eq('id', params.id)
    .single()

  if (error || !job) {
    if (error?.code === 'PGRST116') return notFound()
    return (
      <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
        Failed to load job: {error?.message || 'Unknown error'}
      </div>
    )
  }

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('job_id', job.id)
    .order('created_at', { ascending: false })

  function extractStartedAt(notes: string | null): string | undefined {
    if (!notes) return undefined
    const match = notes.match(/^STARTED_AT:([^|]+)\|/)
    return match ? match[1] : undefined
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* LEFT - Job Info Card */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between bg-muted/30 border-b">
            <div>
              <CardTitle className="text-2xl mb-1">Job Details</CardTitle>
              <div className="text-sm text-muted-foreground flex items-center gap-1">
                ID: <span className="font-mono">{job.id.slice(0, 8)}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <JobStatusBadge status={job.status} />
              <JobTimer 
                jobId={job.id} 
                status={job.status} 
                scheduledTime={job.scheduled_time} 
                startedAt={extractStartedAt(job.notes)} 
              />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-8">
            {/* Customer Info */}
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2 mb-4">
                <User className="w-5 h-5 text-muted-foreground" />
                Customer details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Name</div>
                  <div className="font-medium">{job.lead?.name}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</div>
                  <div className="font-medium">
                    <a href={`tel:${job.lead?.phone}`} className="text-blue-600 hover:underline">{job.lead?.phone}</a>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</div>
                  <div className="font-medium">{job.lead?.postcode} {job.lead?.city}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Service</div>
                  <div className="font-medium">{job.lead?.job_type || job.lead?.service_type}</div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-muted rounded-md text-sm border flex items-start gap-2">
                <AlignLeft className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <span className="whitespace-pre-wrap">{job.lead?.description || 'No description provided.'}</span>
              </div>
            </div>

            {/* Technician Info */}
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2 mb-4">
                <Wrench className="w-5 h-5 text-muted-foreground" />
                Technician details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Assigned To</div>
                  <div className="font-medium">{job.technician?.name || <span className="text-red-500">Unassigned</span>}</div>
                </div>
                {job.technician && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</div>
                    <div className="font-medium">
                      <a href={`tel:${job.technician.phone}`} className="text-blue-600 hover:underline">{job.technician.phone}</a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Schedule & Notes */}
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2 border-b pb-2 mb-4">
                <Clock className="w-5 h-5 text-muted-foreground" />
                Schedule & Notes
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Scheduled Time</div>
                  <div className="font-medium">
                    {job.scheduled_time ? format(new Date(job.scheduled_time), 'PPPPp', { locale: de }) : 'Not scheduled'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Est. Duration</div>
                  <div className="font-medium">{job.estimated_duration} minutes</div>
                </div>
              </div>

              {job.notes && (
                <div className="p-3 bg-blue-50 text-blue-900 rounded-md text-sm border border-blue-100 flex items-start gap-2">
                  <FileText className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <span className="whitespace-pre-wrap">{job.notes.replace(/^STARTED_AT:[^|]+\|/, '')}</span>
                </div>
              )}
            </div>

            {/* Job Controls */}
            <div className="pt-4 border-t flex justify-end">
              <JobStatusControl job={job} onUpdate={() => {}} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* RIGHT - Activity Panel */}
      <div className="lg:col-span-1 flex flex-col gap-6">
        <NotificationLog messages={messages || []} />
      </div>
    </div>
  )
}
