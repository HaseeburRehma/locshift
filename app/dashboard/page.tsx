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
import { useTimeTracking } from '@/hooks/useTimeTracking'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useUser } from '@/lib/user-context'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'
import { ClockInOutCard } from '@/components/time/ClockInOutCard'
import { ActiveShiftsDashboard } from '@/components/time/ActiveShiftsDashboard'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { de as deLocale } from 'date-fns/locale'
import { Progress } from '@/components/ui/progress'
import LiveOperationsMap from '@/components/dashboard/LiveOperationsMap'

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
          {L(
            `Willkommen zurück, ${profile.full_name?.split(' ')[0]}! Hier ist Ihre heutige Übersicht.`,
            `Welcome back, ${profile.full_name?.split(' ')[0]}! Here's your overview for today.`,
          )}
        </p>
      </div>

      {/* Operations Bar (Unified Clock) */}
      <ClockInOutCard />

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatItem label={L('Aktive Mitarbeiter', 'Active Employees')} value={stats.activeEmployees || 0} />
        <StatItem label={L('Offene Einsatzpläne', 'Pending Plans')} value={stats.openPlans || 0} />
        <StatItem label={L('Stunden diese Woche', 'Hours this week')} value={`${stats.totalHours || 0}${hr}`} />
        <StatItem label={L('Heutige Schichten', "Today's shifts")} value={stats.activeShiftsCount || 0} />
      </div>

      {/* Quick Actions */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">{L('Schnellaktionen', 'Quick Actions')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickActionItem
            icon={<Clock className="w-8 h-8" />}
            label={L('Zeiteintrag hinzufügen', 'Add Time Entry')}
            href="/dashboard/times"
            color="bg-blue-50 text-blue-600"
          />
          <QuickActionItem
            icon={<Calendar className="w-8 h-8" />}
            label={L('Einsatzplan erstellen', 'Create Plan')}
            href="/dashboard/plans/new"
            color="bg-indigo-50 text-indigo-600"
          />
          <QuickActionItem
            icon={<ArrowUpRight className="w-8 h-8" />}
            label={L('Bericht erstellen', 'Generate Report')}
            href="/dashboard/reports"
            color="bg-sky-50 text-sky-600"
          />
          <QuickActionItem
            icon={<Users className="w-8 h-8" />}
            label={L('Benutzer anlegen', 'Add User')}
            href="/dashboard/users"
            color="bg-cyan-50 text-cyan-600"
          />
        </div>
      </div>

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
                      {format(new Date(entry.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-slate-900">
                      {entry.employee?.full_name}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-medium text-slate-500">
                      {entry.customer?.name || L('—', 'N/A')}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-slate-900">
                      {entry.net_hours}{hr}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-lg border-none", 
                        entry.is_verified ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                        {entry.is_verified ? L('Genehmigt', 'Approved') : L('Ausstehend', 'Pending')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors hover:bg-blue-50 rounded-lg">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {(!stats.recentEntries || stats.recentEntries.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-300 font-medium text-sm italic">
                      No recent time entries found.
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
                  {format(new Date(shift.start_time), locale === 'de' ? 'EEEE - d. MMM' : 'EEEE - MMM d', { locale: locale === 'de' ? deLocale : undefined })}
                </p>
                <p className="text-[11px] font-medium text-slate-400">
                  {format(new Date(shift.start_time), 'HH:mm')} - {format(new Date(shift.end_time), 'HH:mm')}
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

function StatItem({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="space-y-1">
        <p className="text-3xl font-bold text-blue-600 tracking-tight">{value}</p>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
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
  const { clockIn, activeEntry } = useTimeTracking()
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
          {L(
            `Willkommen zurück, ${profile.full_name?.split(' ')[0]}! Hier ist Ihre persönliche Übersicht.`,
            `Welcome back, ${profile.full_name?.split(' ')[0]}! Here's your personal overview.`,
          )}
        </p>
      </div>

      {/* Operations Bar (Unified Clock) */}
      <ClockInOutCard />

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatItem label={L('Stunden diese Woche', 'Hours this week')} value={`${stats.weeklyHours || 0}${hr}`} />
        <StatItem label={L('Saldo', 'Balance')} value={`${stats.hoursBalance || 0}${hr}`} />
        <StatItem label={L('Spesen (Monat)', 'Monthly Per Diem')} value={`${stats.monthlyPerDiem || 0}€`} />
        <StatItem label={L('Aktiver Einsatz', 'Active Mission')} value={stats.activeShiftsCount > 0 ? L('Aktiv', 'Active') : L('Keiner', 'None')} />
      </div>

      {/* Quick Actions */}
      <div className="space-y-6">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight">{L('Persönliche Werkzeuge', 'Personal Tools')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <QuickActionItem
            icon={<Clock className="w-8 h-8" />}
            label={L('Meine Zeiteinträge', 'My Time Entries')}
            href="/dashboard/times"
            color="bg-blue-50 text-blue-600"
          />
          <QuickActionItem
            icon={<Calendar className="w-8 h-8" />}
            label={L('Mein Kalender', 'My Calendar')}
            href="/dashboard/calendar"
            color="bg-indigo-50 text-indigo-600"
          />
          <QuickActionItem
            icon={<TrendingUp className="w-8 h-8" />}
            label={L('Zeitkonto', 'Time Account')}
            href="/dashboard/times"
            color="bg-sky-50 text-sky-600"
          />
          <QuickActionItem
            icon={<MessageSquare className="w-8 h-8" />}
            label={L('Team-Chat', 'Team Chat')}
            href="/dashboard/chat"
            color="bg-cyan-50 text-cyan-600"
          />
        </div>
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
                      {format(new Date(entry.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-slate-900">
                      {entry.customer?.name || L('Standardeinsatz', 'Standard Protocol')}
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-slate-900">
                      {entry.net_hours}{hr}
                    </td>
                    <td className="px-6 py-4">
                      <Badge className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-lg border-none",
                        entry.is_verified ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                        {entry.is_verified ? L('Bestätigt', 'Verified') : L('Prüfung ausstehend', 'Pending Verification')}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors hover:bg-blue-50 rounded-lg">
                        <ArrowRight className="w-4 h-4" />
                      </button>
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

      {/* Today's Confirmed Shifts */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">{L('Heutige bestätigte Schichten', "Today's Confirmed Shifts")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(stats.upcomingShifts || [])
            .filter((s: any) => {
              const today = new Date().toISOString().split('T')[0]
              return s.start_time.startsWith(today) && s.status === 'confirmed'
            })
            .map((shift: any) => (
            <div key={shift.id} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm border-l-4 border-l-emerald-500 flex flex-col gap-4 group hover:shadow-md transition-all">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-bold text-slate-900">
                    {format(new Date(shift.start_time), 'EEEE - MMM d')}
                  </p>
                  <Badge className="bg-emerald-50 text-emerald-600 border-none text-[10px] font-bold">{L('BESTÄTIGT', 'CONFIRMED')}</Badge>
                </div>
                <p className="text-[11px] font-medium text-slate-400">
                  {format(new Date(shift.start_time), 'HH:mm')} - {format(new Date(shift.end_time), 'HH:mm')}
                </p>
              </div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-2">
                <MapPin className="w-3 h-3 text-emerald-500" />
                {shift.customer?.name || L('Einsatzort', 'Mission Site')}
              </div>
              {!activeEntry && (
                <Button
                  onClick={() => clockIn(shift.id)}
                  className="mt-2 w-full h-10 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-black uppercase text-[10px] tracking-widest transition-all shadow-md active:scale-95 shrink-0"
                >
                  <Play className="w-3.5 h-3.5 mr-2 fill-current" />
                  {L('Schicht beginnen', 'Begin Shift')}
                </Button>
              )}
            </div>
          ))}
          {((stats.upcomingShifts || []).filter((s: any) => {
              const today = new Date().toISOString().split('T')[0]
              return s.start_time.startsWith(today) && s.status === 'confirmed'
            }).length === 0) && (
            <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 font-medium tracking-tight">
              {L('Keine bestätigten Schichten für heute.', 'No confirmed shifts for today.')}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Shifts */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 tracking-tight">{L('Ihre kommenden Einsätze', 'Your Upcoming Assignments')}</h3>
          <Link href="/dashboard/calendar" className="text-xs font-bold text-blue-600 hover:underline">{L('Kalender öffnen', 'View Calendar')}</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(stats.upcomingShifts || [])
            .filter((s: any) => {
              const today = new Date().toISOString().split('T')[0]
              return !(s.start_time.startsWith(today) && s.status === 'confirmed')
            })
            .slice(0, 3).map((shift: any) => (
            <div key={shift.id} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm border-l-4 border-l-blue-600 flex flex-col gap-4 group hover:shadow-md transition-all">
              <div className="space-y-1">
                <p className="text-[13px] font-bold text-slate-900">
                  {format(new Date(shift.start_time), 'EEEE - MMM d')}
                </p>
                <p className="text-[11px] font-medium text-slate-400">
                  {format(new Date(shift.start_time), 'HH:mm')} - {format(new Date(shift.end_time), 'HH:mm')}
                </p>
              </div>
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-2">
                <MapPin className="w-3 h-3 text-blue-500" />
                {shift.customer?.name || L('Einsatzort', 'Mission Site')}
              </div>
            </div>
          ))}
          {((stats.upcomingShifts || []).filter((s: any) => {
              const today = new Date().toISOString().split('T')[0]
              return !(s.start_time.startsWith(today) && s.status === 'confirmed')
            }).length === 0) && (
            <div className="col-span-full py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300 font-medium tracking-tight">
              {L('Keine weiteren kommenden Schichten für Sie.', 'No additional upcoming shifts assigned to you.')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color = "primary" }: any) {
  const themes: any = {
    primary: "text-blue-600",
    blue: "text-blue-600",
    orange: "text-orange-600",
    emerald: "text-emerald-600"
  }
  return (
    <Card className="border-slate-200/60 rounded-xl shadow-sm bg-white p-4 group hover:border-blue-200 transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-slate-100 bg-slate-50 transition-transform group-hover:scale-105", themes[color])}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">{title}</p>
          <p className="text-3xl font-serif italic tracking-tight leading-none tabular-nums text-slate-900">{value}</p>
        </div>
      </div>
    </Card>
  )
}

function StatCardSmall({ icon, label, value, color = "blue" }: any) {
  return (
    <Card className="border-slate-200/60 rounded-xl shadow-sm bg-white p-4 flex flex-col gap-3">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border border-slate-100 bg-slate-50", color === 'emerald' ? 'text-emerald-600' : 'text-blue-600')}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-serif italic text-slate-900 tracking-tight leading-none tabular-nums mb-1">{value}</p>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      </div>
    </Card>
  )
}

function QuickLink({ label, icon: Icon, href }: any) {
  return (
    <Link href={href}>
       <div className="bg-white border border-slate-200/60 rounded-xl p-3 flex flex-col items-center gap-2 hover:border-blue-400 hover:shadow-md transition-all group">
          <Icon className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-900">{label}</span>
       </div>
    </Link>
  )
}
