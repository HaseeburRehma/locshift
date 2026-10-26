// app/dashboard/page.tsx
"use client";

import React, { useState, useEffect } from 'react'
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
  Wallet,
  Bell,
  CheckCircle2,
  MapPin,
  Navigation as NavIcon,
  ArrowRight,
  ChevronRight,
  Play
} from 'lucide-react'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useUser } from '@/lib/user-context'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'
import { ClockInOutCard } from '@/components/time/ClockInOutCard'
import { OnDutyNow } from '@/components/dashboard/OnDutyNow'
import { AttentionCards } from '@/components/dashboard/AttentionCards'
import { EmployeeWeekGlance } from '@/components/dashboard/EmployeeWeekGlance'
import { entryNetHours, localDateKey } from '@/lib/time/shift-hours'
import { formatHours, formatInstantDayMonth, formatTimeOfDay, weekdayName } from '@/lib/time/format'
import { ENTRY_STATUS_STYLE, entryStatus, entryStatusLabel } from '@/lib/times/entry-status'
import { createClient } from '@/lib/supabase/client'
import { Progress } from '@/components/ui/progress'
import LiveOperationsMap from '@/components/dashboard/LiveOperationsMap'

export default function DashboardPage() {
  const { profile, isAdmin, isDispatcher } = useUser()
  const { locale } = useTranslation()
  const { stats, loading } = useDashboardStats()

  if (!profile) return null

  if (isAdmin || isDispatcher) {
    return <AdminDashboard profile={profile} locale={locale} stats={stats} loading={loading} isDispatcher={isDispatcher && !isAdmin} />
  }

  return <EmployeeDashboard profile={profile} locale={locale} stats={stats} loading={loading} />
}

/** First name for the greeting; empty when the profile has no name yet. */
function greetingName(profile: any): string {
  const first = String(profile?.first_name ?? '').trim()
  if (first) return first
  return String(profile?.full_name ?? '').trim().split(/\s+/)[0] ?? ''
}

function AdminDashboard({ profile, locale, stats, loading, isDispatcher }: { profile: any, locale: string, stats: any, loading: boolean, isDispatcher?: boolean }) {
  const firstName = greetingName(profile)
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const hr = L('Std.', 'h')
  if (loading || !stats) {
    return (
      <div className="space-y-8 animate-pulse p-6">
        <div className="h-10 w-64 bg-slate-100 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-50 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Header Section */}
      <div className="space-y-1">
        <h1 className="text-[32px] font-bold text-[#0064E0] tracking-tight leading-none">{L('Übersicht', 'Dashboard')}</h1>
        <p className="text-slate-400 text-sm font-medium">
          {firstName
            ? L(`Willkommen zurück, ${firstName}! Hier ist Ihre heutige Übersicht.`, `Welcome back, ${firstName}! Here's your overview for today.`)
            : L('Willkommen zurück! Hier ist Ihre heutige Übersicht.', "Welcome back! Here's your overview for today.")}
        </p>
      </div>

      {/* Kundenfeedback Punkt 10 — current operations first */}
      <OnDutyNow />

      <AttentionCards />

      {/* Quick Actions */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">{L('Schnellaktionen', 'Quick Actions')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <QuickActionItem icon={<Calendar className="w-7 h-7" />} label={L('Wochenplanung', 'Weekly planning')} href="/dashboard/plans/week" color="bg-indigo-50 text-indigo-600" />
          <QuickActionItem icon={<Plus className="w-7 h-7" />} label={L('Schicht anlegen', 'Add shift')} href="/dashboard/plans/new" color="bg-purple-50 text-purple-600" />
          <QuickActionItem icon={<Clock className="w-7 h-7" />} label={L('Zeiten erfassen', 'Enter times')} href="/dashboard/times" color="bg-blue-50 text-blue-600" />
          <QuickActionItem icon={<CheckCircle2 className="w-7 h-7" />} label={L('Freigaben', 'Approvals')} href="/dashboard/times/approvals" color="bg-emerald-50 text-emerald-600" />
          <QuickActionItem icon={<ArrowUpRight className="w-7 h-7" />} label={L('Auswertungen', 'Reports')} href="/dashboard/reports" color="bg-sky-50 text-sky-600" />
        </div>
      </div>

      {/* Own time tracking (dispatchers also drive) */}
      <ClockInOutCard />

      {/* Live Operations Map */}
      <LiveOperationsMap 
        upcomingShifts={stats.upcomingShifts || []} 
        activeShifts={stats.activeShifts || []} 
        className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300"
      />

      {/* Recent Time Entries & Tables */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">{L('Aktuelle Zeiteinträge', 'Recent Time Entries')}</h3>
          <Link href="/dashboard/times" className="text-xs font-bold text-blue-600 hover:underline">{L('Alle anzeigen', 'View All')}</Link>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px] lg:min-w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-50">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{L('Datum', 'Date')}</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{L('Mitarbeiter', 'Employee')}</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{L('Kunde', 'Customer')}</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{L('Stunden', 'Hours')}</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">{L('Aktionen', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(stats.recentEntries || []).slice(0, 5).map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-4 text-[13px] font-medium text-slate-600">
                      {entry.date?.split('-').reverse().join('.')}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-slate-900">
                      {entry.employee?.full_name}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium text-slate-500">
                      {entry.customer?.name || L('—', 'N/A')}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-slate-900 tabular-nums">
                      {formatHours(entryNetHours(entry), locale === 'de' ? 'de' : 'en')} {hr}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-lg border", ENTRY_STATUS_STYLE[entryStatus(entry)])}>
                        {entryStatusLabel(entryStatus(entry), locale === 'de' ? 'de' : 'en')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/dashboard/times?entry=${entry.id}`} className="inline-flex p-2 text-slate-300 hover:text-blue-600 transition-colors hover:bg-blue-50 rounded-lg">
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {(!stats.recentEntries || stats.recentEntries.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-300 font-medium text-sm italic">
                      {L('Keine aktuellen Zeiteinträge.', 'No recent time entries found.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Upcoming Shifts */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">{L('Anstehende Schichten', 'Upcoming shifts')}</h3>
          <Link href="/dashboard/plans" className="text-xs font-bold text-blue-600 hover:underline">{L('Alle anzeigen', 'View all')}</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(stats.upcomingShifts || []).slice(0, 3).map((shift: any) => (
            <div key={shift.id} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm border-l-4 border-l-blue-600 flex flex-col gap-4">
              <div className="space-y-1">
                <p className="text-[13px] font-bold text-slate-900">
                  {`${weekdayName(localDateKey(new Date(shift.start_time)), locale === 'de' ? 'de' : 'en')} - ${formatInstantDayMonth(shift.start_time, locale === 'de' ? 'de' : 'en')}`}
                </p>
                <p className="text-[11px] font-medium text-slate-400">
                  {formatTimeOfDay(shift.start_time)} - {formatTimeOfDay(shift.end_time)}
                </p>
              </div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                {shift.customer?.name || L('Einsatzort', 'Mission site')} • {shift.location || L('Einsatzbasis', 'Ops base')}
              </div>
            </div>
          ))}
          {(!stats.upcomingShifts || stats.upcomingShifts.length === 0) && (
            <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 font-medium">
              {L('Keine anstehenden Schichten geplant.', 'No upcoming shifts scheduled.')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


function QuickActionItem({ icon, label, href, color }: { icon: React.ReactNode, label: string, href: string, color: string }) {
  return (
    <Link href={href} className="group">
      <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center gap-6 group-hover:border-blue-200 group-hover:shadow-md transition-all h-full">
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", color)}>
          {icon}
        </div>
        <span className="text-sm font-bold text-slate-900 tracking-tight">{label}</span>
      </div>
    </Link>
  )
}

function EmployeeDashboard({ profile, locale, stats, loading }: { profile: any, locale: string, stats: any, loading: boolean }) {
  const firstName = greetingName(profile)
  const L = (de: string, en: string) => (locale === 'de' ? de : en)
  const hr = L('Std.', 'h')

  if (loading || !stats) {
    return (
      <div className="space-y-8 animate-pulse p-6">
        <div className="h-10 w-64 bg-slate-100 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-50 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {/* Header Section */}
      <div className="space-y-1">
        <h1 className="text-[32px] font-bold text-[#0064E0] tracking-tight leading-none">{L('Meine Übersicht', 'Personal Dashboard')}</h1>
        <p className="text-slate-400 text-sm font-medium">
          {firstName
            ? L(`Willkommen zurück, ${firstName}! Hier ist Ihre persönliche Übersicht.`, `Welcome back, ${firstName}! Here's your personal overview.`)
            : L('Willkommen zurück! Hier ist Ihre persönliche Übersicht.', "Welcome back! Here's your personal overview.")}
        </p>
      </div>

      {/* Operations Bar (Unified Clock) */}
      <ClockInOutCard />

      {/* Kundenfeedback Punkte 9 + 14 — own shifts first */}
      <EmployeeWeekGlance />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionItem icon={<Calendar className="w-7 h-7" />} label={L('Meine Woche', 'My week')} href="/dashboard/plans/my-week" color="bg-indigo-50 text-indigo-600" />
        <QuickActionItem icon={<Clock className="w-7 h-7" />} label={L('Meine Zeiten', 'My times')} href="/dashboard/times" color="bg-blue-50 text-blue-600" />
        <QuickActionItem icon={<TrendingUp className="w-7 h-7" />} label={L('Monatsnachweis', 'Monthly statement')} href="/dashboard/times/monthly" color="bg-sky-50 text-sky-600" />
        <QuickActionItem icon={<MessageSquare className="w-7 h-7" />} label={L('Team-Chat', 'Team Chat')} href="/dashboard/chat" color="bg-cyan-50 text-cyan-600" />
      </div>

      {/* Recent Time Entries & Tables */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">{L('Letzte Schichten', 'Recent Shifts')}</h3>
          <Link href="/dashboard/times" className="text-xs font-bold text-blue-600 hover:underline">{L('Gesamte Historie anzeigen', 'View All History')}</Link>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px] lg:min-w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-50">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{L('Datum', 'Date')}</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{L('Kunde / Route', 'Customer / Route')}</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{L('Geleistete Stunden', 'Hours Worked')}</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{L('Bestätigung', 'Verification')}</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">{L('Details', 'Details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(stats.recentEntries || []).slice(0, 5).map((entry: any) => (
                  <tr key={entry.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-6 py-4 text-[13px] font-medium text-slate-600">
                      {entry.date?.split('-').reverse().join('.')}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-slate-900">
                      {entry.customer?.name || L('Standardeinsatz', 'Standard Protocol')}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-slate-900 tabular-nums">
                      {formatHours(entryNetHours(entry), locale === 'de' ? 'de' : 'en')} {hr}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-lg border", ENTRY_STATUS_STYLE[entryStatus(entry)])}>
                        {entryStatusLabel(entryStatus(entry), locale === 'de' ? 'de' : 'en')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/dashboard/times?entry=${entry.id}`} className="inline-flex p-2 text-slate-300 hover:text-blue-600 transition-colors hover:bg-blue-50 rounded-lg">
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {(!stats.recentEntries || stats.recentEntries.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-300 font-medium text-sm italic border-dashed border-2 m-4 rounded-xl">
                      {L('Keine erfassten Schichten in Ihrer Historie gefunden.', 'No recent recorded shifts found in your history.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  )
}



