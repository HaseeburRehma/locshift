import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { LeadStatusBadge, UrgencyBadge } from '@/components/leads/LeadStatusBadge'
import { CreateJobForm } from '@/components/leads/CreateJobForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Phone, Mail, MapPin, Briefcase, FileText, Clock, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { Lead } from '@/lib/types'

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !lead) {
    if (error?.code === 'PGRST116') return notFound() // Not found
    return (
      <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
        Failed to load lead: {error?.message || 'Unknown error'}
      </div>
    )
  }

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*, technician:technicians(*)')
    .eq('lead_id', lead.id)
    .order('created_at', { ascending: false })

  const { data: technicians } = await supabase
    .from('technicians')
    .select('*')
    .order('name')

  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('lead_id', lead.id)
    .order('created_at', { ascending: false })

  const existingJob = jobs?.[0]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      {/* LEFT COLUMN - Lead Info */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">{lead.name}</CardTitle>
                <CardDescription className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(lead.created_at), 'PPPp', { locale: enUS })}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <UrgencyBadge urgency={lead.urgency} />
                <LeadStatusBadge status={lead.status} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</div>
                <div className="font-medium">
                  <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">{lead.phone}</a>
                </div>
              </div>
              {lead.email && (
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" /> Email</div>
                  <div className="font-medium">{lead.email}</div>
                </div>
              )}
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</div>
                <div className="font-medium leading-tight">
                  {lead.street ? `${lead.street} ${lead.house_no || ''}` : ''}
                  <br />
                  <span className="text-zinc-500 font-normal">
                    {lead.postcode} {lead.city}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground flex items-center gap-1"><Briefcase className="w-3 h-3" /> Service</div>
                <div className="font-medium">
                  {lead.service_type} {lead.job_type ? `(${lead.job_type})` : ''}
                  {lead.budget && <span className="ml-2 text-primary font-bold">€{lead.budget}</span>}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground flex items-center gap-1"><FileText className="w-3 h-3" /> Project Description</div>
              <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap">{lead.description || 'No description provided.'}</div>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase">Value</div>
                <div className="font-semibold">{lead.estimated_value || '—'}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase">Source</div>
                <div className="font-semibold capitalize">{lead.source}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase">Priority</div>
                <div className="font-semibold">{lead.priority || '—'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {messages && messages.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Message History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className="text-sm bg-muted/50 p-3 rounded-md border">
                    <div className="flex justify-between mb-1">
                      <span className="font-semibold capitalize">{msg.channel} ({msg.direction})</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(msg.created_at), 'PPP', { locale: enUS })}</span>
                    </div>
                    <div className="text-muted-foreground line-clamp-2">{msg.content}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* RIGHT COLUMN - Job creation or summary */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Job Details</CardTitle>
          </CardHeader>
          <CardContent>
            {existingJob ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg border">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold">Scheduled Job</h4>
                      <p className="text-sm text-muted-foreground">ID: {existingJob.id.slice(0, 8)}</p>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 capitalize">{existingJob.status}</Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Scheduled Time:</span>
                      <span className="font-medium">{existingJob.scheduled_time ? format(new Date(existingJob.scheduled_time), 'PPPp', { locale: de }) : 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Technician:</span>
                      <span className="font-medium">{existingJob.technician?.name || 'Unassigned'}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <Button asChild className="w-full" variant="outline">
                      <Link href={`/dashboard/jobs/${existingJob.id}`}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Go to Job Details
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <CreateJobForm lead={lead} technicians={technicians || []} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
