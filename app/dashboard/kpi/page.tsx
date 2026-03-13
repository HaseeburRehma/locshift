import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  Briefcase,
  Wrench,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react'

interface KpiCard {
  title: string
  value: number | string
  description: string
  icon: React.ElementType
  accent: string
  bgAccent: string
}

/**
 * Dashboard overview page — fetches 4 real KPIs from Supabase server-side.
 */
export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Run all 4 count queries in parallel for performance
  const [totalLeadsRes, activeJobsRes, availableTechRes, urgentLeadsRes] = await Promise.all([
    // Total active leads (excluding lost)
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'lost'),

    // Active jobs (scheduled or in progress)
    supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .in('status', ['scheduled', 'in_progress', 'confirmed']),

    // Available and active technicians
    supabase
      .from('technicians')
      .select('id', { count: 'exact', head: true })
      .eq('is_available', true)
      .eq('is_active', true),

    // Urgent new leads requiring immediate attention
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .in('urgency', ['high', 'urgent'])
      .eq('status', 'new'),
  ])

  const kpis: KpiCard[] = [
    {
      title: 'Gesamt Leads',
      value: totalLeadsRes.count ?? 0,
      description: 'Aktive Anfragen',
      icon: Users,
      accent: 'text-blue-600',
      bgAccent: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      title: 'Aktive Aufträge',
      value: activeJobsRes.count ?? 0,
      description: 'In Bearbeitung',
      icon: Briefcase,
      accent: 'text-emerald-600',
      bgAccent: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      title: 'Verfügbare Techniker',
      value: availableTechRes.count ?? 0,
      description: 'Einsatzbereit',
      icon: Wrench,
      accent: 'text-violet-600',
      bgAccent: 'bg-violet-50 dark:bg-violet-950/30',
    },
    {
      title: 'Dringende Leads',
      value: urgentLeadsRes.count ?? 0,
      description: 'Hohe Priorität',
      icon: AlertTriangle,
      accent: 'text-amber-600',
      bgAccent: 'bg-amber-50 dark:bg-amber-950/30',
    },
  ]

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <Card key={kpi.title} className="hover:shadow-md transition-shadow duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.title}
                </CardTitle>
                <div className={`h-9 w-9 rounded-lg ${kpi.bgAccent} flex items-center justify-center`}>
                  <Icon className={`h-4.5 w-4.5 ${kpi.accent}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${kpi.accent}`}>{kpi.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{kpi.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick status strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Systemstatus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Datenbank', status: 'Verbunden', icon: CheckCircle2, color: 'text-emerald-600' },
              { label: 'KI-Agents', status: 'Aktiv', icon: Zap, color: 'text-blue-600' },
              { label: 'Nachrichten', status: 'Bereit', icon: Clock, color: 'text-violet-600' },
            ].map(({ label, status, icon: StatusIcon, color }) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={`text-sm font-medium flex items-center gap-1.5 ${color}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Schnellaktionen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <a
              href="/dashboard/leads"
              className="flex items-center gap-2 text-sm text-primary hover:underline py-1"
            >
              <Users className="h-4 w-4" />
              Leads verwalten
            </a>
            <a
              href="/dashboard/jobs"
              className="flex items-center gap-2 text-sm text-primary hover:underline py-1"
            >
              <Briefcase className="h-4 w-4" />
              Aufträge öffnen
            </a>
            <a
              href="/dashboard/technicians"
              className="flex items-center gap-2 text-sm text-primary hover:underline py-1"
            >
              <Wrench className="h-4 w-4" />
              Techniker
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
