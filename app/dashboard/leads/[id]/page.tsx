import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { notFound } from 'next/navigation'
import { LeadStatusBadge, UrgencyBadge } from '@/components/leads/LeadStatusBadge'
import { CreateJobForm } from '@/components/leads/CreateJobForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Phone, Mail, MapPin, Briefcase, FileText, Timer, ExternalLink, Zap } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { enUS, de } from 'date-fns/locale'
import { Lead } from '@/lib/types'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: lead, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
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
                  <Timer className="w-3 h-3" />
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
        {lead.ai_score !== null && (
          <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100/50">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-600 p-1.5 rounded-lg">
                    <Zap className="w-4 h-4 text-white fill-white" />
                  </div>
                  <CardTitle className="text-lg">AI Insights</CardTitle>
                </div>
                <Badge variant="outline" className="bg-white/80 backdrop-blur-sm border-blue-200 text-blue-700">
                  Score: {lead.ai_score}/100
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-white/60 backdrop-blur-sm rounded-xl border border-blue-100">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Recommended Action</p>
                <p className="text-sm font-semibold text-slate-900 capitalize">{lead.ai_recommended_action?.replace(/_/g, ' ')}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Analysis Summary</p>
                <p className="text-sm text-slate-700 leading-relaxed italic">"{lead.ai_summary}"</p>
              </div>

              <div className="pt-2 border-t border-blue-100/50">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Qualification Reasoning</p>
                <div className="text-xs text-slate-600 leading-relaxed space-y-1">
                  {lead.qualification_reason}
                </div>
              </div>

              {lead.ai_matched_technician_id && (
                <div className="mt-2 p-3 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-green-800">AI Matched Technician Found</span>
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-green-700 hover:text-green-800 p-0 px-2">View</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
