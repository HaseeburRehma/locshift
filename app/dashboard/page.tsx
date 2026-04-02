// app/dashboard/page.tsx
"use client";

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  Calendar,
  Clock,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  Plus,
  Wallet
} from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useUser } from '@/lib/user-context'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

export default function DashboardPage() {
  const { profile, isAdmin, isDispatcher } = useUser()
  const { locale } = useTranslation()
  const { stats, loading } = useDashboardStats()

  if (!profile) return null

  if (isAdmin || isDispatcher) {
    return <AdminDashboard profile={profile} locale={locale} stats={stats} loading={loading} />
  }

  return <EmployeeDashboard profile={profile} locale={locale} stats={stats} loading={loading} />
}

function AdminDashboard({ profile, locale, stats, loading }: { profile: any, locale: string, stats: any, loading: boolean }) {
  if (loading || !stats) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-64 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-50 rounded-[2rem]" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight text-gray-900">
            {locale === 'en' ? 'Operational Overview' : 'Betriebsübersicht'}
          </h2>
          <p className="text-muted-foreground font-medium">
            {locale === 'en' ? `Welcome back, ${profile.full_name}` : `Willkommen zurück, ${profile.full_name}`}
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            className="h-12 rounded-2xl px-6 font-bold shadow-lg shadow-primary/20 gap-2"
            onClick={() => window.location.href = '/dashboard/plans/new'}
          >
            <Plus className="w-5 h-5" />
            {locale === 'en' ? 'Create Plan' : 'Plan erstellen'}
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={locale === 'en' ? 'Active Employees' : 'Aktive Mitarbeiter'}
          value={stats.activeEmployees?.toString() || '0'}
          icon={Users}
          trend="up"
        />
        <StatCard
          title={locale === 'en' ? 'Open Plans' : 'Ausstehende Pläne'}
          value={stats.openPlans?.toString() || '0'}
          icon={Calendar}
          trend="up"
          color="blue"
        />
        <StatCard
          title={locale === 'en' ? 'Total Hours' : 'Gesamtstunden'}
          value={`${stats.totalHours}h`}
          icon={Clock}
          trend="up"
          color="emerald"
        />
        <StatCard
          title={locale === 'en' ? 'Unread Notifications' : 'Ungelesene Meldungen'}
          value={stats.unreadChats?.toString() || '0'}
          icon={MessageSquare}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Assignments Table */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="border-border/50 rounded-[2.5rem] shadow-sm overflow-hidden">
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-extrabold flex items-center justify-between">
                {locale === 'en' ? 'Upcoming Shifts' : 'Kommende Schichten'}
                <Link href="/dashboard/plans">
                  <Button variant="ghost" size="sm" className="text-primary font-bold text-xs ring-offset-background">
                    {locale === 'en' ? 'View All' : 'Alle sehen'} <ArrowUpRight className="ml-1 w-3 h-3" />
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0">
              <div className="space-y-4">
                {(stats.upcomingShifts || []).length > 0 ? (
                  stats.upcomingShifts.map((plan: any) => (
                    <div key={plan.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-100 overflow-hidden">
                          {plan.employee?.avatar_url ? (
                            <img src={plan.employee.avatar_url} alt="user" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xs">
                              {plan.employee?.full_name?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{plan.employee?.full_name || 'Unassigned'}</p>
                          <p className="text-xs text-gray-500 font-medium">{plan.route || 'No route specified'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900 text-sm">
                          {new Date(plan.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(plan.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-[10px] font-black uppercase text-[#0064E0]">{plan.status}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-400 font-medium">
                    {locale === 'en' ? 'No upcoming shifts found.' : 'Keine kommenden Schichten gefunden.'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Active Staff Horizontal Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-gray-900 ml-2">
              {locale === 'en' ? 'Active Personnel' : 'Aktives Personal'}
            </h3>
            <div className="flex flex-wrap gap-4 px-2">
              {(stats.activeEmployeesList || []).map((emp: any) => (
                <div key={emp.id} className="flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
                      {emp.avatar_url ? (
                        <img src={emp.avatar_url} alt={emp.full_name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-black text-primary text-sm">{emp.full_name?.charAt(0)}</span>
                      )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-500/20" />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 truncate w-14 text-center">{emp.full_name?.split(' ')[0]}</span>
                </div>
              ))}
              <Link href="/dashboard/users" className="flex flex-col items-center gap-2 group">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center transition-colors group-hover:bg-gray-100">
                  <Plus className="w-5 h-5 text-gray-400" />
                </div>
                <span className="text-[10px] font-bold text-gray-400 text-center">Manage</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Events & Insights */}
        <div className="space-y-8">
          {/* Upcoming Events Section */}
          <Card className="border-border/50 rounded-[2.5rem] shadow-sm p-8 bg-white">
            <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center justify-between">
              {locale === 'en' ? 'Calendar Events' : 'Kalender-Events'}
              <Calendar className="w-4 h-4 text-primary" />
            </h3>
            <div className="space-y-4">
              {(stats.upcomingEvents || []).length > 0 ? (
                stats.upcomingEvents.map((event: any) => (
                  <div key={event.id} className="flex gap-4 group">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="text-[10px] font-black uppercase text-gray-400">{new Date(event.start_time).toLocaleDateString([], { month: 'short' })}</div>
                      <div className="text-xl font-black text-gray-900 leading-none">{new Date(event.start_time).getDate()}</div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-bold text-gray-800 line-clamp-1 group-hover:text-primary transition-colors cursor-pointer">{event.title}</p>
                      <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-gray-400 font-medium italic border border-dashed border-gray-100 rounded-2xl">
                  No events scheduled
                </div>
              )}
              <Button variant="ghost" className="w-full h-10 rounded-xl text-xs font-bold text-primary hover:bg-primary/5 mt-2" onClick={() => window.location.href = '/dashboard/calendar'}>
                Open Calendar
              </Button>
            </div>
          </Card>

          <Card className="bg-[#000814] text-white border-none rounded-[2.5rem] shadow-2xl p-8 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 text-primary shadow-2xl opacity-20 transform translate-x-8 -translate-y-8">
              <TrendingUp className="w-32 h-32" />
            </div>
            <div className="relative z-10 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                System Insights
              </h3>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">
                Shift utilization and performance metrics are pulled from your live organizational data.
              </p>
              <Link href="/dashboard/reports" className="block">
                <Button className="w-full h-12 rounded-2xl bg-white text-black font-bold hover:bg-gray-100">
                  Generate Full Report
                </Button>
              </Link>
            </div>
          </Card>

          <div className="p-6 bg-blue-50 rounded-[2.5rem] border border-blue-100 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-blue-500 shrink-0" />
            <div>
              <h4 className="font-bold text-blue-900 text-sm">System Status</h4>
              <p className="text-[10px] text-blue-700 font-medium">All real-time services are running normally.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmployeeDashboard({ profile, locale, stats, loading }: { profile: any, locale: string, stats: any, loading: boolean }) {
  if (loading || !stats) {
    return (
      <div className="space-y-8 animate-pulse px-4 pt-4">
        <div className="h-8 w-48 bg-gray-100 rounded-lg" />
        <div className="h-64 bg-[#0064E0]/10 rounded-[2.5rem]" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-32 bg-gray-50 rounded-[2rem]" />
          <div className="h-32 bg-gray-50 rounded-[2rem]" />
        </div>
      </div>
    )
  }

  const nextShift = stats.nextShift

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 px-4 pt-4 md:px-0 md:pt-0">
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-gray-900 leading-tight">
          {locale === 'en' ? `Good morning, ${profile.full_name?.split(' ')[0]}` : `Guten Morgen, ${profile.full_name?.split(' ')[0]}`}
        </h2>
        <p className="text-sm text-gray-500 font-bold">
          {nextShift
            ? (locale === 'en' ? `Next shift: ${new Date(nextShift.start_time).toLocaleDateString()}` : `Nächste Schicht: ${new Date(nextShift.start_time).toLocaleDateString()}`)
            : (locale === 'en' ? 'No upcoming shifts assigned.' : 'Keine kommenden Schichten zugewiesen.')
          }
        </p>
      </div>

      {/* Main Action Card */}
      <Card className="bg-[#0064E0] text-white border-none rounded-[2.5rem] shadow-xl overflow-hidden p-8">
        <div className="flex justify-between items-start mb-10">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 opacity-60">
              {nextShift ? (locale === 'en' ? "Upcoming Shift" : "Kommende Schicht") : (locale === 'en' ? "Schedule" : "Zeitplan")}
            </span>
            <h3 className="text-2xl font-black leading-tight">
              {nextShift ? (nextShift.route || nextShift.location || 'Work Shift') : (locale === 'en' ? 'No Shift Today' : 'Heute keine Schicht')}
            </h3>
          </div>
          <div className="p-3 bg-blue-500/30 rounded-2xl backdrop-blur-md">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {nextShift && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-blue-200/60">Start</span>
              <p className="text-lg font-bold">
                {new Date(nextShift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-blue-200/60">End</span>
              <p className="text-lg font-bold">
                {new Date(nextShift.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        )}

        <Link href="/dashboard/live">
          <Button className="w-full h-14 bg-white text-[#0064E0] hover:bg-gray-100 rounded-[1.25rem] font-black text-lg shadow-lg">
            {locale === 'en' ? 'Time Monitoring' : 'Zeiterfassung'}
          </Button>
        </Link>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-3">
          <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">{stats.hoursBalance > 0 ? '+' : ''}{stats.hoursBalance}h</p>
            <p className="text-[10px] font-black uppercase text-gray-400">Balance</p>
          </div>
        </div>
        <div className="p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900">{stats.monthlyPerDiem}€</p>
            <p className="text-[10px] font-black uppercase text-gray-400">Per Diem (Monthly)</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, change, icon: Icon, trend, color = "primary" }: any) {
  const colorMap: any = {
    primary: "bg-primary/10 text-primary border-primary/20",
    blue: "bg-blue-100 text-blue-600 border-blue-200",
    emerald: "bg-emerald-100 text-emerald-600 border-emerald-200",
    orange: "bg-orange-100 text-orange-600 border-orange-200"
  }

  return (
    <Card className="border-border/50 rounded-[2rem] shadow-sm hover:shadow-md transition-all">
      <CardContent className="p-3 md:p-4">
        <div className="flex items-center gap-3 mb-2 md:mb-4">
          <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0", colorMap[color])}>
            <Icon className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <p className="text-[10px] md:text-sm font-bold text-muted-foreground leading-tight">{title}</p>
        </div>
        <div className="flex items-end justify-between">
          <h4 className="text-3xl font-black text-gray-900 tracking-tighter">{value}</h4>
          {change && (
            <span className={cn(
              "text-[10px] font-black px-2 py-1 rounded-full",
              trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            )}>
              {change}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

