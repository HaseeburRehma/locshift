"use client";

import { StatsCards } from '@/components/dashboard/stats-cards'
import { LeadsTable } from '@/components/leads/LeadsTable'
import { JobsTable } from '@/components/jobs/JobsTable'
import { CreateLeadButton } from '@/components/leads/CreateLeadButton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Zap, TrendingUp, Users, MessageSquare } from 'lucide-react'
import useSWR from 'swr'
import { useUser } from '@/lib/user-context'
import { Lead, Job, Technician } from '@/lib/types'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function DashboardOverview() {
  const { user, profile, isLoading: userLoading } = useUser()

  const { data: leadsData } = useSWR<any>('/api/leads', fetcher)
  const { data: jobsData } = useSWR<any>('/api/jobs', fetcher)
  const { data: techniciansData } = useSWR<any>('/api/technicians', fetcher)
  const { data: messagesData } = useSWR<any>('/api/messages', fetcher)

  const leads = Array.isArray(leadsData) ? leadsData : []
  const jobs = Array.isArray(jobsData) ? jobsData : []
  const technicians = Array.isArray(techniciansData) ? techniciansData : []
  const messages = Array.isArray(messagesData) ? messagesData : []

  const isDataLoading = !leadsData || !jobsData || !techniciansData || !messagesData
  const isLoading = isDataLoading || userLoading

  if (isLoading) {
    return (
      <div className="space-y-8 h-[60vh] flex flex-col items-center justify-center">
         <Spinner className="h-8 w-8 text-primary" />
         <p className="text-muted-foreground font-medium">Compiling operational data...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight">Welcome back, {profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}!</h2>
          <p className="text-muted-foreground font-medium">Here's what's happening in your service network today.</p>
        </div>
        <CreateLeadButton />
      </div>

      <StatsCards 
        leads={leads} 
        jobs={jobs} 
        notificationsSentToday={messages.filter(m => {
          if (!m.sent_at) return false
          return new Date(m.sent_at).toDateString() === new Date().toDateString()
        }).length}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <Card className="border-border/50 rounded-[2.5rem] shadow-sm overflow-hidden">
            <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-xl font-bold">Priority Leads</CardTitle>
                <p className="text-xs text-muted-foreground font-medium">Newest service inquiries requiring action.</p>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <LeadsTable leads={leads.slice(0, 5)} />
            </CardContent>
          </Card>

          <Card className="border-border/50 rounded-[2.5rem] shadow-sm overflow-hidden">
             <CardHeader className="p-8 pb-4">
                <CardTitle className="text-xl font-bold">Active Jobs</CardTitle>
                <p className="text-xs text-muted-foreground font-medium">Real-time status of scheduled assignments.</p>
             </CardHeader>
             <CardContent className="p-2">
                <JobsTable jobs={jobs.filter(j => j.status === 'scheduled').slice(0, 5)} />
             </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* AI Insights Card */}
          <Card className="border-none shadow-2xl bg-zinc-900 text-white rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
                   <Zap className="w-4 h-4 text-zinc-900" />
                </div>
                <CardTitle className="text-lg font-bold">AI Priority Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              {leads.filter(l => (l as any).ai_score >= 80).slice(0, 2).map(lead => (
                <div key={lead.id} className="p-5 bg-zinc-800 rounded-3xl border border-zinc-700 space-y-2">
                   <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{lead.name}</span>
                     <span className="text-[10px] font-black bg-primary text-zinc-900 px-2 py-0.5 rounded-full">Score: {(lead as any).ai_score}</span>
                   </div>
                   <p className="text-xs font-medium italic text-zinc-200 line-clamp-2">"{(lead as any).ai_summary}"</p>
                </div>
              ))}
              <Button variant="outline" className="w-full h-10 rounded-2xl border-zinc-700 bg-transparent text-white hover:bg-zinc-800 transition-all font-bold text-xs">
                 View All Insights
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
             <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex flex-col gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-black text-blue-900">94%</span>
                <span className="text-[10px] font-black uppercase text-blue-500">Matching</span>
             </div>
             <div className="p-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 flex flex-col gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
                <span className="text-2xl font-black text-emerald-900">42m</span>
                <span className="text-[10px] font-black uppercase text-emerald-500">Response</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
