'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { DashboardHeader } from './header'
import { StatsCards } from './stats-cards'
import { LeadsTable as NewLeadsTable } from './leads-table'
import { JobsTable } from './JobsTable'
import { CreateLeadButton } from './CreateLeadButton'
import { TechniciansPanel } from './technicians-panel'
import { ReviewsPanel } from './reviews-panel'
import { AutomationsPanel } from './automations-panel'
import { UserManagementPanel } from './user-management-panel'
import { PartnerConfigPanel } from './partner-config-panel'
import { AgentActivity } from './agent-activity'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JobsPanel } from './jobs-panel'
import { useUser } from '@/lib/user-context'
import type { Lead, Job, Technician } from '@/lib/types'
import { Sidebar, ViewType } from './sidebar'
import { useTranslation } from '@/lib/i18n'
import { Zap, TrendingUp, Users, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface Activity {
  id: string
  type: 'qualify' | 'match' | 'message'
  description: string
  timestamp: Date
}

export function Dashboard() {
  const { isLoading: userLoading, role } = useUser()
  const [activities, setActivities] = useState<Activity[]>([])
  const [activeView, setActiveView] = useState<ViewType>('dashboard')
  const { locale } = useTranslation()

  const {
    data: leads,
    error: leadsError,
    mutate: mutateLeads
  } = useSWR<Lead[]>('/api/leads', fetcher, { refreshInterval: 30000 })

  const {
    data: jobs,
    error: jobsError,
    mutate: mutateJobs
  } = useSWR<Job[]>('/api/jobs', fetcher, { refreshInterval: 30000 })

  const {
    data: technicians,
    error: techError,
    mutate: mutateTech
  } = useSWR<Technician[]>('/api/technicians', fetcher)

  const {
    data: messages,
    error: messagesError,
  } = useSWR<any[]>('/api/messages', fetcher, { refreshInterval: 60000 })

  const addActivity = useCallback((type: Activity['type'], description: string) => {
    const newActivity: Activity = {
      id: crypto.randomUUID(),
      type,
      description,
      timestamp: new Date()
    }
    setActivities(prev => [newActivity, ...prev.slice(0, 19)])
  }, [])

  const handleQualify = useCallback(async (leadId: string) => {
    const lead = leads?.find(l => l.id === leadId)
    try {
      const res = await fetch('/api/agents/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId })
      })

      if (res.ok) {
        const data = await res.json()
        const desc = locale === 'en'
          ? `Lead "${lead?.name}" qualified as ${data.result.job_type}`
          : `Lead "${lead?.name}" qualifiziert als ${data.result.job_type}`
        addActivity('qualify', desc)
        mutateLeads()
      }
    } catch (error) {
      console.error('Qualification failed:', error)
    }
  }, [leads, addActivity, mutateLeads, locale])

  const handleMatch = useCallback(async (leadId: string) => {
    const lead = leads?.find(l => l.id === leadId)
    try {
      const res = await fetch('/api/agents/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId })
      })

      if (res.ok) {
        const data = await res.json()
        const desc = locale === 'en'
          ? `"${lead?.name}" assigned to ${data.result.technician_name}`
          : `"${lead?.name}" zugewiesen an ${data.result.technician_name}`
        addActivity('match', desc)
        mutateLeads()
        mutateJobs()
      }
    } catch (error) {
      console.error('Matching failed:', error)
    }
  }, [leads, addActivity, mutateLeads, mutateJobs, locale])

  const handleUpdateJobStatus = useCallback(async (jobId: string, status: string) => {
    const job = jobs?.find(j => j.id === jobId)
    try {
      await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: jobId, status })
      })
      const desc = locale === 'en'
        ? `Job "${job?.notes || 'Unknown'}" set to "${status}"`
        : `Auftrag "${job?.notes || 'Unbekannt'}" auf "${status}" gesetzt`
      addActivity('message', desc)
      mutateJobs()
      mutateLeads()
    } catch (error) {
      console.error('Status update failed:', error)
    }
  }, [jobs, addActivity, mutateJobs, mutateLeads, locale])

  const handleSendMessage = useCallback(async (jobId: string, template: string) => {
    const job = jobs?.find(j => j.id === jobId)
    try {
      await fetch('/api/agents/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, template })
      })

      const templateNames: Record<string, string> = {
        confirmation: locale === 'en' ? 'Confirmation' : 'Bestätigung',
        reminder: locale === 'en' ? 'Reminder' : 'Erinnerung',
        review_request: locale === 'en' ? 'Review Request' : 'Bewertungsanfrage'
      }
      const desc = locale === 'en'
        ? `${templateNames[template]} sent`
        : `${templateNames[template]} gesendet`
      addActivity('message', desc)
      mutateJobs()
    } catch (error) {
      console.error('Message sending failed:', error)
    }
  }, [jobs, addActivity, mutateJobs, locale])

  const handleRefresh = useCallback(() => {
    mutateLeads()
    mutateJobs()
    mutateTech()
  }, [mutateLeads, mutateJobs, mutateTech])

  const isLoading = !leads || !jobs || !technicians || !messages || userLoading
  const hasError = leadsError || jobsError || techError || messagesError

  if (hasError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {locale === 'en' ? 'Error loading' : 'Fehler beim Laden'}
          </h2>
          <p className="text-muted-foreground">
            {locale === 'en' ? 'Please try again later.' : 'Bitte versuchen Sie es später erneut.'}
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-muted-foreground">
            {locale === 'en' ? 'Loading dashboard...' : 'Dashboard wird geladen...'}
          </p>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <StatsCards
              leads={leads || []}
              jobs={jobs || []}
              notificationsSentToday={messages?.filter(m => {
                if (!m.sent_at) return false
                return new Date(m.sent_at).toDateString() === new Date().toDateString()
              }).length || 0}
            />

            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">
                {locale === 'en' ? 'Leads Overview' : 'Anfragen-Übersicht'}
              </h3>
              <CreateLeadButton />
            </div>
            <NewLeadsTable
              leads={leads || []}
              onRefresh={handleRefresh}
            />

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                {/* Jobs Today Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {locale === 'en' ? 'Jobs Today' : 'Aufträge Heute'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <JobsTable
                      jobs={jobs?.filter(j => {
                        if (!j.scheduled_time) return false
                        const d = new Date(j.scheduled_time)
                        return d.toDateString() === new Date().toDateString()
                      }) || []}
                    />
                  </CardContent>
                </Card>

                {/* Recent Leads Section */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-lg">
                      {locale === 'en' ? 'Recent Leads' : 'Neueste Anfragen'}
                    </CardTitle>
                    <CreateLeadButton />
                  </CardHeader>
                  <CardContent>
                    <NewLeadsTable
                      leads={(leads || []).slice(0, 5)}
                      onRefresh={handleRefresh}
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="space-y-6">
                {/* AI Highlights Card */}
                {leads?.some(l => (l.ai_score ?? 0) >= 80) && (
                  <Card className="border-none shadow-md bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-blue-200 fill-blue-200" />
                        <CardTitle className="text-base font-bold">AI Priority Insights</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {leads
                        .filter(l => (l.ai_score ?? 0) >= 80)
                        .slice(0, 2)
                        .map(lead => (
                          <div key={lead.id} className="p-3 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 group cursor-pointer hover:bg-white/20 transition-colors">
                            <div className="flex justify-between items-start mb-1">
                              <p className="text-xs font-bold text-blue-100 uppercase tracking-wider">{lead.name}</p>
                              <Badge variant="outline" className="text-[10px] bg-white/10 text-white border-white/20">Score: {lead.ai_score}</Badge>
                            </div>
                            <p className="text-xs text-blue-50 line-clamp-1 italic">{lead.ai_summary}</p>
                            <div className="flex items-center gap-1 mt-2 text-[10px] text-blue-200 font-semibold group-hover:text-white transition-colors">
                              <span>Action: {lead.ai_recommended_action?.replace(/_/g, ' ')}</span>
                            </div>
                          </div>
                        ))}
                      <Button variant="ghost" size="sm" className="w-full text-xs text-blue-100 hover:text-white hover:bg-white/10 border border-white/10 h-8">
                        View all AI insights
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <TechniciansPanel
                  technicians={technicians || []}
                  jobs={jobs || []}
                  onRefresh={handleRefresh}
                />
                <AgentActivity activities={activities} />
              </div>
            </div>
          </div>
        )
      case 'leads':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">
                {locale === 'en' ? 'Leads Management' : 'Lead-Management'}
              </h2>
              <CreateLeadButton />
            </div>
            <NewLeadsTable
              leads={leads || []}
              onRefresh={handleRefresh}
            />
          </div>
        )
      case 'jobs':
        return (
          <JobsPanel
            jobs={jobs || []}
            onUpdateStatus={handleUpdateJobStatus}
            onSendMessage={handleSendMessage}
            onRefresh={handleRefresh}
            canManageJobs={true}
          />
        )
      case 'technicians':
        return (
          <TechniciansPanel
            technicians={technicians || []}
            jobs={jobs || []}
            onRefresh={handleRefresh}
          />
        )
      case 'reviews':
        return <ReviewsPanel jobs={jobs || []} />
      case 'automations':
        return <AutomationsPanel />
      case 'settings':
        return (
          <div className="space-y-6">
            <UserManagementPanel />
            <PartnerConfigPanel />
            <div className="rounded-lg border border-dashed p-12 text-center flex flex-col items-center justify-center bg-card">
              <h3 className="text-lg font-medium">
                {locale === 'en' ? 'More Settings' : 'Weitere Einstellungen'}
              </h3>
              <p className="text-muted-foreground">
                {locale === 'en'
                  ? 'Configure remaining fixdone.de Operations Center parameters.'
                  : 'Konfigurieren Sie weitere Parameter Ihres fixdone.de Operations Center.'}
              </p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const viewLabels: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: locale === 'en' ? 'Dashboard' : 'Übersicht',
      subtitle: locale === 'en' ? 'Overview of your operations' : 'Gesamtübersicht Ihres Betriebs'
    },
    leads: {
      title: locale === 'en' ? 'Leads' : 'Leads',
      subtitle: locale === 'en' ? 'Manage incoming enquiries' : 'Verwalten Sie Ihre Leads'
    },
    jobs: {
      title: locale === 'en' ? 'Jobs' : 'Aufträge',
      subtitle: locale === 'en' ? 'Active service assignments' : 'Verwalten Sie Ihre Aufträge'
    },
    technicians: {
      title: locale === 'en' ? 'Technicians' : 'Techniker',
      subtitle: locale === 'en' ? 'Team and availability' : 'Verwalten Sie Ihr Team'
    },
    reviews: {
      title: locale === 'en' ? 'Reviews' : 'Bewertungen',
      subtitle: locale === 'en' ? 'Customer feedback' : 'Kundenfeedback einsehen'
    },
    automations: {
      title: locale === 'en' ? 'Automations' : 'Automatisierung',
      subtitle: locale === 'en' ? 'AI agents and workflows' : 'Automatisierte Prozesse'
    },
    settings: {
      title: locale === 'en' ? 'Settings' : 'Einstellungen',
      subtitle: locale === 'en' ? 'System configuration' : 'System-Konfiguration'
    },
  }

  const currentViewLabel = viewLabels[activeView] || { title: activeView, subtitle: '' }

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardHeader />

        <main className="flex-1 overflow-y-auto px-8 py-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-foreground">{currentViewLabel.title}</h2>
              <p className="text-muted-foreground mt-1">
                {currentViewLabel.subtitle}
              </p>
            </div>
          </div>

          <div className="max-w-[1600px] mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  )
}
