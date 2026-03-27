'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, ClipboardList, Calendar, Star, Zap } from 'lucide-react'
import type { Lead, Job } from '@/lib/types'
import { useTranslation } from '@/lib/i18n'

interface StatsCardsProps {
  leads: Lead[]
  jobs: Job[]
  notificationsSentToday?: number
}

export function StatsCards({ leads, jobs, notificationsSentToday = 0 }: StatsCardsProps) {
  const { locale } = useTranslation()

  // Defensive guards — API may return error objects during load failures
  const safeLeads = Array.isArray(leads) ? leads : []
  const safeJobs = Array.isArray(jobs) ? jobs : []

  const newLeads = safeLeads.filter(l => l.status === 'new').length
  const activeJobs = safeJobs.filter(j => ['pending', 'scheduled', 'confirmed', 'in_progress'].includes(j.status)).length
  const scheduledToday = safeJobs.filter(j => {
    if (!j.scheduled_time) return false
    return new Date(j.scheduled_time).toDateString() === new Date().toDateString() && j.status !== 'completed'
  }).length
  const completedWithReview = safeJobs.filter(j => j.review_received).length
  const avgRating = completedWithReview > 0
    ? safeJobs.filter(j => j.review_rating).reduce((acc, j) => acc + (j.review_rating || 0), 0) / completedWithReview
    : 0

  const stats = [
    {
      title: locale === 'en' ? 'New Leads' : 'Neue Leads',
      value: newLeads,
      icon: Users,
      description: locale === 'en' ? 'Awaiting qualification' : 'Wartend auf Qualifizierung',
      trend: newLeads > 0 ? 'action' : 'neutral',
    },
    {
      title: locale === 'en' ? 'Active Jobs' : 'Aktive Aufträge',
      value: activeJobs,
      icon: ClipboardList,
      description: locale === 'en' ? 'In progress' : 'In Bearbeitung',
      trend: 'neutral',
    },
    {
      title: locale === 'en' ? 'Scheduled Today' : 'Heute geplant',
      value: scheduledToday,
      icon: Calendar,
      description: locale === 'en' ? 'Appointments today' : 'Termine heute',
      trend: scheduledToday > 0 ? 'highlight' : 'neutral',
    },
    {
      title: locale === 'en' ? 'Alerts Sent' : 'Gesendete Alarme',
      value: notificationsSentToday,
      icon: Zap, // Using Zap for notifications/alerts
      description: locale === 'en' ? 'Sent today' : 'Heute gesendet',
      trend: notificationsSentToday > 0 ? 'success' : 'neutral',
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.trend === 'action' ? 'text-accent' :
                stat.trend === 'success' ? 'text-chart-3' :
                  stat.trend === 'highlight' ? 'text-primary' : 'text-muted-foreground'
              }`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
          {stat.trend === 'action' && <div className="absolute bottom-0 left-0 h-1 w-full bg-accent" />}
        </Card>
      ))}
    </div>
  )
}
