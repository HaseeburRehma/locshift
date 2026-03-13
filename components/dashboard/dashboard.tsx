'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'
import { DashboardHeader } from './header'
import { StatsCards } from './stats-cards'
import { LeadsTable as NewLeadsTable } from '@/components/leads/LeadsTable'
import { CreateLeadButton } from '@/components/leads/CreateLeadButton'
import { LeadsTable as OldLeadsTable } from './leads-table'
import { JobsPanel } from './jobs-panel'
import { TechniciansPanel } from './technicians-panel'
import { ReviewsPanel } from './reviews-panel'
import { AutomationsPanel } from './automations-panel'
import { AgentActivity } from './agent-activity'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { JobsTable } from '@/components/jobs/JobsTable'
import { useUser } from '@/lib/user-context'
import type { Lead, Job, Technician } from '@/lib/types'
import { Sidebar, ViewType } from './sidebar'
import { useTranslation } from '@/lib/i18n'

const fetcher = (url: string) => fetch(url).then(res => res.json())

interface Activity {
  id: string
  type: 'qualify' | 'match' | 'message'
  description: string
  timestamp: Date
}

export function Dashboard() {
  const { permissions, isLoading: userLoading, role } = useUser()
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
        ? `Job "${job?.lead?.name}" set to "${status}"`
        : `Auftrag "${job?.lead?.name}" auf "${status}" gesetzt`
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
        ? `${templateNames[template]} sent to "${job?.lead?.name}"`
        : `${templateNames[template]} an "${job?.lead?.name}" gesendet`
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
              leads={leads} 
              jobs={jobs} 
              notificationsSentToday={messages?.filter(m => {
                if (!m.sent_at) return false
                return new Date(m.sent_at).toDateString() === new Date().toDateString()
              }).length || 0}
            />

            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Leads Overview</h3>
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
                    <CardTitle className="text-lg">Jobs Today</CardTitle>
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
                    <CardTitle className="text-lg">Recent Leads</CardTitle>
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
              <h2 className="text-2xl font-bold">Leads Management</h2>
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
          <div className="rounded-lg border border-dashed p-12 text-center h-full flex flex-col items-center justify-center bg-card">
            <h3 className="text-lg font-medium">
              {locale === 'en' ? 'Settings' : 'Einstellungen'}
            </h3>
            <p className="text-muted-foreground">
              {locale === 'en'
                ? 'Configure your fixdone.de Operations Center.'
                : 'Konfigurieren Sie Ihr fixdone.de Operations Center.'}
            </p>
          </div>
        )
      default:
        return null
    }
  }

  const viewLabels: Record<string, { title: string; subtitle: string }> = {
    dashboard: {
      title: locale === 'en' ? 'Dashboard' : 'Dashboard',
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
