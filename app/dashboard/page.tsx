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
  ChevronRight
} from 'lucide-react'
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
import { Progress } from '@/components/ui/progress'

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
      <div className="space-y-8 animate-pulse p-4 md:p-8">
        <div className="h-10 w-64 bg-slate-100 rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-50 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Platform Command</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 leading-none">
            Operational Overview
          </h2>
        </div>
        <div className="flex gap-3">
          <Button
            className="h-11 rounded-xl px-6 font-black uppercase text-[11px] tracking-widest shadow-md shadow-blue-100 bg-blue-600 hover:bg-blue-700 gap-2"
            onClick={() => window.location.href = '/dashboard/plans/new'}
          >
            <Plus className="w-4 h-4" />
            Create Plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Personnel" value={stats.activeEmployees?.toString() || '0'} icon={Users} color="blue" />
        <StatCard title="Open Missions" value={stats.openPlans?.toString() || '0'} icon={NavIcon} color="orange" />
        <StatCard title="Tracked Hours" value={`${stats.totalHours}h`} icon={Clock} color="emerald" />
        <StatCard title="Notifications" value={stats.unreadChats?.toString() || '0'} icon={Bell} color="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* LIVE OPERATIONS MONITOR */}
          <ActiveShiftsDashboard />

          <Card className="border-slate-200/60 rounded-2xl shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-6 pb-4 border-b border-slate-50">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center justify-between">
                Upcoming Assignments
                <Link href="/dashboard/plans" className="text-[10px] text-blue-600 hover:underline">View All</Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="divide-y divide-slate-50">
                  {(stats.upcomingShifts || []).length > 0 ? (
                    stats.upcomingShifts.map((plan: any) => (
                      <div key={plan.id} className="flex items-center justify-between p-4 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200/40">
                            {plan.employee?.avatar_url ? (
                              <img src={plan.employee.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-black text-slate-400 text-xs">{plan.employee?.full_name?.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm leading-none mb-1">{plan.employee?.full_name || 'Unassigned'}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{plan.route || 'General Mission'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-slate-900 text-sm leading-none mb-1">
                            {format(new Date(plan.start_time), 'HH:mm')}
                          </p>
                          <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0 border-none", 
                            plan.status === 'confirmed' ? "text-emerald-600 bg-emerald-50" : "text-blue-600 bg-blue-50")}>
                            {plan.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-20 text-center text-slate-300 font-bold uppercase text-[10px] tracking-[0.2em] italic">No missions found</div>
                  )}
               </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
           <Card className="border-slate-200/60 rounded-2xl shadow-sm bg-white p-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center justify-between">
                CALENDAR EVENTS
                <Calendar className="w-4 h-4" />
              </h3>
              <div className="space-y-6">
                 {(stats.upcomingEvents || []).length > 0 ? (
                   stats.upcomingEvents.map((event: any) => (
                     <div key={event.id} className="flex gap-4 group cursor-pointer">
                       <div className="w-10 h-10 rounded-xl bg-slate-50 flex flex-col items-center justify-center shrink-0 border border-slate-100">
                         <span className="text-[14px] font-black leading-none">{new Date(event.start_time).getDate()}</span>
                         <span className="text-[8px] font-black uppercase opacity-40">{format(new Date(event.start_time), 'MMM')}</span>
                       </div>
                       <div className="space-y-0.5">
                         <p className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{event.title}</p>
                         <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                           <Clock className="w-3 h-3" />
                           {format(new Date(event.start_time), 'HH:mm')}
                         </div>
                       </div>
                     </div>
                   ))
                 ) : (
                   <div className="py-6 text-center text-[10px] text-slate-300 font-black uppercase tracking-widest border border-dashed border-slate-100 rounded-xl">Clear Schedule</div>
                 )}
                 <Button variant="outline" onClick={() => window.location.href = '/dashboard/calendar'} className="w-full h-10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 border-slate-200 mt-4">
                    Open Calendar
                 </Button>
              </div>
           </Card>

           <Card className="bg-slate-900 text-white border-none rounded-2xl p-6 shadow-xl relative overflow-hidden group">
              <TrendingUp className="absolute bottom-0 right-0 w-24 h-24 text-blue-500/10 -mb-6 -mr-6 group-hover:translate-x-2 transition-transform duration-700" />
              <div className="relative z-10 space-y-4">
                 <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">ANALYTICS</h3>
                 <p className="text-xs text-slate-400 font-bold leading-relaxed">Organizational performance metrics.</p>
                 <Button variant="secondary" onClick={() => window.location.href = '/dashboard/reports'} className="w-full h-10 rounded-xl bg-white/5 text-white hover:bg-white/10 border-white/10 font-black text-[10px] uppercase tracking-widest">
                    Live Reports
                 </Button>
              </div>
           </Card>
        </div>
      </div>
    </div>
  )
}

function EmployeeDashboard({ profile, locale, stats, loading }: { profile: any, locale: string, stats: any, loading: boolean }) {
  const [notifications, setNotifications] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function fetchNotifications() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(3)
      setNotifications(data || [])
    }
    fetchNotifications()
  }, [profile.id, supabase])

  if (loading || !stats) {
    return (
      <div className="space-y-6 animate-pulse p-6 max-w-7xl mx-auto">
        <div className="h-8 w-48 bg-slate-50 rounded-lg" />
        <div className="h-20 bg-slate-50 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           <div className="lg:col-span-8 space-y-6"><div className="h-64 bg-slate-50 rounded-2xl" /></div>
           <div className="lg:col-span-4 space-y-6"><div className="h-64 bg-slate-50 rounded-2xl" /></div>
        </div>
      </div>
    )
  }

  const nextShift = stats.nextShifts?.[0]
  const weeklyProgress = (stats.weeklyHours / (stats.targetWeeklyHours || 40)) * 100

  return (
    <div className="h-full bg-slate-50/40 md:bg-transparent min-h-screen">
      <div className="max-w-7xl mx-auto md:px-8 md:py-10 pb-32 space-y-8 animate-in fade-in duration-700">
        
        {/* Welcome Section */}
        <div className="px-4 md:px-0 flex flex-col md:flex-row md:items-end justify-between gap-4">
           <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em]">MISSION DASHBOARD</span>
              <h2 className="text-3xl font-black text-slate-900 leading-none">
                {locale === 'en' ? `Welcome, ${profile.full_name?.split(' ')[0]}` : `Willkommen, ${profile.full_name?.split(' ')[0]}`}
              </h2>
           </div>
           <Badge variant="outline" className="w-fit bg-white border-slate-200 text-slate-400 font-bold text-[9px] uppercase tracking-[0.2em] px-4 py-1.5 rounded-full">
             Level 1 Specialist
           </Badge>
        </div>

        {/* OPERATIONS BAR (MINIMIZED) */}
        <div className="px-4 md:px-0">
           <ClockInOutCard />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-0">
           {/* Unified Main Console */}
           <div className="lg:col-span-8 flex flex-col gap-8">
              
              {/* Timeline/Mission Row View */}
              <div className="space-y-4">
                 <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                    <NavIcon className="w-4 h-4" /> TODAY&apos;S MISSION
                 </h3>
                 <Card className="border-slate-200/60 rounded-2xl shadow-sm bg-white overflow-hidden p-0">
                    {nextShift ? (
                       <div className="flex flex-col md:flex-row md:items-center">
                          <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-50 flex items-center gap-5">
                             <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                                <NavIcon className="w-6 h-6 text-orange-500" />
                             </div>
                             <div>
                                <h4 className="font-black text-slate-900 leading-none mb-1.5 text-lg">{nextShift.route || 'Mission Site'}</h4>
                                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                   <MapPin className="w-3.5 h-3.5" /> {nextShift.location || 'Ops Base'}
                                </div>
                             </div>
                          </div>
                          <div className="p-6 md:px-8 bg-slate-50/30 flex items-center justify-between md:justify-end gap-10">
                             <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Time Window</p>
                                <p className="text-sm font-black text-slate-900 leading-none">
                                   {format(new Date(nextShift.start_time), 'HH:mm')} - {format(new Date(nextShift.end_time), 'HH:mm')}
                                </p>
                             </div>
                             <ChevronRight className="w-5 h-5 text-slate-300" />
                          </div>
                       </div>
                    ) : (
                       <div className="py-10 text-center italic text-slate-300 font-bold uppercase text-[10px] tracking-widest">No assigned missions for today</div>
                    )}
                 </Card>
              </div>

              {/* Progress & Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* WEEKLY TRACKER */}
                 <Card className="border-slate-200/60 rounded-2xl shadow-sm bg-white p-6 space-y-5">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em]">WEEKLY PROGRESS</span>
                       <span className="text-[10px] font-black text-slate-400">{weeklyProgress.toFixed(0)}% Complete</span>
                    </div>
                    <div className="space-y-3">
                       <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-900 tabular-nums leading-none">{stats.weeklyHours.toFixed(1)}h</span>
                          <span className="text-xs font-bold text-slate-400">/ {stats.targetWeeklyHours}h Goal</span>
                       </div>
                       <Progress value={weeklyProgress} className="h-1.5 rounded-full bg-slate-100" indicatorClassName="bg-emerald-500" />
                    </div>
                 </Card>

                 {/* OPS SUMMARY (Consolidated Stats) */}
                 <div className="grid grid-cols-2 gap-4">
                    <StatCardSmall icon={<Clock className="w-4 h-4" />} label="BALANCE" value={`${stats.hoursBalance}h`} />
                    <StatCardSmall icon={<Wallet className="w-4 h-4" />} label="NET BANK" value={`${stats.monthlyPerDiem || 0}€`} color="emerald" />
                 </div>
              </div>
           </div>

           {/* Console Sidebar */}
           <div className="lg:col-span-4 space-y-6">
              {/* Event Logs View */}
              <Card className="border-slate-200/60 rounded-2xl shadow-sm bg-white p-0 overflow-hidden">
                 <div className="p-4 border-b border-slate-50 flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                       <Bell className="w-3.5 h-3.5" /> RECENT LOGS
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                 </div>
                 <div className="divide-y divide-slate-50">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div key={notif.id} className="p-4 flex gap-4 hover:bg-slate-50/50 transition-colors cursor-pointer group">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                             <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-[13px] font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{notif.title}</p>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                               {format(new Date(notif.created_at), 'MMM d, HH:mm')}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest italic">All systems clear</div>
                    )}
                 </div>
                 <div className="p-4 bg-slate-50/50 border-t border-slate-50">
                    <Button variant="ghost" className="w-full h-8 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 bg-white hover:bg-slate-100 hover:text-slate-900 border border-slate-200 rounded-xl">
                       History Center
                    </Button>
                 </div>
              </Card>

              {/* Quick Links */}
              <div className="grid grid-cols-2 gap-3">
                 <QuickLink label="Calendar" icon={Calendar} href="/dashboard/calendar" />
                 <QuickLink label="Time Cards" icon={Clock} href="/dashboard/times" />
              </div>
           </div>
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
          <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none tabular-nums">{value}</p>
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
        <p className="text-[20px] font-black text-slate-900 tracking-tighter leading-none tabular-nums mb-1">{value}</p>
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
